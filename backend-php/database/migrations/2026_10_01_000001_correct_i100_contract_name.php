<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('contratti')
            ->where('codice_cnel', 'I100')
            ->update([
                'nome_contratto' => 'CCNL logistica, trasporto merci e spedizione (personale non dirigente)',
            ]);
    }

    public function down(): void
    {
        DB::table('contratti')
            ->where('codice_cnel', 'I100')
            ->where('nome_contratto', 'CCNL logistica, trasporto merci e spedizione (personale non dirigente)')
            ->update([
                'nome_contratto' => 'Contratto Commercio Terziario',
            ]);
    }
};