<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

/**
 * Order Model (Improved)
 * 
 * IMPROVEMENTS:
 * ✅ Added query scopes for common filters
 * ✅ Added accessors for computed values
 * ✅ Added model events for automation
 * ✅ Better relationship definitions
 * 
 * TO REPLACE: Order.php (after testing)
 */
class OrderImproved extends Model
{
    use HasFactory;

    protected $table = 'orders';

    protected $fillable = [
        'order_number',
        'customer_id',
        'channel_id',
        'assigned_staff_id',
        'affiliate_id',
        'subtotal',
        'discount',
        'shipping_fee',
        'tax',
        'total',
        'status',
        'payment_status',
        'payment_method',
        'shipping_address',
        'shipping_city',
        'shipping_state',
        'shipping_postal_code',
        'tracking_number',
        'notes',
        'staff_commission',
        'affiliate_commission',
        'confirmed_at',
        'packed_at',
        'shipped_at',
        'delivered_at'
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'discount' => 'decimal:2',
        'shipping_fee' => 'decimal:2',
        'tax' => 'decimal:2',
        'total' => 'decimal:2',
        'staff_commission' => 'decimal:2',
        'affiliate_commission' => 'decimal:2',
        'confirmed_at' => 'datetime',
        'packed_at' => 'datetime',
        'shipped_at' => 'datetime',
        'delivered_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * The "booted" method of the model.
     */
    protected static function booted(): void
    {
        // Auto-generate order number if not provided
        static::creating(function ($order) {
            if (empty($order->order_number)) {
                $order->order_number = static::generateOrderNumber();
            }
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Query Scopes
    |--------------------------------------------------------------------------
    */

    /**
     * Scope: Filter by status
     */
    public function scopeStatus(Builder $query, string $status): Builder
    {
        return $query->where('status', $status);
    }

    /**
     * Scope: Filter pending orders
     */
    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope: Filter confirmed orders
     */
    public function scopeConfirmed(Builder $query): Builder
    {
        return $query->where('status', 'confirmed');
    }

    /**
     * Scope: Filter delivered orders
     */
    public function scopeDelivered(Builder $query): Builder
    {
        return $query->where('status', 'delivered');
    }

    /**
     * Scope: Filter by payment status
     */
    public function scopePaymentStatus(Builder $query, string $paymentStatus): Builder
    {
        return $query->where('payment_status', $paymentStatus);
    }

    /**
     * Scope: Filter paid orders
     */
    public function scopePaid(Builder $query): Builder
    {
        return $query->where('payment_status', 'paid');
    }

    /**
     * Scope: Filter unpaid orders
     */
    public function scopeUnpaid(Builder $query): Builder
    {
        return $query->where('payment_status', 'pending');
    }

    /**
     * Scope: Filter by assigned staff
     */
    public function scopeAssignedTo(Builder $query, int $staffId): Builder
    {
        return $query->where('assigned_staff_id', $staffId);
    }

    /**
     * Scope: Filter by affiliate
     */
    public function scopeReferredBy(Builder $query, int $affiliateId): Builder
    {
        return $query->where('affiliate_id', $affiliateId);
    }

    /**
     * Scope: Filter by date range
     */
    public function scopeDateRange(Builder $query, string $from, string $to): Builder
    {
        return $query->whereBetween('created_at', [$from, $to]);
    }

    /**
     * Scope: Filter recent orders
     */
    public function scopeRecent(Builder $query, int $days = 7): Builder
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    /**
     * Scope: Filter high value orders
     */
    public function scopeHighValue(Builder $query, float $minAmount = 1000): Builder
    {
        return $query->where('total', '>=', $minAmount);
    }

    /*
    |--------------------------------------------------------------------------
    | Accessors & Mutators
    |--------------------------------------------------------------------------
    */

    /**
     * Get the order's net profit (total - commissions)
     */
    public function getNetProfitAttribute(): float
    {
        return $this->total - ($this->staff_commission + $this->affiliate_commission);
    }

    /**
     * Get the order's profit margin percentage
     */
    public function getProfitMarginAttribute(): ?float
    {
        $totalCost = $this->items->sum('cost_price');
        if ($totalCost > 0 && $this->total > 0) {
            $profit = $this->total - $totalCost;
            return round(($profit / $this->total) * 100, 2);
        }
        return null;
    }

    /**
     * Check if order is completed
     */
    public function getIsCompletedAttribute(): bool
    {
        return $this->status === 'delivered';
    }

    /**
     * Check if order is cancelled
     */
    public function getIsCancelledAttribute(): bool
    {
        return in_array($this->status, ['cancelled', 'refunded']);
    }

    /**
     * Check if order can be cancelled
     */
    public function getCanBeCancelledAttribute(): bool
    {
        return !in_array($this->status, ['delivered', 'cancelled', 'refunded']);
    }

    /**
     * Get status badge color for UI
     */
    public function getStatusColorAttribute(): string
    {
        return match ($this->status) {
            'pending' => 'yellow',
            'confirmed' => 'blue',
            'processing', 'packed' => 'purple',
            'shipped' => 'indigo',
            'delivered' => 'green',
            'cancelled', 'refunded' => 'red',
            default => 'gray',
        };
    }

    /**
     * Get payment status badge color
     */
    public function getPaymentColorAttribute(): string
    {
        return match ($this->payment_status) {
            'paid' => 'green',
            'pending' => 'yellow',
            'failed', 'refunded' => 'red',
            default => 'gray',
        };
    }

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function channel()
    {
        return $this->belongsTo(SalesChannel::class, 'channel_id');
    }

    public function staff()
    {
        return $this->belongsTo(User::class, 'assigned_staff_id');
    }

    public function affiliate()
    {
        return $this->belongsTo(User::class, 'affiliate_id');
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function commissionTransactions()
    {
        return $this->hasMany(CommissionTransaction::class);
    }

    /*
    |--------------------------------------------------------------------------
    | Helper Methods
    |--------------------------------------------------------------------------
    */

    /**
     * Generate unique order number
     */
    public static function generateOrderNumber(): string
    {
        $timestamp = date('YmdHis');
        $random = strtoupper(substr(md5(uniqid(rand(), true)), 0, 6));
        return "ORD-{$timestamp}-{$random}";
    }

    /**
     * Check if order status can transition to new status
     */
    public function canTransitionTo(string $newStatus): bool
    {
        $validTransitions = [
            'pending' => ['confirmed', 'cancelled'],
            'confirmed' => ['processing', 'cancelled'],
            'processing' => ['packed', 'cancelled'],
            'packed' => ['shipped', 'cancelled'],
            'shipped' => ['delivered', 'refunded'],
            'delivered' => ['refunded'],
            'cancelled' => [],
            'refunded' => [],
        ];

        return in_array($newStatus, $validTransitions[$this->status] ?? []);
    }

    /**
     * Get days since order creation
     */
    public function getDaysOld(): int
    {
        return $this->created_at->diffInDays(now());
    }

    /**
     * Check if order is overdue (based on status)
     */
    public function isOverdue(): bool
    {
        $maxDays = [
            'pending' => 1,
            'confirmed' => 2,
            'processing' => 3,
            'packed' => 1,
            'shipped' => 7,
        ];

        $limit = $maxDays[$this->status] ?? 999;
        return $this->getDaysOld() > $limit;
    }
}
