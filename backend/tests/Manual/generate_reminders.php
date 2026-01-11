<?php

require __DIR__ . '/../../../vendor/autoload.php';

$app = require_once __DIR__ . '/../../../bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Clear existing notifications for Admin (User 1) to see clearly
\DB::table('notifications')->where('user_id', 1)->delete();

echo "Generating fresh reminders...\n";

// 1. Simulate a Low Stock Reminder
\App\Models\Notification::create([
    'user_id' => 1,
    'title' => '⚠️ Action Required: Low Stock',
    'message' => 'Bluetooth Speaker has only 2 units left. Please restock soon.',
    'type' => 'danger',
    'is_read' => false,
    'action_url' => '/products'
]);

// 2. Simulate a Payout Reminder
\App\Models\Notification::create([
    'user_id' => 1,
    'title' => '💰 Payout Reminder',
    'message' => 'There are 5 approved commissions waiting for payment processing.',
    'type' => 'warning',
    'is_read' => false,
    'action_url' => '/commissions'
]);

// 3. Simulate an Order Assignment Reminder
\App\Models\Notification::create([
    'user_id' => 1,
    'title' => '📦 New Order Assignment',
    'message' => 'You have been assigned 3 new pending orders today.',
    'type' => 'info',
    'is_read' => false,
    'action_url' => '/orders'
]);

echo "Done! Check your Dashboard Action Center and Notification Bell.\n";

