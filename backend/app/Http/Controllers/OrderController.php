<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

/**
 * Order Controller
 * 
 * Handles complete order lifecycle:
 * - Order creation with inventory deduction
 * - Automated commission calculation
 * - Status management
 * - Payment tracking
 * 
 * Uses database transactions for ACID compliance
 */
class OrderController extends Controller
{
    /**
     * Generate Unique Order Number
     * 
     * Format: ORD-TIMESTAMP-RANDOM
     * Example: ORD-20260110-AB12CD
     * 
     * @return string
     */
    private function generateOrderNumber()
    {
        $timestamp = date('YmdHis');
        $random = strtoupper(substr(md5(uniqid(rand(), true)), 0, 6));
        return "ORD-{$timestamp}-{$random}";
    }

    /**
     * Calculate Commission for Order
     * 
     * Supports both percentage and fixed amount commission
     * Creates commission_transaction record with 'pending' status
     * 
     * @param int $orderId
     * @param int $userId
     * @param string $userType ('staff' or 'affiliate')
     * @param float $orderTotal
     * @return float Commission amount
     */
    private function calculateCommission($orderId, $userId, $userType, $orderTotal)
    {
        static $configCache = [];
        
        try {
            // Check cache first
            if (!isset($configCache[$userId])) {
                $configCache[$userId] = DB::table('commission_configs')
                    ->where('user_id', $userId)
                    ->where('is_active', true)
                    ->where('effective_from', '<=', now())
                    ->where(function($query) {
                        $query->whereNull('effective_until')
                              ->orWhere('effective_until', '>=', now());
                    })
                    ->first();
            }

            $config = $configCache[$userId];

            if (!$config) {
                return 0;
            }

            // Calculate commission based on type
            $commission = 0;
            if ($config->commission_type === 'percentage') {
                $commission = ($orderTotal * $config->commission_value) / 100;
            } else {
                $commission = $config->commission_value;
            }

            // Insert commission transaction
            DB::table('commission_transactions')->insert([
                'user_id' => $userId,
                'order_id' => $orderId,
                'commission_type' => $userType,
                'amount' => $commission,
                'percentage' => $config->commission_value,
                'order_total' => $orderTotal,
                'status' => 'pending',
                'created_at' => now()
            ]);

            return $commission;

        } catch (\Exception $e) {
            \Log::error('Calculate commission error: ' . $e->getMessage());
            return 0;
        }
    }

