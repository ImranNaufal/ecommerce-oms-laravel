<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Dashboard Controller
 * 
 * Provides real-time statistics and analytics
 * Data is role-specific (Admin sees all, Staff sees assigned, Affiliate sees referred)
 */
class DashboardController extends Controller
{
    /**
     * Get Dashboard Statistics
     * 
     * Returns KPIs based on user role:
     * - Admin: Company-wide metrics
     * - Staff: Personal performance
     * - Affiliate: Referral statistics
     * 
     * Optimized query: Single query for multiple metrics
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function stats(Request $request)
    {
        try {
            $user = auth()->user();
            $period = $request->input('period', 30); // days

            // Order statistics (role-based)
            $orderQuery = DB::table('orders');

            if ($user->role === 'staff') {
                $orderQuery->where('assigned_staff_id', $user->id);
            } elseif ($user->role === 'affiliate') {
                $orderQuery->where('affiliate_id', $user->id);
            }

            $orderStats = $orderQuery->selectRaw('
                COUNT(*) as total_orders,
                SUM(CASE WHEN status = "delivered" THEN 1 ELSE 0 END) as delivered_orders,
                SUM(CASE WHEN status = "pending" THEN 1 ELSE 0 END) as pending_orders,
                SUM(CASE WHEN payment_status = "paid" THEN total ELSE 0 END) as total_revenue,
                SUM(CASE WHEN DATE(created_at) >= DATE_SUB(NOW(), INTERVAL ? DAY) THEN 1 ELSE 0 END) as recent_orders,
                AVG(CASE WHEN payment_status = "paid" THEN total END) as avg_order_value,
                SUM(CASE WHEN DATE(created_at) >= DATE_SUB(NOW(), INTERVAL ? DAY) AND payment_status = "paid" THEN total ELSE 0 END) as recent_revenue
            ', [$period, $period])->first();

            // Calculate total profit (Admin only)
            if ($user->role === 'admin') {
                $profitStats = DB::table('order_items as oi')
                    ->join('orders as o', 'oi.order_id', '=', 'o.id')
                    ->where('o.payment_status', 'paid')
                    ->selectRaw('
                        SUM(oi.profit) as total_profit,
                        SUM(oi.subtotal) as total_sales
                    ')
                    ->first();

                $profitMargin = $profitStats->total_sales > 0
                    ? round(($profitStats->total_profit / $profitStats->total_sales) * 100, 1)
                    : 0;

                $orderStats->total_profit = $profitStats->total_profit ?? 0;
                $orderStats->profit_margin = $profitMargin;
            }

            // Commission statistics
            $commissionQuery = DB::table('commission_transactions');

            if ($user->role !== 'admin') {
                $commissionQuery->where('user_id', $user->id);
            }

            $commissionStats = $commissionQuery->selectRaw('
                SUM(CASE WHEN status = "pending" THEN amount ELSE 0 END) as pending_commissions,
                SUM(CASE WHEN status = "approved" THEN amount ELSE 0 END) as approved_commissions,
                SUM(CASE WHEN status = "paid" THEN amount ELSE 0 END) as paid_commissions
            ')->first();

            // Product statistics (Admin/Staff only)
            $productStats = null;
            if (in_array($user->role, ['admin', 'staff'])) {
                $productStats = DB::table('products')->selectRaw('
                    COUNT(*) as total_products,
                    SUM(CASE WHEN stock_quantity <= low_stock_threshold THEN 1 ELSE 0 END) as low_stock_products,
                    SUM(CASE WHEN stock_quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_products
                ')->first();
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'orders' => $orderStats,
                    'commissions' => $commissionStats,
                    'products' => $productStats
                ]
            ]);

        } catch (\Exception $e) {
            \Log::error('Dashboard stats error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Server error'
            ], 500);
        }
    }

    /**
     * Get Sales Chart Data (Admin Only)
     * 
     * Returns daily revenue for last 30 days
     * Used for area chart visualization
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function salesChart(Request $request)
    {
        try {
            $days = $request->input('days', 30);

            $chartData = DB::table('orders')
                ->select(
                    DB::raw('DATE(created_at) as date'),
                    DB::raw('SUM(CASE WHEN payment_status = "paid" THEN total ELSE 0 END) as revenue')
                )
                ->where('created_at', '>=', now()->subDays($days))
                ->groupBy(DB::raw('DATE(created_at)'))
                ->orderBy('date', 'asc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $chartData
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Server error'
            ], 500);
        }
    }

    /**
     * Get Recent Activities
     * 
     * Returns recent orders for activity feed
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function recentActivities(Request $request)
    {
        try {
            $user = auth()->user();
            $limit = $request->input('limit', 10);

            $query = DB::table('orders as o')
                ->leftJoin('customers as c', 'o.customer_id', '=', 'c.id')
                ->select('o.id', 'o.order_number', 'o.total', 'o.status', 'c.full_name as customer_name', 'o.created_at');

            // Role-based filtering
            if ($user->role === 'staff') {
                $query->where('o.assigned_staff_id', $user->id);
            } elseif ($user->role === 'affiliate') {
                $query->where('o.affiliate_id', $user->id);
            }

            $activities = $query->orderBy('o.created_at', 'desc')
                                ->limit($limit)
                                ->get();

            return response()->json([
                'success' => true,
                'data' => $activities
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Server error'
            ], 500);
        }
    }
}
