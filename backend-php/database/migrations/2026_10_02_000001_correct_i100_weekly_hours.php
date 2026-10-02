<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        $contrattoIds = DB::table('contratti')
            ->where('codice_cnel', 'I100')
            ->pluck('id');

        DB::table('contratti')
            ->whereIn('id', $contrattoIds)
            ->update([
                'ore_settimanali_teoriche' => 39.00,
                'updated_at' => $now,
            ]);

        DB::table('regole_calcolo_contratto')
            ->whereIn('contratto_id', $contrattoIds)
            ->update([
                'ore_settimanali_teoriche' => 39.00,
                'updated_at' => $now,
            ]);

        $marcoId = DB::table('users')
            ->where('name', 'Marco Gialli')
            ->value('id');

        if ($marcoId) {
            $dipendenteId = DB::table('dipendenti')
                ->where('user_id', $marcoId)
                ->value('id');

            if ($dipendenteId) {
                DB::table('dipendenti')
                    ->where('id', $dipendenteId)
                    ->update([
                        'ore_settimanali' => 29.25,
                        'updated_at' => $now,
                    ]);

                DB::table('dipendente_orari_settimanali')
                    ->where('dipendente_id', $dipendenteId)
                    ->whereIn('giorno_settimana', [1, 2, 3, 4, 5, 6])
                    ->update([
                        'ore_giornaliere_previste' => 4.875,
                        'updated_at' => $now,
                    ]);
            }
        }
    }

    public function down(): void
    {
        $now = now();

        $contrattoIds = DB::table('contratti')
            ->where('codice_cnel', 'I100')
            ->pluck('id');

        DB::table('contratti')
            ->whereIn('id', $contrattoIds)
            ->update([
                'ore_settimanali_teoriche' => 40.00,
                'updated_at' => $now,
            ]);

        DB::table('regole_calcolo_contratto')
            ->whereIn('contratto_id', $contrattoIds)
            ->update([
                'ore_settimanali_teoriche' => 40.00,
                'updated_at' => $now,
            ]);
    }
};
