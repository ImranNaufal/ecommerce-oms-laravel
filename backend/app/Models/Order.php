<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

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
        'confirmed_at' => 'datetime',
        'packed_at' => 'datetime',
        'shipped_at' => 'datetime',
        'delivered_at' => 'datetime',
    ];

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
}
