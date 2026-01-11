<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalesChannel extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    public function orders()
    {
        return $this->hasMany(Order::class, 'channel_id');
    }

    public function apiLogs()
    {
        return $this->hasMany(ApiLog::class, 'channel_id');
    }
}