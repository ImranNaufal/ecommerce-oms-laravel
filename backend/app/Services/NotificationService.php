<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Notification Service
 * 
 * Centralized notification management
 * Handles creation of system notifications for various events
 */
class NotificationService
{
    /**
     * Notify about new order creation
     * 
     * @param Order $order Order that was created
     * @param User $user User who created the order
     * @return void
     */
    public function notifyOrderCreated(Order $order, User $user): void
    {
        try {
            // Notify assigned staff
            if ($order->assigned_staff_id) {
                Notification::create([
                    'user_id' => $order->assigned_staff_id,
                    'title' => 'New Order Assigned',
                    'message' => "You have been assigned to Order #{$order->order_number}. Total: RM" . number_format($order->total, 2),
                    'type' => 'info',
                    'is_read' => false,
                    'action_url' => "/orders/{$order->id}",
                ]);
            }

            // Notify admin (user_id = 1)
            if ($user->id != 1) {
                Notification::create([
                    'user_id' => 1,
                    'title' => '🛒 New Order Created',
                    'message' => "Order #{$order->order_number} created by {$user->full_name}. Total: RM" . number_format($order->total, 2),
                    'type' => 'success',
                    'is_read' => false,
                    'action_url' => "/orders/{$order->id}",
                ]);
            }
        } catch (\Exception $e) {
            Log::error("Failed to send order creation notification: {$e->getMessage()}");
        }
    }