    /**
     * Get All Orders (with filters and pagination)
     * 
     * Supports filtering by:
     * - status, payment_status, channel, date range
     * 
     * Role-based access:
     * - Admin: See all orders
     * - Staff: Only see assigned orders
     * - Affiliate: Only see referred orders
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request)
    {
        try {
            $user = auth()->user();
            $perPage = $request->input('limit', 20);
            
            $query = DB::table('orders as o')
                ->leftJoin('customers as c', 'o.customer_id', '=', 'c.id')
                ->leftJoin('sales_channels as sc', 'o.channel_id', '=', 'sc.id')
                ->leftJoin('users as u1', 'o.assigned_staff_id', '=', 'u1.id')
                ->leftJoin('users as u2', 'o.affiliate_id', '=', 'u2.id')
                ->select(
                    'o.*',
                    'c.full_name as customer_name',
                    'c.email as customer_email',
                    'sc.name as channel_name',
                    'u1.full_name as staff_name',
                    'u2.full_name as affiliate_name'
                );

            // Role-based filtering
            if ($user->role === 'staff') {
                $query->where('o.assigned_staff_id', $user->id);
            } elseif ($user->role === 'affiliate') {
                $query->where('o.affiliate_id', $user->id);
            }

            // Apply filters
            if ($request->filled('status')) {
                $query->where('o.status', $request->status);
            }

            if ($request->filled('payment_status')) {
                $query->where('o.payment_status', $request->payment_status);
            }

            if ($request->filled('channel')) {
                $query->where('o.channel_id', $request->channel);
            }

            if ($request->has('date_from')) {
                $query->whereDate('o.created_at', '>=', $request->date_from);
            }

            if ($request->has('date_to')) {
                $query->whereDate('o.created_at', '<=', $request->date_to);
            }

            $orders = $query->orderBy('o.created_at', 'desc')->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $orders->items(),
                'pagination' => [
                    'page' => $orders->currentPage(),
                    'limit' => $orders->perPage(),
                    'total' => $orders->total(),
                    'pages' => $orders->lastPage()
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
     * Create New Order
     * 
     * Complete order processing:
     * 1. Validate product availability and stock
     * 2. Calculate totals (subtotal, tax, shipping)
     * 3. Create order record
     * 4. Create order items
     * 5. Deduct inventory
     * 6. Calculate commissions (staff & affiliate)
     * 7. Update customer statistics
     * 
     * Uses database transaction for data integrity
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'customer_id' => 'required|integer|exists:customers,id',
            'channel_id' => 'required|integer|exists:sales_channels,id',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer',
            'items.*.quantity' => 'required|integer|min:1',
            'shipping_address' => 'required|string',
            'payment_method' => 'required|in:cod,online_banking,credit_card,ewallet'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 400);
        }

        // Start database transaction
        DB::beginTransaction();

        try {
            $user = auth()->user();
            $items = $request->items;
            $subtotal = 0;
            $orderItems = [];

            // Calculate subtotal and validate products
            foreach ($items as $item) {
                $product = DB::table('products')
                    ->where('id', $item['product_id'])
                    ->where('status', 'active')
                    ->first();

                if (!$product) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => "Product {$item['product_id']} not found or inactive"
                    ], 400);
                }

                // Check stock availability
                if ($product->stock_quantity < $item['quantity']) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => "Insufficient stock for {$product->name}"
                    ], 400);
                }

                $itemSubtotal = $product->price * $item['quantity'];
                $subtotal += $itemSubtotal;

                $orderItems[] = [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'sku' => $product->sku,
                    'quantity' => $item['quantity'],
                    'price' => $product->price,
                    'cost_price' => $product->cost_price
                ];
            }

            // Calculate tax and total
            $discount = $request->input('discount', 0);
            $shippingFee = $request->input('shipping_fee', 0);
            $tax = $subtotal * 0.06; // 6% SST Malaysia
            $total = $subtotal - $discount + $shippingFee + $tax;

            // Create order
            $orderNumber = $this->generateOrderNumber();
            
            $orderId = DB::table('orders')->insertGetId([
                'order_number' => $orderNumber,
                'customer_id' => $request->customer_id,
                'channel_id' => $request->channel_id,
                'assigned_staff_id' => $user->id,
                'affiliate_id' => $request->input('affiliate_id'),
                'subtotal' => $subtotal,
                'discount' => $discount,
                'shipping_fee' => $shippingFee,
                'tax' => $tax,
                'total' => $total,
                'status' => 'pending',
                'payment_status' => 'pending',
                'payment_method' => $request->payment_method,
                'shipping_address' => $request->shipping_address,
                'shipping_city' => $request->input('shipping_city'),
                'shipping_state' => $request->input('shipping_state'),
                'shipping_postal_code' => $request->input('shipping_postal_code'),
                'notes' => $request->input('notes'),
                'created_at' => now()
            ]);

            // Insert order items and update inventory
            foreach ($orderItems as $item) {
                // Insert order item
                DB::table('order_items')->insert([
                    'order_id' => $orderId,
                    'product_id' => $item['product_id'],
                    'product_name' => $item['product_name'],
                    'sku' => $item['sku'],
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'cost_price' => $item['cost_price']
                    // subtotal and profit are MySQL GENERATED columns
                ]);

                // Deduct stock
                DB::table('products')
                    ->where('id', $item['product_id'])
                    ->decrement('stock_quantity', $item['quantity']);

                // Log inventory transaction
                DB::table('inventory_transactions')->insert([
                    'product_id' => $item['product_id'],
                    'transaction_type' => 'sale',
                    'quantity' => -$item['quantity'],
                    'reference_type' => 'order',
                    'reference_id' => $orderId,
                    'created_by' => $user->id,
                    'created_at' => now()
                ]);

                // --- NEW: Trigger Low Stock Alert ---
                $updatedProduct = DB::table('products')->where('id', $item['product_id'])->first();
                if ($updatedProduct->stock_quantity <= $updatedProduct->low_stock_threshold) {
                    DB::table('notifications')->insert([
                        'user_id' => $user->id,
                        'title' => 'Low Stock Alert',
                        'message' => "Product '{$updatedProduct->name}' is running low ({$updatedProduct->stock_quantity} left).",
                        'type' => 'danger',
                        'is_read' => false,
                        'action_url' => '/products',
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);
                }
            }

            // Calculate and create commission records
            $staffCommission = 0;
            $affiliateCommission = 0;

            if ($user->role === 'staff') {
                $staffCommission = $this->calculateCommission($orderId, $user->id, 'staff', $total);
            }

            // --- NEW: Notify Staff about Order ---
            if ($user->id) {
                DB::table('notifications')->insert([
                    'user_id' => $user->id,
                    'title' => 'New Order Assigned',
                    'message' => "You have been assigned to Order #{$orderNumber}. Total: RM" . number_format($total, 2),
                    'type' => 'info',
                    'is_read' => false,
                    'action_url' => "/orders/{$orderId}",
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
            }

            if ($request->has('affiliate_id')) {
                $affiliateCommission = $this->calculateCommission($orderId, $request->affiliate_id, 'affiliate', $total);
            }

            // Update order with commission amounts
            DB::table('orders')
                ->where('id', $orderId)
                ->update([
                    'staff_commission' => $staffCommission,
                    'affiliate_commission' => $affiliateCommission
                ]);

            // Update customer statistics
            DB::table('customers')
                ->where('id', $request->customer_id)
                ->increment('total_orders');
            
            DB::table('customers')
                ->where('id', $request->customer_id)
                ->increment('total_spent', $total);

            // Commit transaction
            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Order created successfully',
                'orderId' => $orderId,
                'orderNumber' => $orderNumber
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Create order error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to create order'
            ], 500);
        }
    }

    /**
     * Get Single Order Details
     * 
     * Includes order items and related information
     * Enforces role-based access control
     * 
     * @param int $id
     * @return JsonResponse
     */
    public function show($id)
    {
        try {
            $user = auth()->user();
            
            $order = DB::table('orders as o')
                ->leftJoin('customers as c', 'o.customer_id', '=', 'c.id')
                ->leftJoin('sales_channels as sc', 'o.channel_id', '=', 'sc.id')
                ->leftJoin('users as u1', 'o.assigned_staff_id', '=', 'u1.id')
                ->leftJoin('users as u2', 'o.affiliate_id', '=', 'u2.id')
                ->select(
                    'o.*',
                    'c.full_name as customer_name',
                    'c.email as customer_email',
                    'sc.name as channel_name',
                    'u1.full_name as staff_name',
                    'u2.full_name as affiliate_name'
                )
                ->where('o.id', $id)
                ->first();

            if (!$order) {
                return response()->json([
                    'success' => false,
                    'message' => 'Order not found'
                ], 404);
            }

            // Check permissions
            if ($user->role === 'staff' && $order->assigned_staff_id != $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Access denied'
                ], 403);
            }

