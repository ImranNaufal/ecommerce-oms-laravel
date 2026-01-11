<?php

require __DIR__ . '/../../../vendor/autoload.php';

$app = require_once __DIR__ . '/../../../bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Create a dummy product for deletion
$id = \DB::table('products')->insertGetId([
    'category_id' => 1,
    'sku' => 'TEST-DEL-001',
    'name' => 'Delete Me',
    'price' => 10.00,
    'stock_quantity' => 10,
    'status' => 'active',
    'created_at' => now(),
    'updated_at' => now()
]);

echo "Created product with ID: $id\n";

$request = \Illuminate\Http\Request::create("/api/products/$id", 'DELETE');
$controller = new \App\Http\Controllers\ProductController();
$response = $controller->destroy($id);

echo "Response status: " . $response->getStatusCode() . "\n";
echo "Response content: " . $response->getContent() . "\n";

// Verify deletion
$exists = \DB::table('products')->where('id', $id)->exists();
echo "Product exists after delete: " . ($exists ? 'Yes' : 'No') . "\n";
