<?php

require __DIR__ . '/../../../vendor/autoload.php';

$app = require_once __DIR__ . '/../../../bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = \App\Models\User::where('email', 'admin@ecommerce.com')->first();

if (!$user) {
    echo "User not found!\n";
    exit(1);
}

echo "User found: " . $user->email . "\n";
echo "Stored password hash: " . $user->password . "\n";

if (password_verify('admin123', $user->password)) {
    echo "Password verification successful!\n";
} else {
    echo "Password verification FAILED!\n";
    
    // Debug info
    $newHash = password_hash('admin123', PASSWORD_BCRYPT);
    echo "New hash for 'admin123': " . $newHash . "\n";
}

