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
        Schema::table('presenze', function (Blueprint $table) {
            $table->renameColumn('ore_supplementari', 'ore_eccedenti');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('presenze', function (Blueprint $table) {
            $table->renameColumn('ore_eccedenti', 'ore_supplementari');
        });
    }
};
