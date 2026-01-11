<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AutomationWorkflow extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'trigger_type',
        'action_type',
        'config',
        'is_active',
        'last_run_at'
    ];

    protected $casts = [
        'config' => 'array',
        'is_active' => 'boolean',
        'last_run_at' => 'datetime',
    ];
}
