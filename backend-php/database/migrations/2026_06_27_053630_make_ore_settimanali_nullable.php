<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Rende il campo ore_settimanali_teoriche nullable per permettere valori null
     */
    public function up(): void
    {
        Schema::table('regole_calcolo_contratto', function (Blueprint $table) {
            $table->decimal('ore_settimanali_teoriche', 5, 2)->nullable()->default(null)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('regole_calcolo_contratto', function (Blueprint $table) {
            $table->decimal('ore_settimanali_teoriche', 5, 2)->nullable(false)->default('40.00')->change();
        });
    }
};
