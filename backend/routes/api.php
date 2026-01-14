<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\CommissionController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ChannelController;
use App\Http\Controllers\WebhookController;
use App\Http\Controllers\NotificationController;

/*
|--------------------------------------------------------------------------
| API Routes - E-commerce OMS
|--------------------------------------------------------------------------
|
| All routes are prefixed with /api
| Protected routes require JWT token authentication
|
*/

// Health Check
Route::get('/health', function () {
    return response()->json([
        'success' => true,
        'message' => 'E-commerce OMS Laravel API is running',
        'timestamp' => now()->toISOString(),
        'version' => '1.0.0'
    ]);
});

// Debug endpoint untuk test database
Route::get('/debug/users', function () {
    try {
        $users = \DB::table('users')->count();
        return response()->json([
            'success' => true,
            'message' => 'Database accessible',
            'user_count' => $users
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

// Test protected route dengan simple middleware
Route::middleware(['auth:api'])->get('/debug/protected', function () {
    try {
        $user = auth('api')->user();
        return response()->json([
            'success' => true,
            'message' => 'Protected route accessed successfully',
            'user' => $user ? [
                'id' => $user->id,
                'name' => $user->full_name,
                'role' => $user->role
            ] : null
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});

// Authentication Routes (Public)
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
    
    // Protected routes
    Route::middleware(['auth:api'])->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

// Protected Routes (Require Authentication)
Route::middleware('auth:api')->group(function () {
    
    // Products Management
    Route::prefix('products')->group(function () {
        Route::get('/', [ProductController::class, 'index']);
        Route::post('/', [ProductController::class, 'store']);
        Route::get('/{id}', [ProductController::class, 'show']);
        Route::put('/{id}', [ProductController::class, 'update']);
        Route::delete('/{id}', [ProductController::class, 'destroy']);
        Route::get('/categories/all', [ProductController::class, 'categories']);
        Route::get('/sku/next/{categoryId}', [ProductController::class, 'nextSKU']);
    });
    
    // Orders Management
    Route::prefix('orders')->group(function () {
        Route::get('/', [OrderController::class, 'index']);
        Route::post('/', [OrderController::class, 'store']);
        Route::get('/{id}', [OrderController::class, 'show']);
        Route::patch('/{id}/status', [OrderController::class, 'updateStatus'])->middleware('role:admin,staff');
        Route::patch('/{id}/payment', [OrderController::class, 'updatePayment'])->middleware('role:admin,staff');
    });
    
    // Customers Management
    Route::prefix('customers')->group(function () {
        Route::get('/', [CustomerController::class, 'index']);
        Route::post('/', [CustomerController::class, 'store']);
        Route::get('/{id}', [CustomerController::class, 'show']);
    });
    
    // Commission Management
    Route::prefix('commissions')->group(function () {
        Route::get('/summary', [CommissionController::class, 'summary']);
        Route::get('/transactions', [CommissionController::class, 'transactions']);
        Route::get('/leaderboard', [CommissionController::class, 'leaderboard']);
        Route::patch('/{id}/approve', [CommissionController::class, 'approve'])->middleware('role:admin');
        Route::patch('/{id}/paid', [CommissionController::class, 'markPaid'])->middleware('role:admin');
    });
    
    // Dashboard & Analytics
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    Route::get('/dashboard/sales-chart', [DashboardController::class, 'salesChart']);
    Route::get('/dashboard/activities', [DashboardController::class, 'recentActivities']);
    Route::get('/search', [DashboardController::class, 'search']);
    
    // Sales Channels
    Route::prefix('channels')->group(function () {
        Route::get('/', [ChannelController::class, 'index']);
        Route::put('/{id}', [ChannelController::class, 'update'])->middleware('role:admin');
        Route::post('/{id}/sync', [ChannelController::class, 'sync']);
        Route::get('/logs/all', [ChannelController::class, 'logs'])->middleware('role:admin');
    });

    // Notifications
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::patch('/read-all', [NotificationController::class, 'markAllRead']);
    });
});

// Webhooks (Public - External Marketplaces)
Route::prefix('webhooks')->group(function () {
    Route::post('/order/external', [WebhookController::class, 'injectOrder']);
    Route::post('/payment/confirmation', [WebhookController::class, 'paymentConfirmation']);
});
