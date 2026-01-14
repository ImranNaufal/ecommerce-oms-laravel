<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Product;
use App\Models\Customer;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Order Service
 * 
 * Handles all order-related business logic
 * - Order creation with inventory management
 * - Status updates with validation
 * - Payment processing
 * - Commission triggering
 */
class OrderService
{
    protected CommissionService $commissionService;
    protected InventoryService $inventoryService;
    protected NotificationService $notificationService;

    public function __construct(
        CommissionService $commissionService,
        InventoryService $inventoryService,
        NotificationService $notificationService
    ) {
        $this->commissionService = $commissionService;
        $this->inventoryService = $inventoryService;
        $this->notificationService = $notificationService;
    }

    /**
     * Generate unique order number
     * 
     * Format: ORD-YYYYMMDDHHMMSS-RANDOM
     * 
     * @return string
     */
    public function generateOrderNumber(): string
    {
        $timestamp = date('YmdHis');
        $random = strtoupper(substr(md5(uniqid(rand(), true)), 0, 6));
        return "ORD-{$timestamp}-{$random}";
    }

    /**
     * Create a new order with full processing
     * 
     * Steps:
     * 1. Validate product availability
     * 2. Calculate order totals
     * 3. Create order record
     * 4. Create order items
     * 5. Deduct inventory
     * 6. Calculate commissions
     * 7. Update customer stats
     * 8. Send notifications
     * 
     * @param array $data Order data
     * @param \App\Models\User $user Current user
     * @return Order Created order
     * @throws \Exception If validation or processing fails
     */
    public function createOrder(array $data, $user): Order
    {
        return DB::transaction(function () use ($data, $user) {
            // 1. Validate products and calculate totals
            $orderItems = [];
            $subtotal = 0;

            foreach ($data['items'] as $item) {
                $product = Product::where('id', $item['product_id'])
                    ->where('status', 'active')
                    ->lockForUpdate()
                    ->first();

                if (!$product) {
                    throw new \Exception("Product {$item['product_id']} not found or inactive");
                }

                if ($product->stock_quantity < $item['quantity']) {
                    throw new \Exception("Insufficient stock for {$product->name}. Available: {$product->stock_quantity}");
                }

                $itemSubtotal = $product->price * $item['quantity'];
                $subtotal += $itemSubtotal;

                $orderItems[] = [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'sku' => $product->sku,
                    'quantity' => $item['quantity'],
                    'price' => $product->price,
                    'cost_price' => $product->cost_price,
                ];
            }

            // 2. Calculate order totals
            $discount = $data['discount'] ?? 0;
            $shippingFee = $data['shipping_fee'] ?? 0;
            $tax = $subtotal * 0.06; // 6% SST Malaysia
            $total = $subtotal - $discount + $shippingFee + $tax;

            // 3. Create order
            $order = Order::create([
                'order_number' => $this->generateOrderNumber(),
                'customer_id' => $data['customer_id'],
                'channel_id' => $data['channel_id'],
                'assigned_staff_id' => $user->id,
                'affiliate_id' => $data['affiliate_id'] ?? null,
                'subtotal' => $subtotal,
                'discount' => $discount,
                'shipping_fee' => $shippingFee,
                'tax' => $tax,
                'total' => $total,
                'status' => 'pending',
                'payment_status' => 'pending',
                'payment_method' => $data['payment_method'],
                'shipping_address' => $data['shipping_address'],
                'shipping_city' => $data['shipping_city'] ?? null,
                'shipping_state' => $data['shipping_state'] ?? null,
                'shipping_postal_code' => $data['shipping_postal_code'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            // 4. Create order items
            $order->items()->createMany($orderItems);

            // 5. Deduct inventory
            foreach ($orderItems as $item) {
                $this->inventoryService->deductStock(
                    $item['product_id'],
                    $item['quantity'],
                    'sale',
                    $order->id,
                    $user->id
                );
            }

            // 6. Calculate commissions
            $staffCommission = 0;
            $affiliateCommission = 0;

            if ($user->role === 'staff') {
                $staffCommission = $this->commissionService->calculateAndCreate(
                    $order->id,
                    $user->id,
                    'staff',
                    $total
                );
            }

            if (!empty($data['affiliate_id'])) {
                $affiliateCommission = $this->commissionService->calculateAndCreate(
                    $order->id,
                    $data['affiliate_id'],
                    'affiliate',
                    $total
                );
            }

            // Update order with commission amounts
            $order->update([
                'staff_commission' => $staffCommission,
                'affiliate_commission' => $affiliateCommission,
            ]);

            // 7. Update customer statistics
            $this->updateCustomerStats($data['customer_id'], $total);

            // 8. Send notifications
            $this->notificationService->notifyOrderCreated($order, $user);

            return $order->fresh(['items', 'customer', 'channel']);
        });
    }

    /**
     * Update order status with validation
     * 
     * Handles stock restoration for cancellations
     * Manages commission lifecycle
     * 
     * @param Order $order Order to update
     * @param string $newStatus New status
     * @param array $data Additional data (tracking number, notes)
     * @param \App\Models\User $user Current user
     * @return Order Updated order
     */
    public function updateStatus(Order $order, string $newStatus, array $data, $user): Order
    {
        return DB::transaction(function () use ($order, $newStatus, $data, $user) {
            $oldStatus = $order->status;

            // Handle cancellation/refund - restore stock
            if (in_array($newStatus, ['cancelled', 'refunded']) && 
                !in_array($oldStatus, ['cancelled', 'refunded'])) {
                
                foreach ($order->items as $item) {
                    $this->inventoryService->restoreStock(
                        $item->product_id,
                        $item->quantity,
                        $order->id,
                        $user->id,
                        "Stock restored from {$newStatus} order"
                    );
                }

                // Reject commissions
                $this->commissionService->rejectCommissionsForOrder($order->id);
            }

            // Update order status
            $updates = [
                'status' => $newStatus,
                'tracking_number' => $data['tracking_number'] ?? $order->tracking_number,
                'notes' => $data['notes'] ?? $order->notes,
            ];

            // Set timestamp for specific statuses
            if ($newStatus === 'confirmed') $updates['confirmed_at'] = now();
            if ($newStatus === 'packed') $updates['packed_at'] = now();
            if ($newStatus === 'shipped') $updates['shipped_at'] = now();
            if ($newStatus === 'delivered') $updates['delivered_at'] = now();

            $order->update($updates);

            // Send notifications
            $this->notificationService->notifyStatusChanged($order, $oldStatus, $newStatus);

            return $order->fresh();
        });
    }

    /**
     * Update payment status and trigger commission approval
     * 
     * @param Order $order Order to update
     * @param string $paymentStatus New payment status
     * @param \App\Models\User $user Current user
     * @return Order Updated order
     */
    public function updatePaymentStatus(Order $order, string $paymentStatus, $user): Order
    {
        return DB::transaction(function () use ($order, $paymentStatus, $user) {
            $order->update(['payment_status' => $paymentStatus]);

            // Auto-approve commissions when payment confirmed
            if ($paymentStatus === 'paid') {
                $this->commissionService->approveCommissionsForOrder($order->id, $user->id);
            }
            
            // Reject commissions if refunded
            if ($paymentStatus === 'refunded') {
                $this->commissionService->rejectCommissionsForOrder($order->id);
            }

            return $order->fresh();
        });
    }

    /**
     * Update customer statistics
     * 
     * @param int $customerId Customer ID
     * @param float $orderTotal Order total amount
     * @return void
     */
    private function updateCustomerStats(int $customerId, float $orderTotal): void
    {
        $customer = Customer::find($customerId);
        if ($customer) {
            $customer->increment('total_orders');
            $customer->increment('total_spent', $orderTotal);
        }
    }

    /**
     * Get orders with filters (role-based)
     * 
     * @param array $filters Query filters
     * @param \App\Models\User $user Current user
     * @param int $perPage Pagination size
     * @return \Illuminate\Pagination\LengthAwarePaginator
     */
    public function getOrders(array $filters, $user, int $perPage = 20)
    {
        $query = Order::with(['customer', 'channel', 'staff', 'affiliate']);

        // Role-based filtering
        if ($user->role === 'staff') {
            $query->where('assigned_staff_id', $user->id);
        } elseif ($user->role === 'affiliate') {
            $query->where('affiliate_id', $user->id);
        }

        // Apply filters
        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['payment_status'])) {
            $query->where('payment_status', $filters['payment_status']);
        }

        if (!empty($filters['channel'])) {
            $query->where('channel_id', $filters['channel']);
        }

        if (!empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        return $query->latest()->paginate($perPage);
    }
}
