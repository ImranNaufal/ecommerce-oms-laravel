<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

/**
 * Webhook Controller
 * 
 * Handles external order injection from marketplaces
 * Supports: Shopee, Lazada, TikTok, Facebook
 */
class WebhookController extends Controller
{
    /**
     * Inject External Order
     * 
     * Accepts order from external marketplace and creates it in OMS
     * Automatically handles customer creation and product mapping
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function injectOrder(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'marketplace' => 'required|string',
            'external_order_id' => 'required|string',
            'customer' => 'required|array',
            'items' => 'required|array|min:1',
            'totals' => 'required|array'
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 400);
        }

        DB::beginTransaction();

        try {
            // Log webhook receipt
            DB::table('api_logs')->insert([
                'endpoint' => '/webhook/order/external',
                'method' => 'POST',
                'request_payload' => json_encode($request->all()),
                'success' => true,
                'created_at' => now()
            ]);

            // Find or create customer
            $customer = DB::table('customers')->where('email', $request->customer['email'])->first();

            if (!$customer) {
                $customerId = DB::table('customers')->insertGetId([
                    'email' => $request->customer['email'],
                    'full_name' => $request->customer['name'],
                    'phone' => $request->customer['phone'] ?? null,
                    'address' => $request->shipping['address'] ?? '',
                    'city' => $request->shipping['city'] ?? '',
                    'created_at' => now()
                ]);
            } else {
                $customerId = $customer->id;
            }

            // Get or create channel
            $channel = DB::table('sales_channels')
                ->where('type', $request->marketplace)
                ->first();

            if (!$channel) {
                $channelId = DB::table('sales_channels')->insertGetId([
                    'name' => ucfirst($request->marketplace),
                    'type' => $request->marketplace,
                    'is_active' => true,
                    'created_at' => now()
                ]);
            } else {
                $channelId = $channel->id;
            }

            // Generate order number
            $orderNumber = 'ORD-' . strtoupper($request->marketplace) . '-' . $request->external_order_id;

            // Create order
            $orderId = DB::table('orders')->insertGetId([
                'order_number' => $orderNumber,
                'customer_id' => $customerId,
                'channel_id' => $channelId,
                'subtotal' => $request->totals['subtotal'],
                'discount' => $request->totals['discount'] ?? 0,
                'shipping_fee' => $request->totals['shipping_fee'] ?? 0,
                'tax' => $request->totals['tax'] ?? 0,
                'total' => $request->totals['total'],
                'status' => 'confirmed',
                'payment_status' => $request->payment_method === 'cod' ? 'pending' : 'paid',
                'payment_method' => $request->payment_method ?? 'online_banking',
                'shipping_address' => $request->shipping['address'] ?? '',
                'shipping_city' => $request->shipping['city'] ?? '',
                'created_at' => now()
            ]);

            // Insert order items
            foreach ($request->items as $item) {
                // Find product by SKU
                $product = DB::table('products')->where('sku', $item['sku'])->first();

                if ($product) {
                    DB::table('order_items')->insert([
                        'order_id' => $orderId,
                        'product_id' => $product->id,
                        'product_name' => $item['name'],
                        'sku' => $item['sku'],
                        'quantity' => $item['quantity'],
                        'price' => $item['price'],
                        'cost_price' => $product->cost_price
                    ]);

                    // Deduct stock
                    DB::table('products')->where('id', $product->id)->decrement('stock_quantity', $item['quantity']);

                    // Log inventory transaction (Sync with Audit Trail)
                    DB::table('inventory_transactions')->insert([
                        'product_id' => $product->id,
                        'transaction_type' => 'sale',
                        'quantity' => -$item['quantity'],
                        'reference_type' => 'order',
                        'reference_id' => $orderId,
                        'created_by' => 1, // System/Admin ID for automation
                        'notes' => "External Order via " . ucfirst($request->marketplace),
                        'created_at' => now()
                    ]);

                    // Check for Low Stock (Sync with Alerts)
                    $updatedProduct = DB::table('products')->where('id', $product->id)->first();
                    if ($updatedProduct->stock_quantity <= $updatedProduct->low_stock_threshold) {
                        DB::table('notifications')->insert([
                            'user_id' => 1,
                            'title' => '⚠️ Critical: Low Stock',
                            'message' => "Product '{$updatedProduct->name}' hit low stock after {$request->marketplace} order.",
                            'type' => 'danger',
                            'is_read' => false,
                            'action_url' => '/products',
                            'created_at' => now(),
                            'updated_at' => now()
                        ]);
                    }
                }
            }

            // Update customer statistics (Sync with CRM)
            DB::table('customers')
                ->where('id', $customerId)
                ->increment('total_orders');
            
            DB::table('customers')
                ->where('id', $customerId)
                ->increment('total_spent', $request->totals['total']);

            // --- NEW: Notify Admin about External Order ---
            DB::table('notifications')->insert([
                'user_id' => 1, // Notify Admin
                'title' => '🛒 New External Order',
                'message' => "Order {$orderNumber} received from " . ucfirst($request->marketplace) . ". Total: RM" . number_format($request->totals['total'], 2),
                'type' => 'success',
                'is_read' => false,
                'action_url' => "/orders/{$orderId}",
                'created_at' => now(),
                'updated_at' => now()
            ]);

            DB::commit();

            // Update log dengan response
            DB::table('api_logs')
                ->where('endpoint', '/webhook/order/external')
                ->where('created_at', '>=', now()->subMinute())
                ->orderBy('created_at', 'desc')
                ->limit(1)
                ->update(['response_payload' => json_encode(['success' => true, 'orderId' => $orderId, 'orderNumber' => $orderNumber])]);

            return response()->json([
                'success' => true,
                'message' => 'Order injected successfully',
                'orderId' => $orderId,
                'orderNumber' => $orderNumber
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            
            \Log::error('Webhook Injection Error: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());

            return response()->json([
                'success' => false, 
                'message' => 'Webhook processing failed: ' . $e->getMessage(),
                'line' => $e->getLine()
            ], 500);
        }
    }

    public function paymentConfirmation(Request $request)
    {
        try {
            DB::table('orders')
                ->where('order_number', $request->order_number)
                ->update(['payment_status' => 'paid']);

            // Auto-approve commissions
            DB::table('commission_transactions')
                ->whereIn('order_id', function($query) use ($request) {
                    $query->select('id')->from('orders')->where('order_number', $request->order_number);
                })
                ->where('status', 'pending')
                ->update(['status' => 'approved', 'approved_at' => now()]);

            return response()->json(['success' => true, 'message' => 'Payment confirmed']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Server error'], 500);
        }
    }
}
