<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ApiLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'channel_id',
        'endpoint',
        'method',
        'request_payload',
        'response_payload',
        'status_code',
        'success',
        'error_message',
        'execution_time'
    ];

    protected $casts = [
        'success' => 'boolean',
    ];

    public function salesChannel()
    {
        return $this->belongsTo(SalesChannel::class, 'channel_id');
    }
}
