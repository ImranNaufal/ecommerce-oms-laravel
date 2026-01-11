<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number', 50)->unique();
            $table->unsignedBigInteger('customer_id');
            $table->unsignedBigInteger('channel_id');
            $table->unsignedBigInteger('assigned_staff_id')->nullable();
            $table->unsignedBigInteger('affiliate_id')->nullable();
            
            $table->decimal('subtotal', 10, 2);
            $table->decimal('discount', 10, 2)->default(0.00);
            $table->decimal('shipping_fee', 10, 2)->default(0.00);
            $table->decimal('tax', 10, 2)->default(0.00);
            $table->decimal('total', 10, 2);
            
            $table->decimal('staff_commission', 10, 2)->default(0.00);
            $table->decimal('affiliate_commission', 10, 2)->default(0.00);
            // Stored generated column
            $table->decimal('total_commission', 10, 2)->storedAs('staff_commission + affiliate_commission');
            
            $table->enum('status', ['pending', 'confirmed', 'processing', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded'])->default('pending');
            $table->enum('payment_status', ['pending', 'paid', 'failed', 'refunded'])->default('pending');
            $table->enum('payment_method', ['cod', 'online_banking', 'credit_card', 'ewallet'])->default('cod');
            
            $table->text('shipping_address');
            $table->string('shipping_city', 50)->nullable();
            $table->string('shipping_state', 50)->nullable();
            $table->string('shipping_postal_code', 10)->nullable();
            $table->string('tracking_number', 100)->nullable();
            
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('packed_at')->nullable();
            $table->timestamp('shipped_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('restrict');
            $table->foreign('channel_id')->references('id')->on('sales_channels')->onDelete('restrict');
            $table->foreign('assigned_staff_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('affiliate_id')->references('id')->on('users')->onDelete('set null');
            
            $table->index('order_number');
            $table->index('customer_id');
            $table->index('status');
            $table->index('payment_status');
            $table->index('assigned_staff_id');
            $table->index('affiliate_id');
            $table->index('channel_id');
            $table->index(['status', 'assigned_staff_id']);
            $table->index(['affiliate_id', 'status', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};