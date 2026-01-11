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
        Schema::create('automation_workflows', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->enum('trigger_type', ['order_created', 'payment_received', 'order_shipped', 'low_stock', 'scheduled']);
            $table->enum('action_type', ['send_email', 'update_inventory', 'create_commission', 'sync_to_channel', 'webhook']);
            $table->json('config')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_run_at')->nullable();
            $table->timestamps();

            $table->index('trigger_type');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('automation_workflows');
    }
};