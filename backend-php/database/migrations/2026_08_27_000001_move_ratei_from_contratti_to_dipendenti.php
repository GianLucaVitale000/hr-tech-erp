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
        // Aggiungi i campi ratei alla tabella dipendenti
        Schema::table('dipendenti', function (Blueprint $table) {
            $table->decimal('rateo_mensile_ferie', 8, 5)->nullable()->after('percentuale_part_time');
            $table->decimal('rateo_mensile_permessi_rol', 8, 5)->nullable()->after('rateo_mensile_ferie');
            $table->decimal('rateo_mensile_ex_festivita', 8, 5)->nullable()->after('rateo_mensile_permessi_rol');
        });

        // Copia i dati dai contratti ai dipendenti (migration data)
        // Questo viene fatto in un seeder separato o tramite script
        // Per la migration, rimuoviamo solo i campi da contratti dopo averli aggiunti a dipendenti
        
        // Rimuovi i campi ratei dalla tabella contratti
        Schema::table('contratti', function (Blueprint $table) {
            $table->dropColumn(['rateo_mensile_ferie', 'rateo_mensile_permessi_rol', 'rateo_mensile_ex_festivita']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Aggiungi i campi ratei a contratti
        Schema::table('contratti', function (Blueprint $table) {
            $table->decimal('rateo_mensile_ferie', 8, 5)->nullable()->after('ore_settimanali_teoriche');
            $table->decimal('rateo_mensile_permessi_rol', 8, 5)->nullable()->after('rateo_mensile_ferie');
            $table->decimal('rateo_mensile_ex_festivita', 8, 5)->nullable()->after('rateo_mensile_permessi_rol');
        });

        // Rimuovi i campi ratei da dipendenti
        Schema::table('dipendenti', function (Blueprint $table) {
            $table->dropColumn(['rateo_mensile_ferie', 'rateo_mensile_permessi_rol', 'rateo_mensile_ex_festivita']);
        });
    }
};
