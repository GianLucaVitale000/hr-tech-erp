<?php

namespace App\Http\Controllers;

use App\Models\Dipendente;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DipendenteOrarioSettimanaleController extends Controller
{
    /**
     * Recupera gli orari settimanali di un dipendente
     */
    public function index(Request $request, Dipendente $dipendente)
    {
        // Carica le relazioni necessarie per il calcolo delle ore
        $dipendente->load(['contratto', 'contratto.regoleCalcolo', 'orariSettimanali']);
        
        $orari = $dipendente->orariSettimanali
            ->sortBy('giorno_settimana')
            ->values()
            ->map(function($orario) {
                return [
                    'id' => $orario->id,
                    'giorno_settimana' => $orario->giorno_settimana,
                    'ore_giornaliere_previste' => $orario->ore_giornaliere_previste,
                    'turno1_dalle' => $orario->turno1_dalle ? $orario->turno1_dalle->format('H:i') : null,
                    'turno1_alle' => $orario->turno1_alle ? $orario->turno1_alle->format('H:i') : null,
                    'turno2_dalle' => $orario->turno2_dalle ? $orario->turno2_dalle->format('H:i') : null,
                    'turno2_alle' => $orario->turno2_alle ? $orario->turno2_alle->format('H:i') : null,
                ];
            });
        
        // Calcola le ore settimanali totali previste per il part-time
        $oreSettimanaliPartTime = $dipendente->ore_settimanali_part_time;
        $oreConfigurate = array_sum(array_column($orari->toArray(), 'ore_giornaliere_previste'));
        
        // Se il dipendente è part-time ma non ha una regola valida, restituisci ore_settimanali_part_time come 0
        // e un messaggio di errore nel frontend
        if ($oreSettimanaliPartTime === null && (float)($dipendente->percentuale_part_time ?? 100) < 100) {
            return response()->json([
                'orari' => $orari,
                'ore_settimanali_part_time' => 0,
                'ore_configurate' => $oreConfigurate,
                'has_configurazione' => $dipendente->has_orari_settimanali_configurati,
                'error' => 'Il dipendente non ha una regola di calcolo valida. Assegnare un contratto con ore settimanali teoriche configurate.'
            ]);
        }
        
        return response()->json([
            'orari' => $orari,
            'ore_settimanali_part_time' => $oreSettimanaliPartTime,
            'ore_configurate' => $oreConfigurate,
            'has_configurazione' => $dipendente->has_orari_settimanali_configurati,
        ]);
    }

    /**
     * Salva/aggiorna gli orari settimanali per un dipendente
     * Accetta un array con ore per ogni giorno (0-6)
     */
    public function storeOrUpdate(Request $request, Dipendente $dipendente)
    {
        // Carica le relazioni necessarie per la validazione
        $dipendente->load(['contratto', 'contratto.regoleCalcolo']);
        
        // Validazione: il dipendente deve essere part-time (< 100%)
        if (($dipendente->percentuale_part_time ?? 100) >= 100) {
            return response()->json([
                'error' => 'La configurazione orari settimanali è solo per dipendenti part-time'
            ], 400);
        }
        
        // Validazione: il dipendente deve avere una regola di calcolo con ore_settimanali_teoriche valida
        if ($dipendente->ore_settimanali_part_time === null || $dipendente->ore_settimanali_part_time <= 0) {
            return response()->json([
                'error' => 'Impossibile configurare orari: il dipendente non ha una regola di calcolo valida. Assegnare un contratto con ore settimanali teoriche configurate.'
            ], 400);
        }

        $validated = $request->validate([
            'orari' => 'required|array',
            'orari.*.giorno_settimana' => 'required|integer|min:0|max:6',
            'orari.*.ore_giornaliere_previste' => 'required|numeric|min:0|max:24',
            'orari.*.turno1_dalle' => ['nullable', 'string', 'regex:/^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/'],
            'orari.*.turno1_alle' => ['nullable', 'string', 'regex:/^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/'],
            'orari.*.turno2_dalle' => ['nullable', 'string', 'regex:/^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/'],
            'orari.*.turno2_alle' => ['nullable', 'string', 'regex:/^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/'],
        ]);

        $oreSettimanaliPartTime = $dipendente->ore_settimanali_part_time;

        // Calcola il totale sulla precisione originale e arrotonda solo l'ultimo
        // giorno con ore, così la somma salvata coincide con il limite settimanale.
        $orariNormalizzati = $validated['orari'];
        $totaleOre = round(array_sum(array_map(
            fn (array $orario) => (float) ($orario['ore_giornaliere_previste'] ?? 0),
            $orariNormalizzati
        )), 2);
        $oreSettimanaliPartTime = round((float) $oreSettimanaliPartTime, 2);

        // Confronto in minuti per evitare problemi residui di floating point
        $totaleMinuti = (int) round($totaleOre * 60);
        $limiteMinuti = (int) round($oreSettimanaliPartTime * 60);

        // Validazione: la somma deve coincidere esattamente con le ore settimanali part-time
        if ($totaleMinuti !== $limiteMinuti) {
            return response()->json([
                'error' => sprintf(
                    'La somma delle ore (%s) deve coincidere esattamente con le ore settimanali part-time consentite (%.2f)',
                    $totaleOre,
                    $oreSettimanaliPartTime
                ),
                'totale_ore' => $totaleOre,
                'ore_settimanali_part_time' => $oreSettimanaliPartTime,
                'totale_minuti' => $totaleMinuti,
                'limite_minuti' => $limiteMinuti,
                'differenza_minuti' => $totaleMinuti - $limiteMinuti,
                'orari' => $orariNormalizzati,
            ], 422);
        }

        $indiciGiorniLavorativi = array_keys(array_filter(
            $orariNormalizzati,
            fn (array $orario) => (float) ($orario['ore_giornaliere_previste'] ?? 0) > 0
        ));
        $ultimoIndiceLavorativo = end($indiciGiorniLavorativi);
        $oreArrotondatePrecedenti = 0.0;

        foreach ($orariNormalizzati as $indice => &$orario) {
            $ore = (float) ($orario['ore_giornaliere_previste'] ?? 0);
            if ($ore <= 0) {
                $orario['ore_giornaliere_previste'] = 0.00;
                continue;
            }

            if ($indice === $ultimoIndiceLavorativo) {
                $orario['ore_giornaliere_previste'] = round($oreSettimanaliPartTime - $oreArrotondatePrecedenti, 2);
            } else {
                $orario['ore_giornaliere_previste'] = round($ore, 2);
                $oreArrotondatePrecedenti += $orario['ore_giornaliere_previste'];
            }
        }
        unset($orario);

        $totaleOre = round(array_sum(array_column($orariNormalizzati, 'ore_giornaliere_previste')), 2);

        // Usa transazione per aggiornare tutti i record
        DB::beginTransaction();
        
        try {
            // Aggiorna o crea i record per ogni giorno
            // Usa updateOrCreate per gestire correttamente i giorni con 0 ore
            // e per evitare problemi con il constraint UNIQUE
            foreach ($orariNormalizzati as $orarioData) {
                $dipendente->orariSettimanali()->updateOrCreate(
                    [
                        'giorno_settimana' => $orarioData['giorno_settimana'],
                    ],
                    [
                        'ore_giornaliere_previste' => $orarioData['ore_giornaliere_previste'],
                        // Salva anche i turni se presenti
                        'turno1_dalle' => $orarioData['turno1_dalle'] ?? null,
                        'turno1_alle' => $orarioData['turno1_alle'] ?? null,
                        'turno2_dalle' => $orarioData['turno2_dalle'] ?? null,
                        'turno2_alle' => $orarioData['turno2_alle'] ?? null,
                    ]
                );
            }
            
            DB::commit();
            
            // Ricarica il dipendente per ottenere lo stato aggiornato
            $dipendente->refresh();
            
            return response()->json([
                'message' => 'Orari settimanali aggiornati con successo',
                'ore_configurate' => $totaleOre,
                'ore_settimanali_part_time' => $oreSettimanaliPartTime,
                'has_orari_settimanali_configurati' => $dipendente->has_orari_settimanali_configurati,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Errore nel salvataggio: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Ottiene l'orario previsto per un dipendente in un specifico giorno
     * Usato dal frontend per mostrare il limite giornaliero
     */
    public function getForDate(Request $request, Dipendente $dipendente)
    {
        $validated = $request->validate([
            'data' => 'required|date',
        ]);

        $data = \Carbon\Carbon::parse($validated['data']);
        $giornoSettimana = $data->dayOfWeek; // 0=Dom, 1=Lun, etc.
        
        $orePreviste = $dipendente->getOrePrevistePerGiorno($giornoSettimana);
        
        return response()->json([
            'data' => $data->format('Y-m-d'),
            'giorno_settimana' => $giornoSettimana,
            'giorno_name' => $data->dayName,
            'ore_previste' => $orePreviste,
            'is_full_time' => ($dipendente->percentuale_part_time ?? 100) >= 100,
        ]);
    }
}
