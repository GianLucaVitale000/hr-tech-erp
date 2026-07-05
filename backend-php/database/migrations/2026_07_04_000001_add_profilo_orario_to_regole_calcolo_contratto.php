<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Aggiunge i campi per il profilo orario e crea la tabella pivot
     * per l'associazione tra regole di calcolo e dipendenti
     */
    public function up(): void
    {
        Schema::table('regole_calcolo_contratto', function (Blueprint $table) {
            $table->text('descrizione')->nullable()->after('contratto_id');
        });

        // Crea tabella pivot per associazione molti-a-molti
        Schema::create('dipendente_regola_calcolo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dipendente_id')->constrained('dipendenti')->onDelete('cascade');
            $table->foreignId('regola_calcolo_contratto_id')->constrained('regole_calcolo_contratto')->onDelete('cascade');
            $table->timestamps();

            // Indici per ottimizzare le query
            $table->index('dipendente_id');
            $table->index('regola_calcolo_contratto_id');

            // Assicura unicità: un dipendente può avere una sola regola di calcolo attiva
            $table->unique(['dipendente_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dipendente_regola_calcolo');

        Schema::table('regole_calcolo_contratto', function (Blueprint $table) {
            $table->dropColumn(['descrizione']);
        });
    }
};
