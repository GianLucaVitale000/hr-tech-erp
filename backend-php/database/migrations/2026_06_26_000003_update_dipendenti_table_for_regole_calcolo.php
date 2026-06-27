<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Aggiorna la tabella dipendenti per puntare a regole_calcolo_contratto invece che contratti
     */
    public function up(): void
    {
        Schema::table('dipendenti', function (Blueprint $table) {
            // Aggiungi la nuova FK a regole_calcolo_contratto
            $table->foreignId('regola_calcolo_id')->nullable()->after('contratto_id')->constrained('regole_calcolo_contratto')->onDelete('set null');
            
            // Mantieni contratto_id per retrocompatibilita (puo essere rimosso in futuro)
            // Cambia il nome del vincolo per evitare conflitti
            $table->dropForeign(['contratto_id']);
        });
    }

    public function down(): void
    {
        Schema::table('dipendenti', function (Blueprint $table) {
            // Revert: ricrea il vincolo originale
            $table->foreign('contratto_id')->references('id')->on('contratti')->onDelete('set null');
            
            // Rimuovi la nuova FK
            $table->dropForeign(['regola_calcolo_id']);
            $table->dropColumn('regola_calcolo_id');
        });
    }
};
