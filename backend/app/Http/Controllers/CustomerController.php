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
            $perPage = $request->input('limit', 20);
            
            $query = DB::table('customers');

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('full_name', 'LIKE', "%{$search}%")
                      ->orWhere('email', 'LIKE', "%{$search}%")
                      ->orWhere('phone', 'LIKE', "%{$search}%");
                });
            }

            $customers = $query->orderBy('created_at', 'desc')->paginate($perPage);

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
            $customer = DB::table('customers')->where('id', $id)->first();

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
