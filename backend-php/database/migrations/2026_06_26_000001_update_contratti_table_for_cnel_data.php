<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Aggiorna la tabella contratti per separare i dati ufficiali CNEL dalle regole aziendali
     * Rimuove i campi aziendali e aggiunge i campi ufficiali dal CNEL
     */
    public function up(): void
    {
        Schema::table('contratti', function (Blueprint $table) {
            // Aggiungi i nuovi campi ufficiali CNEL
            $table->date('data_decorrenza')->nullable()->after('nome_contratto');
            $table->date('data_scadenza')->nullable()->after('data_decorrenza');
            $table->boolean('ultimo_accordo_vigente')->default(false)->after('data_scadenza');
            
            // Rimuovi i campi aziendali (verranno spostati in regole_calcolo_contratto)
            $table->dropColumn([
                'ore_settimanali_teoriche',
                'soglia_maggiorazione_1',
                'soglia_maggiorazione_2'
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('contratti', function (Blueprint $table) {
            // Revert: ricrea i campi aziendali
            $table->decimal('ore_settimanali_teoriche', 5, 2)->default(40);
            $table->decimal('soglia_maggiorazione_1', 5, 2)->nullable();
            $table->decimal('soglia_maggiorazione_2', 5, 2)->nullable();
            
            // Rimuovi i campi CNEL
            $table->dropColumn([
                'data_decorrenza',
                'data_scadenza',
                'ultimo_accordo_vigente'
            ]);
        });
    }
};
