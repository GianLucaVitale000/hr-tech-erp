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
        Schema::table('dipendenti', function (Blueprint $table) {
            // Percentuale di part-time: 100 = full-time, <100 = part-time
            // Esempio: 80 = 80% del monte ore contrattuale
            $table->decimal('percentuale_part_time', 5, 2)->default(100.00);
            
            // Numero di giorni lavorativi settimanali: 5 o 6
            // 5 = lun-ven (standard Metalmeccanici)
            // 6 = lun-sab (altri contratti con 6 giorni lavorativi)
            $table->tinyInteger('giorni_lavorativi_settimanali')->default(5);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dipendenti', function (Blueprint $table) {
            $table->dropColumn(['percentuale_part_time', 'giorni_lavorativi_settimanali']);
        });
    }
};
