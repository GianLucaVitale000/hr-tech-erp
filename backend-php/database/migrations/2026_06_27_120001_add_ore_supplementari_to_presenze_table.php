<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('presenze', function (Blueprint $table) {
            // Ore supplementari: ore oltre il limite ordinario ma entro il limite supplementari
            // Per part-time, queste sono le ore che superano l'orario previsto per quel giorno
            $table->decimal('ore_supplementari', 5, 2)->nullable()->after('ore_straordinarie');
        });
    }

    public function down(): void
    {
        Schema::table('presenze', function (Blueprint $table) {
            $table->dropColumn('ore_supplementari');
        });
    }
};
