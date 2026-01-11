<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Tymon\JWTAuth\Contracts\JWTSubject;
use Illuminate\Support\Facades\Hash;

/**
 * User Model
 * 
 * Represents system users (Admin, Staff, Affiliate)
 * Implements JWT authentication
 * 
 * IMPORTANT: This model works with existing database schema from Node.js backend
 * Table: users (password field uses bcrypt, not Laravel's default password_hash)
 */
class User extends Authenticatable implements JWTSubject
{
    use HasFactory;

    // Table name (explicit)
    protected $table = 'users';

    // Primary key
    protected $primaryKey = 'id';

    protected $fillable = [
        'username',
        'email',
        'password',
        'full_name',
        'role',
        'status',
        'phone'
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    // Override to use bcrypt password verification (compatible with Node.js backend)
    public function getAuthPassword()
    {
        return $this->password;
    }

    // JWT Methods
    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims()
    {
        return [
            'role' => $this->role,
            'email' => $this->email,
            'id' => $this->id
        ];
    }

    // Relationships
    public function orders()
    {
        return $this->hasMany(Order::class, 'assigned_staff_id');
    }

    public function affiliateOrders()
    {
        return $this->hasMany(Order::class, 'affiliate_id');
    }

    public function commissionTransactions()
    {
        return $this->hasMany(CommissionTransaction::class);
    }
}
