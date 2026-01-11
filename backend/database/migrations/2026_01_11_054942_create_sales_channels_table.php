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
        Schema::create('sales_channels', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->enum('type', ['website', 'shopee', 'lazada', 'tiktok', 'facebook', 'whatsapp', 'other']);
            $table->string('api_endpoint', 255)->nullable();
            $table->string('api_key', 255)->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sync_frequency')->default(15)->comment('minutes');
            $table->timestamp('last_sync_at')->nullable();
            $table->timestamps();

            $table->index('type');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales_channels');
    }
};