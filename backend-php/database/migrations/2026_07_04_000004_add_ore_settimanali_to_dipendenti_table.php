<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Aggiunge il campo ore_settimanali ai dipendenti per memorizzare
     * il profilo orario specifico (sovrascrive le ore settimanali teoriche del CCNL)
     */
    public function up(): void
    {
        Schema::table('dipendenti', function (Blueprint $table) {
            $table->decimal('ore_settimanali', 5, 2)->nullable()->after('percentuale_part_time')->comment('Ore settimanali del profilo orario specifico del dipendente');
        });
    }

    public function down(): void
    {
        Schema::table('dipendenti', function (Blueprint $table) {
            $table->dropColumn(['ore_settimanali']);
        });
    }
};
