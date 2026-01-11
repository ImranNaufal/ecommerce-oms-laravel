<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Commission Controller
 * 
 * Manages commission tracking and approval workflow:
 * - Pending: Auto-created when order is made
 * - Approved: Auto-approved when payment confirmed, or manual by admin
 * - Paid: Marked by admin after bank transfer completed
 */
class CommissionController extends Controller
{
    /**
     * Get Commission Summary for Current User
     * 
     * Admin sees ALL commissions (company-wide)
     * Staff/Affiliate see only their own
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function summary(Request $request)
    {
        try {
            $user = auth()->user();
            $isAdmin = $user->role === 'admin';

            // Get commissions by status (Admin sees all, others see own)
            $summaryQuery = DB::table('commission_transactions')
                ->select('status', DB::raw('COUNT(*) as count'), DB::raw('SUM(amount) as total_amount'))
                ->groupBy('status');

            if (!$isAdmin) {
                $summaryQuery->where('user_id', $user->id);
            }

            $summary = $summaryQuery->get();

            // Get monthly earnings (last 6 months)
            $monthlyQuery = DB::table('commission_transactions')
                ->select(
                    DB::raw("DATE_FORMAT(created_at, '%Y-%m') as month"),
                    DB::raw('SUM(amount) as total_amount'),
                    DB::raw('COUNT(*) as count')
                )
                ->where('created_at', '>=', now()->subMonths(6))
                ->groupBy(DB::raw("DATE_FORMAT(created_at, '%Y-%m')"))
                ->orderBy('month', 'desc');

            if (!$isAdmin) {
                $monthlyQuery->where('user_id', $user->id);
            }

            $monthly = $monthlyQuery->get();

            // Get commission config (admin doesn't have config)
            $config = null;
            if (!$isAdmin) {
                $config = DB::table('commission_configs')
                    ->where('user_id', $user->id)
                    ->where('is_active', true)
                    ->first();
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'summary' => $summary,
                    'monthly' => $monthly,
                    'config' => $config
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Server error'
            ], 500);
        }
    }

    /**
     * Get Commission Transactions (with filters)
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function transactions(Request $request)
    {
        try {
            $user = auth()->user();
            $perPage = $request->input('limit', 20);

            $query = DB::table('commission_transactions as ct')
                ->leftJoin('orders as o', 'ct.order_id', '=', 'o.id')
                ->select('ct.*', 'o.order_number', 'o.status as order_status');

            // Admin can see all transactions
            if ($user->role !== 'admin') {
                $query->where('ct.user_id', $user->id);
            } else {
                // Add user name for admin view
                $query->leftJoin('users as u', 'ct.user_id', '=', 'u.id')
                      ->addSelect('u.full_name as user_name');
            }

            // Filters
            if ($request->has('status')) {
                $query->where('ct.status', $request->status);
            }

            if ($request->has('date_from')) {
                $query->whereDate('ct.created_at', '>=', $request->date_from);
            }

            if ($request->has('date_to')) {
                $query->whereDate('ct.created_at', '<=', $request->date_to);
            }

            $transactions = $query->orderBy('ct.created_at', 'desc')->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $transactions->items(),
                'pagination' => [
                    'page' => $transactions->currentPage(),
                    'limit' => $transactions->perPage(),
                    'total' => $transactions->total(),
                    'pages' => $transactions->lastPage()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Server error'
            ], 500);
        }
    }

    /**
     * Get Commission Leaderboard
     * 
     * Ranks staff and affiliates by total commission earned
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function leaderboard(Request $request)
    {
        try {
            $period = $request->input('period', 'month');

            // Build date filter based on period
            $dateFilter = "DATE_FORMAT(ct.created_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')";
            if ($period === 'year') {
                $dateFilter = 'YEAR(ct.created_at) = YEAR(NOW())';
            } elseif ($period === 'all') {
                $dateFilter = '1=1';
            }

            $leaderboard = DB::table('users as u')
                ->leftJoin('commission_transactions as ct', function($join) use ($dateFilter) {
                    $join->on('u.id', '=', 'ct.user_id')
                         ->whereRaw($dateFilter);
                })
                ->leftJoin('commission_configs as cc', function($join) {
                    $join->on('u.id', '=', 'cc.user_id')
                         ->where('cc.is_active', true);
                })
                ->select(
                    'u.id',
                    'u.full_name',
                    'u.email',
                    DB::raw('COUNT(ct.id) as total_orders'),
                    DB::raw('SUM(ct.amount) as total_commission'),
                    'cc.tier'
                )
                ->whereIn('u.role', ['staff', 'affiliate'])
                ->where('u.status', 'active')
                ->groupBy('u.id', 'u.full_name', 'u.email', 'cc.tier')
                ->orderBy('total_commission', 'desc')
                ->limit(20)
                ->get();

            return response()->json([
                'success' => true,
                'data' => $leaderboard
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Server error'
            ], 500);
        }
    }

    /**
     * Approve Commission (Admin Only)
     * 
     * Changes status from 'pending' to 'approved'
     * Records who approved and when
     * 
     * @param int $id
     * @return JsonResponse
     */
    public function approve($id)
    {
        // Only Admin can approve commissions
        if (auth()->user()->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Only admins can approve commissions.'
            ], 403);
        }

        try {
            $user = auth()->user();

            DB::table('commission_transactions')
                ->where('id', $id)
                ->update([
                    'status' => 'approved',
                    'approved_by' => $user->id,
                    'approved_at' => now()
                ]);

            // Create notification for Admin/Finance reminder
            $transaction = DB::table('commission_transactions')->where('id', $id)->first();
            \App\Models\Notification::create([
                'user_id' => $user->id,
                'title' => 'Payout Reminder',
                'message' => "Commission for Order #{$id} has been approved. RM" . number_format($transaction->amount, 2) . " is ready for payment.",
                'type' => 'warning',
                'is_read' => false,
                'action_url' => '/commissions'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Commission approved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Server error'
            ], 500);
        }
    }

    /**
     * Mark Commission as Paid (Admin Only)
     * 
     * Final step after Finance department transfers money
     * Changes status from 'approved' to 'paid'
     * 
     * @param int $id
     * @return JsonResponse
     */
    public function markPaid($id)
    {
        // Only Admin can mark commissions as paid
        if (auth()->user()->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Only admins can mark commissions as paid.'
            ], 403);
        }

        try {
            $user = auth()->user();

            DB::table('commission_transactions')
                ->where('id', $id)
                ->update([
                    'status' => 'paid',
                    'paid_by' => $user->id,
                    'paid_at' => now()
                ]);

            return response()->json([
                'success' => true,
                'message' => 'Commission marked as paid'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Server error'
            ], 500);
        }
    }
}