            if ($user->role === 'affiliate' && $order->affiliate_id != $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Access denied'
                ], 403);
            }

            // Get order items
            $items = DB::table('order_items')
                ->where('order_id', $id)
                ->get();

            $order->items = $items;

            return response()->json([
                'success' => true,
                'data' => $order
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Server error'
            ], 500);
        }
    }

    /**
     * Update Order Status
     * 
     * Workflow: pending → confirmed → processing → shipped → delivered
     * 
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function updateStatus(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:pending,confirmed,processing,packed,shipped,delivered,cancelled,refunded'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 400);
        }

        DB::beginTransaction();
        try {
            $order = DB::table('orders')->where('id', $id)->first();
            if (!$order) {
                return response()->json(['success' => false, 'message' => 'Order not found'], 404);
            }

            $oldStatus = $order->status;
            $newStatus = $request->status;

            // If cancelling/refunding from a non-cancelled state, restore stock
            if (in_array($newStatus, ['cancelled', 'refunded']) && !in_array($oldStatus, ['cancelled', 'refunded'])) {
                $items = DB::table('order_items')->where('order_id', $id)->get();
                foreach ($items as $item) {
                    DB::table('products')
                        ->where('id', $item->product_id)
                        ->increment('stock_quantity', $item->quantity);
                    
                    // Log inventory restoration
                    DB::table('inventory_transactions')->insert([
                        'product_id' => $item->product_id,
                        'transaction_type' => 'adjustment', // or 'restoration'
                        'quantity' => $item->quantity,
                        'reference_type' => 'order',
                        'reference_id' => $id,
                        'created_by' => auth()->id(),
                        'notes' => "Stock restored from {$newStatus} order",
                        'created_at' => now()
                    ]);
                }

                // Invalidate commissions if cancelled
                DB::table('commission_transactions')
                    ->where('order_id', $id)
                    ->update(['status' => 'rejected', 'updated_at' => now()]);
            }

            // Update timestamps for specific statuses
            $updateData = ['status' => $newStatus, 'updated_at' => now()];
            if ($newStatus === 'confirmed') $updateData['confirmed_at'] = now();
            if ($newStatus === 'packed') $updateData['packed_at'] = now();
            if ($newStatus === 'shipped') $updateData['shipped_at'] = now();
            if ($newStatus === 'delivered') $updateData['delivered_at'] = now();

            DB::table('orders')->where('id', $id)->update($updateData);

            DB::commit();
            return response()->json([
                'success' => true,
                'message' => "Order status updated to {$newStatus}"
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Server error',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update Payment Status
     * 
     * When payment status is set to 'paid', automatically approves
     * related commission transactions.
     * When set to 'refunded', rejects commissions.
     * 
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function updatePayment(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'payment_status' => 'required|in:pending,paid,failed,refunded'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 400);
        }

        DB::beginTransaction();
        try {
            $user = auth()->user();
            
            DB::table('orders')
                ->where('id', $id)
                ->update(['payment_status' => $request->payment_status, 'updated_at' => now()]);

            // If payment confirmed, auto-approve commissions
            if ($request->payment_status === 'paid') {
                DB::table('commission_transactions')
                    ->where('order_id', $id)
                    ->where('status', 'pending')
                    ->update([
                        'status' => 'approved',
                        'approved_by' => $user->id,
                        'approved_at' => now(),
                        'updated_at' => now()
                    ]);
            } 
            // If payment refunded, reject commissions
            elseif ($request->payment_status === 'refunded') {
                DB::table('commission_transactions')
                    ->where('order_id', $id)
                    ->update([
                        'status' => 'rejected',
                        'updated_at' => now()
                    ]);
            }

            DB::commit();
            return response()->json([
                'success' => true,
                'message' => 'Payment status updated successfully'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Server error',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