    /**
     * Notify about external order (from marketplace)
     * 
     * @param Order $order Order that was created
     * @param string $marketplace Marketplace name
     * @return void
     */
    public function notifyExternalOrder(Order $order, string $marketplace): void
    {
        try {
            Notification::create([
                'user_id' => 1, // Admin
                'title' => '🛒 New External Order',
                'message' => "Order {$order->order_number} received from " . ucfirst($marketplace) . ". Total: RM" . number_format($order->total, 2),
                'type' => 'success',
                'is_read' => false,
                'action_url' => "/orders/{$order->id}",
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to send external order notification: {$e->getMessage()}");
        }
    }

    /**
     * Notify about order status change
     * 
     * @param Order $order Order that was updated
     * @param string $oldStatus Previous status
     * @param string $newStatus New status
     * @return void
     */
    public function notifyStatusChanged(Order $order, string $oldStatus, string $newStatus): void
    {
        try {
            $statusMessages = [
                'confirmed' => '✅ Order Confirmed',
                'packed' => '📦 Order Packed',
                'shipped' => '🚚 Order Shipped',
                'delivered' => '🎉 Order Delivered',
                'cancelled' => '❌ Order Cancelled',
                'refunded' => '💰 Order Refunded',
            ];

            $title = $statusMessages[$newStatus] ?? 'Order Status Updated';

            // Notify assigned staff
            if ($order->assigned_staff_id) {
                Notification::create([
                    'user_id' => $order->assigned_staff_id,
                    'title' => $title,
                    'message' => "Order #{$order->order_number} status changed from {$oldStatus} to {$newStatus}",
                    'type' => $this->getNotificationType($newStatus),
                    'is_read' => false,
                    'action_url' => "/orders/{$order->id}",
                ]);
            }

            // Notify affiliate if exists
            if ($order->affiliate_id && $order->affiliate_id != $order->assigned_staff_id) {
                Notification::create([
                    'user_id' => $order->affiliate_id,
                    'title' => $title,
                    'message' => "Order #{$order->order_number} that you referred is now {$newStatus}",
                    'type' => $this->getNotificationType($newStatus),
                    'is_read' => false,
                    'action_url' => "/orders/{$order->id}",
                ]);
            }
        } catch (\Exception $e) {
            Log::error("Failed to send status change notification: {$e->getMessage()}");
        }
    }

    /**
     * Notify about low stock
     * 
     * @param Product $product Product with low stock
     * @param int|null $userId User ID to notify (null = all admins)
     * @return void
     */
    public function notifyLowStock(Product $product, ?int $userId = null): void
    {
        try {
            $userIds = $userId ? [$userId] : $this->getAdminUserIds();

            foreach ($userIds as $uid) {
                Notification::create([
                    'user_id' => $uid,
                    'title' => '⚠️ Low Stock Alert',
                    'message' => "Product '{$product->name}' (SKU: {$product->sku}) is running low. Current stock: {$product->stock_quantity}",
                    'type' => 'warning',
                    'is_read' => false,
                    'action_url' => '/products',
                ]);
            }
        } catch (\Exception $e) {
            Log::error("Failed to send low stock notification: {$e->getMessage()}");
        }
    }

    /**
     * Notify about critical low stock
     * 
     * @param Product $product Product with critical low stock
     * @return void
     */
    public function notifyCriticalLowStock(Product $product): void
    {
        try {
            $userIds = $this->getAdminUserIds();

            foreach ($userIds as $userId) {
                Notification::create([
                    'user_id' => $userId,
                    'title' => '🚨 Critical: Low Stock',
                    'message' => "Product '{$product->name}' has critically low stock! Only {$product->stock_quantity} units left.",
                    'type' => 'danger',
                    'is_read' => false,
                    'action_url' => '/products',
                ]);
            }
        } catch (\Exception $e) {
            Log::error("Failed to send critical low stock notification: {$e->getMessage()}");
        }
    }

    /**
     * Notify about commission approval
     * 
     * @param int $commissionId Commission ID
     * @param int $userId User who earned the commission
     * @param float $amount Commission amount
     * @return void
     */
    public function notifyCommissionApproved(int $commissionId, int $userId, float $amount): void
    {
        try {
            Notification::create([
                'user_id' => $userId,
                'title' => '💰 Commission Approved',
                'message' => "Your commission of RM" . number_format($amount, 2) . " has been approved and is ready for payout.",
                'type' => 'success',
                'is_read' => false,
                'action_url' => '/commissions',
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to send commission approval notification: {$e->getMessage()}");
        }
    }

    /**
     * Notify about commission payment
     * 
     * @param int $commissionId Commission ID
     * @param int $userId User who earned the commission
     * @param float $amount Commission amount
     * @return void
     */
    public function notifyCommissionPaid(int $commissionId, int $userId, float $amount): void
    {
        try {
            Notification::create([
                'user_id' => $userId,
                'title' => '✅ Commission Paid',
                'message' => "Your commission of RM" . number_format($amount, 2) . " has been paid. Check your account.",
                'type' => 'success',
                'is_read' => false,
                'action_url' => '/commissions',
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to send commission paid notification: {$e->getMessage()}");
        }
    }

    /**
     * Mark notification as read
     * 
     * @param int $notificationId Notification ID
     * @return bool Success status
     */
    public function markAsRead(int $notificationId): bool
    {
        try {
            $notification = Notification::find($notificationId);
            if ($notification) {
                $notification->update(['is_read' => true]);
                return true;
            }
            return false;
        } catch (\Exception $e) {
            Log::error("Failed to mark notification as read: {$e->getMessage()}");
            return false;
        }
    }

    /**
     * Mark all notifications as read for a user
     * 
     * @param int $userId User ID
     * @return int Number of notifications marked as read
     */
    public function markAllAsRead(int $userId): int
    {
        try {
            return Notification::where('user_id', $userId)
                ->where('is_read', false)
                ->update(['is_read' => true, 'updated_at' => now()]);
        } catch (\Exception $e) {
            Log::error("Failed to mark all notifications as read: {$e->getMessage()}");
            return 0;
        }
    }

    /**
     * Get unread notification count for a user
     * 
     * @param int $userId User ID
     * @return int Unread count
     */
    public function getUnreadCount(int $userId): int
    {
        return Notification::where('user_id', $userId)
            ->where('is_read', false)
            ->count();
    }

    /**
     * Get notification type based on order status
     * 
     * @param string $status Order status
     * @return string Notification type
     */
    private function getNotificationType(string $status): string
    {
        return match ($status) {
            'delivered' => 'success',
            'cancelled', 'refunded' => 'danger',
            'confirmed', 'shipped' => 'info',
            default => 'info',
        };
    }

    /**
     * Get all admin user IDs
     * 
     * @return array
     */
    private function getAdminUserIds(): array
    {
        return User::where('role', 'admin')
            ->where('status', 'active')
            ->pluck('id')
            ->toArray();
    }
}
