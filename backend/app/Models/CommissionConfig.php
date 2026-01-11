<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CommissionConfig extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'commission_type',
        'commission_value',
        'tier',
        'min_order_value',
        'is_active',
        'effective_from',
        'effective_until'
    ];

    protected $casts = [
        'commission_value' => 'decimal:2',
        'min_order_value' => 'decimal:2',
        'is_active' => 'boolean',
        'effective_from' => 'date',
        'effective_until' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
