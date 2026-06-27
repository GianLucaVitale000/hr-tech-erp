<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Corregge i dati del contratto CNEL H011 con i valori ufficiali Open Data
     * 
     * Dati originali da API CNEL (https://archiviocontrattiapi.cnel.it):
     * - codiceCcnl: H011
     * - partiDatorialiFirmatarie: ["CONFCOMMERCIO IMPRESE PER L'ITALIA"]
     * - partiSindacaliFirmatarie: ["CISL","CGIL","UIL","FILCAMS CGIL","UILTUCS UIL","FISASCAT CISL"]
     * - titoloCcnl: "CCNL per i dipendenti da aziende del Terziario della Distribuzione e dei Servizi"
     */
    public function up(): void
    {
        DB::table('contratti')
            ->where('codice_cnel', 'H011')
            ->update([
                'nome_contratto' => 'CCNL per i dipendenti da aziende del Terziario della Distribuzione e dei Servizi',
                'partiDatorialiFirmatarie' => json_encode(['CONFCOMMERCIO IMPRESE PER L\'ITALIA']),
                'partiSindacaliFirmatarie' => json_encode(['CISL', 'CGIL', 'UIL', 'FILCAMS CGIL', 'UILTUCS UIL', 'FISASCAT CISL']),
                'ultimo_accordo_vigente' => true,
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Non facciamo nulla in down, mantiene i dati attuali
    }
};
