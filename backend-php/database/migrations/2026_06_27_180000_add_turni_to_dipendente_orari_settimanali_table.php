<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dipendente_orari_settimanali', function (Blueprint $table) {
            $table->time('turno1_dalle')->nullable()->after('ore_giornaliere_previste');
            $table->time('turno1_alle')->nullable()->after('turno1_dalle');
            $table->time('turno2_dalle')->nullable()->after('turno1_alle');
            $table->time('turno2_alle')->nullable()->after('turno2_dalle');
        });
    }

    public function down(): void
    {
        Schema::table('dipendente_orari_settimanali', function (Blueprint $table) {
            $table->dropColumn(['turno1_dalle', 'turno1_alle', 'turno2_dalle', 'turno2_alle']);
        });
    }
};
