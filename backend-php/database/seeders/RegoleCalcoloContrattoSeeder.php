<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\RegolaCalcoloContratto;
use App\Models\Contratto;

class RegoleCalcoloContrattoSeeder extends Seeder
{
    /**
     * Seed delle regole di calcolo di default per i contratti principali
     * Queste regole vengono create solo se non esistono già
     */
    public function run(): void
    {
        // Metalmeccanica - Industria (C05A, Federmeccanica)
        // Standard: 40 ore settimanali
        $contrattoMetalmeccanica = Contratto::where('codice_cnel', 'C05A')->first();
        if ($contrattoMetalmeccanica && !RegolaCalcoloContratto::where('contratto_id', $contrattoMetalmeccanica->id)->exists()) {
            RegolaCalcoloContratto::create([
                'contratto_id' => $contrattoMetalmeccanica->id,
                'ore_settimanali_teoriche' => 40.00,
            ]);
        }

        // Metalmeccanica - PMI (C019)
        $contrattoMetalmeccanicaPMI = Contratto::where('codice_cnel', 'C019')->first();
        if ($contrattoMetalmeccanicaPMI && !RegolaCalcoloContratto::where('contratto_id', $contrattoMetalmeccanicaPMI->id)->exists()) {
            RegolaCalcoloContratto::create([
                'contratto_id' => $contrattoMetalmeccanicaPMI->id,
                'ore_settimanali_teoriche' => 40.00,
            ]);
        }

        // Terziario, Distribuzione e Servizi (H011, Confcommercio)
        $contrattoCommercio = Contratto::where('codice_cnel', 'H011')->first();
        if ($contrattoCommercio && !RegolaCalcoloContratto::where('contratto_id', $contrattoCommercio->id)->exists()) {
            RegolaCalcoloContratto::create([
                'contratto_id' => $contrattoCommercio->id,
                'ore_settimanali_teoriche' => 39.00, // 39 ore per il commercio
            ]);
        }

        // Autoferrotranvieri (I022, Mobilità - TPL)
        $contrattoAutoferrotranvieri = Contratto::where('codice_cnel', 'I022')->first();
        if ($contrattoAutoferrotranvieri && !RegolaCalcoloContratto::where('contratto_id', $contrattoAutoferrotranvieri->id)->exists()) {
            RegolaCalcoloContratto::create([
                'contratto_id' => $contrattoAutoferrotranvieri->id,
                'ore_settimanali_teoriche' => 38.50, // 38,5 ore settimanali
            ]);
        }

        // Edilizia (F011 o simili)
        $contrattoEdilizia = Contratto::where('codice_cnel', 'F011')->first();
        if ($contrattoEdilizia && !RegolaCalcoloContratto::where('contratto_id', $contrattoEdilizia->id)->exists()) {
            RegolaCalcoloContratto::create([
                'contratto_id' => $contrattoEdilizia->id,
                'ore_settimanali_teoriche' => 40.00,
            ]);
        }

        // Logistica
        $contrattoLogistica = Contratto::where('codice_cnel', 'G071')->first();
        if ($contrattoLogistica && !RegolaCalcoloContratto::where('contratto_id', $contrattoLogistica->id)->exists()) {
            RegolaCalcoloContratto::create([
                'contratto_id' => $contrattoLogistica->id,
                'ore_settimanali_teoriche' => 39.00,
            ]);
        }
    }
}
