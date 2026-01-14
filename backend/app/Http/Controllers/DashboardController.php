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

            // Calculate total profit (Admin and Staff only)
            if ($user->role === 'admin' || $user->role === 'staff') {
                $profitQuery = DB::table('order_items as oi')
                    ->join('orders as o', 'oi.order_id', '=', 'o.id')
                    ->where('o.payment_status', 'paid');

                // If staff, filter only their assigned orders
                if ($user->role === 'staff') {
                    $profitQuery->where('o.assigned_staff_id', $user->id);
                }

                $profitStats = $profitQuery->selectRaw('
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

            // Sales Channel Health (Admin only)
            $channelHealth = null;
            if ($user->role === 'admin') {
                $channels = \App\Models\SalesChannel::select('id', 'name', 'type', 'is_active', 'last_sync_at', 'api_key', 'api_endpoint')->get();
                
                // Add connection status for each channel
                $channelHealth = $channels->map(function($channel) {
                    $channel->connection_status = $this->testConnection($channel);
                    return $channel;
                });
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'orders' => $orderStats,
                    'commissions' => $commissionStats,
                    'products' => $productStats,
                    'channels' => $channelHealth
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
            $user = auth()->user();
            $days = $request->input('days', 30);

            $query = DB::table('orders')
                ->select(
                    DB::raw('DATE(created_at) as date'),
                    DB::raw('SUM(CASE WHEN payment_status = "paid" THEN total ELSE 0 END) as revenue')
                )
                ->where('created_at', '>=', now()->subDays($days));

            // Role-based filtering for the chart
            if ($user->role === 'staff') {
                $query->where('assigned_staff_id', $user->id);
            } elseif ($user->role === 'affiliate') {
                $query->where('affiliate_id', $user->id);
            }

            $chartData = $query->groupBy(DB::raw('DATE(created_at)'))
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

    /**
     * Global Search
     * 
     * Search across products and orders
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function search(Request $request)
    {
        try {
            $query = $request->input('q');
            if (!$query || strlen($query) < 2) {
                return response()->json(['success' => true, 'data' => ['products' => [], 'orders' => []]]);
            }

            $products = DB::table('products')
                ->where('name', 'LIKE', "%{$query}%")
                ->orWhere('sku', 'LIKE', "%{$query}%")
                ->limit(5)
                ->get(['id', 'name', 'sku', 'price']);

            $orders = DB::table('orders')
                ->where('order_number', 'LIKE', "%{$query}%")
                ->limit(5)
                ->get(['id', 'order_number', 'status', 'total']);

            return response()->json([
                'success' => true,
                'data' => [
                    'products' => $products,
                    'orders' => $orders
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Search failed'], 500);
        }
    }

    /**
     * Test actual API connection
     * Returns: 'connected', 'disconnected', or 'not_configured'
     */
    private function testConnection($channel)
    {
        // Don't test internal website channel - always connected
        if ($channel->type === 'website') {
            return 'connected';
        }

        // For external channels, check if API credentials configured
        if (empty($channel->api_key) || empty($channel->api_endpoint)) {
            return 'not_configured';
        }

        try {
            // Test connection to external API
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $channel->api_endpoint);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $channel->api_key,
                'Content-Type: application/json'
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            // Consider 200-499 as successful connection
            if ($httpCode >= 200 && $httpCode < 500) {
                return 'connected';
            }

            return 'disconnected';

        } catch (\Exception $e) {
            return 'disconnected';
        }
    }
}
