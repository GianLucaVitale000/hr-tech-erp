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
            ->update(['ore_settimanali_teoriche' => 40.00]);

        foreach ($contrattoIds as $contrattoId) {
            $updated = DB::table('regole_calcolo_contratto')
                ->where('contratto_id', $contrattoId)
                ->update([
                    'ore_settimanali_teoriche' => 40.00,
                    'updated_at' => $now,
                ]);

            if ($updated === 0) {
                DB::table('regole_calcolo_contratto')->insert([
                    'contratto_id' => $contrattoId,
                    'ore_settimanali_teoriche' => 40.00,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
    }

    public function down(): void
    {
        $contrattoIds = DB::table('contratti')
            ->where('codice_cnel', 'I100')
            ->pluck('id');

        DB::table('regole_calcolo_contratto')
            ->whereIn('contratto_id', $contrattoIds)
            ->delete();

        DB::table('contratti')
            ->whereIn('id', $contrattoIds)
            ->update(['ore_settimanali_teoriche' => 39.00]);
    }
};