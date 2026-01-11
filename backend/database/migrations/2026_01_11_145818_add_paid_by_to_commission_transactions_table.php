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
        Schema::table('commission_transactions', function (Blueprint $table) {
            $table->unsignedBigInteger('paid_by')->nullable()->after('approved_at');
            $table->foreign('paid_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('commission_transactions', function (Blueprint $table) {
            $table->dropForeign(['paid_by']);
            $table->dropColumn('paid_by');
        });
    }
};
