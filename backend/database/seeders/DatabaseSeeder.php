<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        // Create test user
        $user = User::factory()->create([
            'email' => 'admin@ecommerce.com',
            'password' => bcrypt('admin123'),
            'role' => 'admin',
            'username' => 'admin',
            'full_name' => 'Admin User',
            'status' => 'active'
        ]);

        // Create Categories
        $electronics = \App\Models\Category::create(['name' => 'Electronics', 'slug' => 'electronics']);
        $clothing = \App\Models\Category::create(['name' => 'Clothing', 'slug' => 'clothing']);

        // Create Products
        \App\Models\Product::create([
            'name' => 'Wireless Headphones',
            'sku' => 'ELEC-001',
            'price' => 199.99,
            'cost_price' => 80.00,
            'stock_quantity' => 50,
            'category_id' => $electronics->id,
            'description' => 'High quality wireless headphones',
            'image_url' => 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80',
            'status' => 'active'
        ]);

        \App\Models\Product::create([
            'name' => 'Bluetooth Speaker',
            'sku' => 'ELEC-002',
            'price' => 89.99,
            'cost_price' => 40.00,
            'stock_quantity' => 30,
            'category_id' => $electronics->id,
            'description' => 'Portable bluetooth speaker',
            'image_url' => 'https://images.unsplash.com/photo-1608156639585-b3a032ef9689?w=500&q=80',
            'status' => 'active'
        ]);

        // Create Sales Channels
        \App\Models\SalesChannel::create([
            'name' => 'Website',
            'type' => 'website',
            'api_key' => 'internal',
            'is_active' => true
        ]);

        \App\Models\SalesChannel::create([
            'name' => 'Shopee Store',
            'type' => 'shopee',
            'is_active' => true
        ]);

        // Create Default Customer
        \Illuminate\Support\Facades\DB::table('customers')->insert([
            'email' => 'walkin@example.com',
            'full_name' => 'Walk-in Customer',
            'phone' => '0123456789',
            'address' => 'Shop Counter',
            'customer_type' => 'retail',
            'created_at' => now(),
            'updated_at' => now()
        ]);

        // Create More Customers
        for ($i = 1; $i <= 5; $i++) {
            \Illuminate\Support\Facades\DB::table('customers')->insert([
                'email' => "customer{$i}@example.com",
                'full_name' => fake()->name(),
                'phone' => fake()->phoneNumber(),
                'address' => fake()->address(),
                'customer_type' => fake()->randomElement(['retail', 'wholesale', 'vip']),
                'created_at' => now()->subDays(rand(1, 60)),
                'updated_at' => now()
            ]);
        }

        // Create some staff and affiliates for commissions
        echo "Creating staff and affiliates...\n";
        $staff1 = User::factory()->create(['full_name' => 'Staff Ali', 'role' => 'staff', 'username' => 'staff1']);
        $staff2 = User::factory()->create(['full_name' => 'Staff Siti', 'role' => 'staff', 'username' => 'staff2']);
        $affiliate1 = User::factory()->create(['full_name' => 'Affiliate John', 'role' => 'affiliate', 'username' => 'affiliate1']);
        
        // Add commission configs
        $agents = [$staff1, $staff2, $affiliate1];
        foreach ($agents as $agent) {
            \Illuminate\Support\Facades\DB::table('commission_configs')->insert([
                'user_id' => $agent->id,
                'commission_type' => 'percentage',
                'commission_value' => ($agent->role === 'staff' ? 2.5 : 5.0),
                'tier' => 'gold',
                'effective_from' => now()->subDays(90),
                'is_active' => true,
                'created_at' => now()
            ]);
        }

        // --- HISTORICAL DATA SEEDING (Last 30 Days) ---
        echo "Seeding historical orders and commissions...\n";
        
        $products = \App\Models\Product::all();
        $customers = \Illuminate\Support\Facades\DB::table('customers')->pluck('id')->toArray();
        $channels = \App\Models\SalesChannel::pluck('id')->toArray();

        for ($day = 30; $day >= 0; $day--) {
            $date = now()->subDays($day);
            $ordersCount = rand(2, 6);
            
            for ($o = 0; $o < $ordersCount; $o++) {
                $product = $products->random();
                $qty = rand(1, 3);
                $subtotal = $product->price * $qty;
                $tax = $subtotal * 0.06;
                $shipping = rand(5, 15);
                $total = $subtotal + $tax + $shipping;
                
                $agent = fake()->randomElement($agents);
                $orderNumber = "ORD-" . $date->format('Ymd') . "-" . strtoupper(\Illuminate\Support\Str::random(6));
                
                $orderId = \Illuminate\Support\Facades\DB::table('orders')->insertGetId([
                    'order_number' => $orderNumber,
                    'customer_id' => fake()->randomElement($customers),
                    'channel_id' => fake()->randomElement($channels),
                    'assigned_staff_id' => ($agent->role === 'staff' ? $agent->id : $user->id),
                    'affiliate_id' => ($agent->role === 'affiliate' ? $agent->id : null),
                    'subtotal' => $subtotal,
                    'tax' => $tax,
                    'shipping_fee' => $shipping,
                    'total' => $total,
                    'status' => fake()->randomElement(['pending', 'processing', 'shipped', 'delivered']),
                    'payment_status' => fake()->randomElement(['paid', 'paid', 'paid', 'pending']),
                    'payment_method' => fake()->randomElement(['online_banking', 'ewallet', 'credit_card']),
                    'shipping_address' => fake()->address(),
                    'created_at' => $date->copy()->addHours(rand(8, 20)),
                    'updated_at' => $date
                ]);

                // Create Order Items
                \Illuminate\Support\Facades\DB::table('order_items')->insert([
                    'order_id' => $orderId,
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'sku' => $product->sku,
                    'quantity' => $qty,
                    'price' => $product->price,
                    'cost_price' => $product->cost_price
                ]);

                // Create Commission Transaction
                $commRate = ($agent->role === 'staff' ? 2.5 : 5.0);
                $commAmount = ($total * $commRate) / 100;
                
                \Illuminate\Support\Facades\DB::table('commission_transactions')->insert([
                    'user_id' => $agent->id,
                    'order_id' => $orderId,
                    'commission_type' => $agent->role,
                    'amount' => $commAmount,
                    'percentage' => $commRate,
                    'order_total' => $total,
                    'status' => fake()->randomElement(['pending', 'approved', 'paid']),
                    'created_at' => $date,
                    'updated_at' => $date
                ]);
            }
        }

        // --- API LOGS SEEDING ---
        echo "Seeding sample API logs...\n";
        $channels = \App\Models\SalesChannel::all();
        foreach ($channels as $channel) {
            // Add 3 success logs per channel
            for ($i = 0; $i < 3; $i++) {
                \Illuminate\Support\Facades\DB::table('api_logs')->insert([
                    'channel_id' => $channel->id,
                    'endpoint' => "/v2/orders/sync",
                    'method' => 'GET',
                    'request_payload' => json_encode(['page' => $i + 1, 'sync_type' => 'delta']),
                    'response_payload' => json_encode(['success' => true, 'orders_found' => rand(5, 20), 'synced_at' => now()]),
                    'success' => true,
                    'created_at' => now()->subHours(rand(1, 48))
                ]);
            }

            // Add 1 error log for external channels
            if ($channel->type !== 'website') {
                \Illuminate\Support\Facades\DB::table('api_logs')->insert([
                    'channel_id' => $channel->id,
                    'endpoint' => "/v2/auth/token",
                    'method' => 'POST',
                    'request_payload' => json_encode(['grant_type' => 'refresh_token']),
                    'response_payload' => json_encode(['error' => 'invalid_client', 'message' => 'API Key expired']),
                    'error_message' => '401 Unauthorized: API Key has expired. Please re-authenticate.',
                    'success' => false,
                    'created_at' => now()->subMinutes(rand(10, 60))
                ]);
            }
        }

        // --- NOTIFICATIONS SEEDING ---
        echo "Seeding notifications for Admin...\n";
        \Illuminate\Support\Facades\DB::table('notifications')->insert([
            [
                'user_id' => $user->id,
                'title' => 'Stock Alert!',
                'message' => 'Wireless Headphones are running low on stock (5 left).',
                'type' => 'warning',
                'is_read' => false,
                'created_at' => now()->subMinutes(10),
                'updated_at' => now()
            ],
            [
                'user_id' => $user->id,
                'title' => 'New Order Received',
                'message' => 'Order #ORD-20260111-X123 has been successfully synced from Shopee.',
                'type' => 'success',
                'is_read' => false,
                'created_at' => now()->subMinutes(30),
                'updated_at' => now()
            ],
            [
                'user_id' => $user->id,
                'title' => 'System Update',
                'message' => 'New multi-threading optimizations have been applied to the server.',
                'type' => 'info',
                'is_read' => true,
                'created_at' => now()->subHours(2),
                'updated_at' => now()
            ]
        ]);

        echo "Historical data and commissions seeded successfully!\n";
    }
}
