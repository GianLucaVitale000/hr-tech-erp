<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $marcoId = DB::table('users')
            ->where('name', 'Marco Gialli')
            ->value('id');

        if (!$marcoId) {
            return;
        }

        $dipendenteId = DB::table('dipendenti')
            ->where('user_id', $marcoId)
            ->value('id');

        if (!$dipendenteId) {
            return;
        }

        $now = now();

        DB::table('dipendente_orari_settimanali')
            ->where('dipendente_id', $dipendenteId)
            ->whereIn('giorno_settimana', [1, 2, 3, 4, 5])
            ->update([
                'ore_giornaliere_previste' => 4.88,
                'updated_at' => $now,
            ]);

        DB::table('dipendente_orari_settimanali')
            ->where('dipendente_id', $dipendenteId)
            ->where('giorno_settimana', 6)
            ->update([
                'ore_giornaliere_previste' => 4.85,
                'updated_at' => $now,
            ]);
    }

    public function down(): void
    {
        $marcoId = DB::table('users')
            ->where('name', 'Marco Gialli')
            ->value('id');

        if (!$marcoId) {
            return;
        }

        $dipendenteId = DB::table('dipendenti')
            ->where('user_id', $marcoId)
            ->value('id');

        if (!$dipendenteId) {
            return;
        }

        DB::table('dipendente_orari_settimanali')
            ->where('dipendente_id', $dipendenteId)
            ->whereIn('giorno_settimana', [1, 2, 3, 4, 5, 6])
            ->update(['ore_giornaliere_previste' => 4.88]);
    }
};
