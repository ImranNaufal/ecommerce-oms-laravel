<?php

require __DIR__ . '/../../../vendor/autoload.php';

$app = require_once __DIR__ . '/../../../bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// 1. Create a dummy product
$sku = 'TEST-SAFE-' . time();
$productId = \DB::table('products')->insertGetId([
    'category_id' => 1,
    'sku' => $sku,
    'name' => 'Safe Product',
    'price' => 50.00,
    'stock_quantity' => 10,
    'status' => 'active',
    'created_at' => now(),
    'updated_at' => now()
]);

// 2. Create a dummy order item linked to this product
// We need an order first (using ID 1 which exists from seed)
\DB::table('order_items')->insert([
    'order_id' => 1,
    'product_id' => $productId,
    'product_name' => 'Safe Product',
    'sku' => $sku,
    'price' => 50.00,
    'quantity' => 1
]);

echo "Created product ID: $productId with linked order\n";

// 3. Attempt to delete
$request = \Illuminate\Http\Request::create("/api/products/$productId", 'DELETE');
$controller = new \App\Http\Controllers\ProductController();
$response = $controller->destroy($productId);

echo "Response status: " . $response->getStatusCode() . "\n";
echo "Response content: " . $response->getContent() . "\n";

// 4. Verify persistence
$exists = \DB::table('products')->where('id', $productId)->exists();
echo "Product exists after delete attempt: " . ($exists ? 'Yes' : 'No') . "\n";

// Cleanup
\DB::table('order_items')->where('product_id', $productId)->delete();
\DB::table('products')->where('id', $productId)->delete();
