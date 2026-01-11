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
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('email', 100)->unique();
            $table->string('full_name', 100);
            $table->string('phone', 20)->nullable();
            $table->text('address')->nullable();
            $table->string('city', 50)->nullable();
            $table->string('state', 50)->nullable();
            $table->string('postal_code', 10)->nullable();
            $table->string('country', 50)->default('Malaysia');
            $table->enum('customer_type', ['retail', 'wholesale', 'vip'])->default('retail');
            $table->integer('total_orders')->default(0);
            $table->decimal('total_spent', 12, 2)->default(0.00);
            $table->timestamps();

            $table->index('email');
            $table->index('customer_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};