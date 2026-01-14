<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

/**
 * Customer Controller
 * 
 * Manages customer database and profiles
 */
class CustomerController extends Controller
{
    public function index(Request $request)
    {
        try {
            $user = auth()->user();
            $perPage = $request->input('limit', 20);
            
            $query = DB::table('customers as c');

            // --- Logic Ownership: Staff only sees customers they have served ---
            if ($user->role === 'staff') {
                $query->whereExists(function ($q) use ($user) {
                    $q->select(DB::raw(1))
                      ->from('orders')
                      ->whereColumn('orders.customer_id', 'c.id')
                      ->where('orders.assigned_staff_id', $user->id);
                });
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('c.full_name', 'LIKE', "%{$search}%")
                      ->orWhere('c.email', 'LIKE', "%{$search}%")
                      ->orWhere('c.phone', 'LIKE', "%{$search}%");
                });
            }

            $customers = $query->orderBy('c.created_at', 'desc')->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $customers->items(),
                'pagination' => [
                    'page' => $customers->currentPage(),
                    'limit' => $customers->perPage(),
                    'total' => $customers->total(),
                    'pages' => $customers->lastPage()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Server error'
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|unique:customers',
            'full_name' => 'required|string|max:100',
            'phone' => 'required|string|max:20',
            'address' => 'required|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $customerId = DB::table('customers')->insertGetId([
                'email' => $request->email,
                'full_name' => $request->full_name,
                'phone' => $request->phone,
                'address' => $request->address,
                'city' => $request->input('city'),
                'state' => $request->input('state'),
                'customer_type' => 'retail',
                'created_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Customer registered successfully',
                'customerId' => $customerId
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Server error',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $user = auth()->user();
            $query = DB::table('customers')->where('id', $id);

            // Access Control for Staff
            if ($user->role === 'staff') {
                $hasServed = DB::table('orders')
                    ->where('customer_id', $id)
                    ->where('assigned_staff_id', $user->id)
                    ->exists();

                if (!$hasServed) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Access denied. You have not served this customer.'
                    ], 403);
                }
            }

            $customer = $query->first();

            if (!$customer) {
                return response()->json([
                    'success' => false,
                    'message' => 'Customer not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $customer
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Server error'
            ], 500);
        }
    }
}
