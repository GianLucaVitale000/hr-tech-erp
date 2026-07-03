<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Aggiungi cassa_integrazione all'enum causale
        DB::statement("ALTER TABLE presenze MODIFY COLUMN causale ENUM('lavoro','ferie','permesso_rol','malattia','maternita','infortunio','assemblea','sciopero','cassa_integrazione') NOT NULL DEFAULT 'lavoro'");
        
        // Aggiungi i nuovi campi per cassa integrazione
        Schema::table('presenze', function (Blueprint $table) {
            $table->date('data_inizio_cassa_integrazione')->nullable();
            $table->date('data_fine_cassa_integrazione')->nullable();
            $table->decimal('percentuale_cassa_integrazione', 5, 2)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Rimuovi i campi per cassa integrazione
        Schema::table('presenze', function (Blueprint $table) {
            $table->dropColumn(['data_inizio_cassa_integrazione', 'data_fine_cassa_integrazione', 'percentuale_cassa_integrazione']);
        });
        
        // Revert enum causale (rimuovi cassa_integrazione)
        DB::statement("ALTER TABLE presenze MODIFY COLUMN causale ENUM('lavoro','ferie','permesso_rol','malattia','maternita','infortunio','assemblea','sciopero') NOT NULL DEFAULT 'lavoro'");
    }
};
