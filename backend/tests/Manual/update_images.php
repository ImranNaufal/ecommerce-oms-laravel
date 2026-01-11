<?php

require __DIR__ . '/../../../vendor/autoload.php';

$app = require_once __DIR__ . '/../../../bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Image URLs
$headphoneImg = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80';
$speakerImg = 'https://images.unsplash.com/photo-1608156639585-b3a032ef9689?w=500&q=80';

// Update Wireless Headphones
$headphoneUpdated = \DB::table('products')
    ->where('name', 'Wireless Headphones')
    ->update(['image_url' => $headphoneImg]);

// Update Bluetooth Speaker
$speakerUpdated = \DB::table('products')
    ->where('name', 'Bluetooth Speaker')
    ->update(['image_url' => $speakerImg]);

echo "Headphones updated: " . ($headphoneUpdated ? 'Yes' : 'No') . "\n";
echo "Speaker updated: " . ($speakerUpdated ? 'Yes' : 'No') . "\n";
