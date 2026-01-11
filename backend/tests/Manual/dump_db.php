<?php

require __DIR__ . '/../../../vendor/autoload.php';

$app = require_once __DIR__ . '/../../../bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$orders = \DB::table('orders')->get();
echo "Total orders: " . $orders->count() . "\n";
foreach ($orders as $order) {
    echo "ID: {$order->id}, Number: {$order->order_number}, Status: {$order->status}, Customer ID: {$order->customer_id}, Staff ID: {$order->assigned_staff_id}\n";
}

$customers = \DB::table('customers')->get();
echo "Total customers: " . $customers->count() . "\n";
foreach ($customers as $customer) {
    echo "ID: {$customer->id}, Name: {$customer->full_name}, Email: {$customer->email}\n";
}

$channels = \DB::table('sales_channels')->get();
echo "Total channels: " . $channels->count() . "\n";
foreach ($channels as $channel) {
    echo "ID: {$channel->id}, Name: {$channel->name}, Type: {$channel->type}\n";
}

$items = \DB::table('order_items')->get();
echo "Total order items: " . $items->count() . "\n";

$notifications = \DB::table('notifications')->get();
echo "Total notifications: " . $notifications->count() . "\n";
foreach ($notifications as $n) {
    echo "User ID: {$n->user_id}, Title: {$n->title}, Read: {$n->is_read}\n";
}
foreach ($items as $item) {
    echo "Order ID: {$item->order_id}, Product ID: {$item->product_id}, Name: {$item->product_name}\n";
}

