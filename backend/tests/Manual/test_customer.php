<?php

require __DIR__ . '/../../../vendor/autoload.php';

$app = require_once __DIR__ . '/../../../bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$data = [
    'full_name' => 'Manual Test Script',
    'email' => 'manual3@example.com',
    'phone' => '0123456789',
    'address' => 'Test Address'
];

$request = \Illuminate\Http\Request::create('/api/customers', 'POST', $data);
$controller = new \App\Http\Controllers\CustomerController();
$response = $controller->store($request);

echo $response->getContent() . "\n";

