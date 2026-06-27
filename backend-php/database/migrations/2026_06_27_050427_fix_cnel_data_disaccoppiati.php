<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Corregge i dati disaccoppiati tra database e Open Data CNEL
     * per i contratti vigenti V71A, V71B, V713
     * 
     * Dati ufficiali da API CNEL (ARCHIVIO_CORRENTE, ultimoAccordoVigente=true):
     * - V71A: D=["FMPI"], S=["CONFINTESA","CONFINTESA SICUREZZA PRIVATA"]
     * - V71B: D=["FMPI"], S=["CONFINTESA"]
     * - V713: D=["CIU","ANCORS"], S=[]
     */
    public function up(): void
    {
        // V71A
        DB::table('contratti')
            ->where('codice_cnel', 'V71A')
            ->where('ultimo_accordo_vigente', true)
            ->update([
                'partiDatorialiFirmatarie' => json_encode(['FMPI']),
                'partiSindacaliFirmatarie' => json_encode(['CONFINTESA', 'CONFINTESA SICUREZZA PRIVATA']),
            ]);

        // V71B
        DB::table('contratti')
            ->where('codice_cnel', 'V71B')
            ->where('ultimo_accordo_vigente', true)
            ->update([
                'partiDatorialiFirmatarie' => json_encode(['FMPI']),
                'partiSindacaliFirmatarie' => json_encode(['CONFINTESA']),
            ]);

        // V713
        DB::table('contratti')
            ->where('codice_cnel', 'V713')
            ->where('ultimo_accordo_vigente', true)
            ->update([
                'partiDatorialiFirmatarie' => json_encode(['CIU', 'ANCORS']),
                'partiSindacaliFirmatarie' => json_encode([]),
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Non facciamo nulla in down
    }
};
