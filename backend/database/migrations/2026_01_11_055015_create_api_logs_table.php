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
        Schema::create('api_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('channel_id')->nullable();
            $table->string('endpoint', 255);
            $table->enum('method', ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']);
            $table->text('request_payload')->nullable();
            $table->text('response_payload')->nullable();
            $table->integer('status_code')->nullable();
            $table->boolean('success')->default(true);
            $table->text('error_message')->nullable();
            $table->integer('execution_time')->nullable()->comment('milliseconds');
            $table->timestamps();

            $table->foreign('channel_id')->references('id')->on('sales_channels')->onDelete('set null');
            $table->index('channel_id');
            $table->index('success');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('api_logs');
    }
};