<?php

require __DIR__ . '/../../../vendor/autoload.php';

$app = require_once __DIR__ . '/../../../bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Add a fresh notification for Admin (ID: 1)
$id = \DB::table('notifications')->insertGetId([
    'user_id' => 1,
    'title' => '🔔 Test Notification ' . date('H:i:s'),
    'message' => 'This is a real-time test notification triggered at ' . date('Y-m-d H:i:s'),
    'type' => 'info',
    'is_read' => false,
    'created_at' => now(),
    'updated_at' => now()
]);

echo "Notification created with ID: $id\n";
echo "Wait 5 seconds for the web UI to poll and display it!\n";

