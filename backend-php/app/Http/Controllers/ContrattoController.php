<?php

namespace App\Http\Controllers;

use App\Models\Contratto;
use App\Models\RegolaCalcoloContratto;
use Illuminate\Http\Request;

class ContrattoController extends Controller
{
    public function index(Request $request)
    {
        // Per il frontend che usa il menu a tendina, restituisci solo i contratti vigenti
        // a meno che non sia specificato diversamente
        $query = Contratto::with('regoleCalcolo');
        
        if (!$request->has('all')) {
            $query->where('ultimo_accordo_vigente', true);
        }
        
        $contratti = $query->get();
        
        // Se grouped=false, restituisci tutti i contratti senza raggruppamento
        if ($request->has('grouped') && $request->input('grouped') === 'false') {
            return $this->formatContrattiWithRegole($contratti);
        }

        // Rimuovi duplicati: per ogni codice_cnel, mantieni solo il piu rappresentativo
        // I dati CNEL possono avere piu accordi per lo stesso CCNL
        $contrattiUnici = $contratti->groupBy('codice_cnel')->map(function ($gruppo) {
            // 1. Ordina per data decorrenza DESC
            $ordinati = $gruppo->sortByDesc('data_decorrenza');
            
            // 3. Cerca il primo con Confcommercio + CGIL/CISL/UIL
            $conSindacatiPrincipali = $ordinati->first(function($c) {
                $datoriali = json_decode($c->partiDatorialiFirmatarie ?: '[]', true);
                $sindacati = json_decode($c->partiSindacaliFirmatarie ?: '[]', true);
                
                // Controlla parte datoriale (Confcommercio)
                $haConfcommercio = false;
                if (is_array($datoriali)) {
                    foreach ($datoriali as $d) {
                        if (str_contains(strtoupper($d), 'CONFCOMMERCIO')) {
                            $haConfcommercio = true;
                            break;
                        }
                    }
                }
                
                // Controlla parti sindacali (almeno una di CGIL, CISL, UIL)
                $haSindacatoPrincipale = false;
                if (is_array($sindacati)) {
                    foreach ($sindacati as $s) {
                        $sUpper = strtoupper($s);
                        if (str_contains($sUpper, 'CGIL') || 
                            str_contains($sUpper, 'CISL') || 
                            str_contains($sUpper, 'UIL')) {
                            $haSindacatoPrincipale = true;
                            break;
                        }
                    }
                }
                
                return $haConfcommercio && $haSindacatoPrincipale;
            });
            
            // 4. Se trovato, usa quello. Altrimenti prendi il più recente
            return $conSindacatiPrincipali ?: $ordinati->first();
        })->values();
        
        // Aggiungi i campi delle regole al contratto per retrocompatibilita con il frontend
        // Se un contratto ha regole, prendi la prima (tipicamente ce n'e' una per contratto)
        return $this->formatContrattiWithRegole($contrattiUnici);
    }

    /**
     * Formatta i contratti aggiungendo i campi delle regole di calcolo
     */
    private function formatContrattiWithRegole($contratti)
    {
        return $contratti->map(function ($contratto) {
            if ($contratto->regoleCalcolo->isNotEmpty()) {
                $regola = $contratto->regoleCalcolo->first();
                $contratto->ore_settimanali_teoriche = $regola->ore_settimanali_teoriche;
                $contratto->soglia_maggiorazione_1 = $regola->soglia_maggiorazione_1;
                $contratto->soglia_maggiorazione_2 = $regola->soglia_maggiorazione_2;
            } else {
                // Se non ci sono regole, imposta a null per retrocompatibilita
                $contratto->ore_settimanali_teoriche = null;
                $contratto->soglia_maggiorazione_1 = null;
                $contratto->soglia_maggiorazione_2 = null;
            }
            return $contratto;
        });
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'codice_cnel' => 'nullable|string',
            'nome_contratto' => 'required|string',
            'data_decorrenza' => 'nullable|date',
            'data_scadenza' => 'nullable|date',
            'ultimo_accordo_vigente' => 'boolean',
        ]);

        return Contratto::create($validated);
    }

    public function show(Contratto $contratto)
    {
        $contratto->load('regoleCalcolo');
        
        // Aggiungi i campi delle regole per retrocompatibilita
        if ($contratto->regoleCalcolo->isNotEmpty()) {
            $regola = $contratto->regoleCalcolo->first();
            $contratto->ore_settimanali_teoriche = $regola->ore_settimanali_teoriche;
            $contratto->soglia_maggiorazione_1 = $regola->soglia_maggiorazione_1;
            $contratto->soglia_maggiorazione_2 = $regola->soglia_maggiorazione_2;
        } else {
            $contratto->ore_settimanali_teoriche = null;
            $contratto->soglia_maggiorazione_1 = null;
            $contratto->soglia_maggiorazione_2 = null;
        }
        
        return $contratto;
    }

    public function update(Request $request, Contratto $contratto)
    {
        $validated = $request->validate([
            'codice_cnel' => 'nullable|string',
            'nome_contratto' => 'sometimes|string',
            'data_decorrenza' => 'nullable|date',
            'data_scadenza' => 'nullable|date',
            'ultimo_accordo_vigente' => 'boolean',
        ]);

        $contratto->update($validated);

        return $contratto;
    }

    public function destroy(Contratto $contratto)
    {
        $contratto->delete();

        return response()->json(['message' => 'Contratto eliminato']);
    }

    public function vigenti()
    {
        $contratti = Contratto::where('ultimo_accordo_vigente', true)
            ->with(['regoleCalcolo' => function($query) {
                $query->orderBy('created_at');
            }])
            ->get();
        
        // Rimuovi duplicati: per ogni codice_cnel, mantieni solo il piu rappresentativo
        // I dati CNEL possono avere piu accordi per lo stesso CCNL
        $contrattiUnici = $contratti->groupBy('codice_cnel')->map(function ($gruppo) {
            // 1. Ordina per data decorrenza DESC
            $ordinati = $gruppo->sortByDesc('data_decorrenza');
            
            // 3. Cerca il primo con Confcommercio + CGIL/CISL/UIL
            $conSindacatiPrincipali = $ordinati->first(function($c) {
                $datoriali = json_decode($c->partiDatorialiFirmatarie ?: '[]', true);
                $sindacati = json_decode($c->partiSindacaliFirmatarie ?: '[]', true);
                
                // Controlla parte datoriale (Confcommercio)
                $haConfcommercio = false;
                if (is_array($datoriali)) {
                    foreach ($datoriali as $d) {
                        if (str_contains(strtoupper($d), 'CONFCOMMERCIO')) {
                            $haConfcommercio = true;
                            break;
                        }
                    }
                }
                
                // Controlla parti sindacali (almeno una di CGIL, CISL, UIL)
                $haSindacatoPrincipale = false;
                if (is_array($sindacati)) {
                    foreach ($sindacati as $s) {
                        $sUpper = strtoupper($s);
                        if (str_contains($sUpper, 'CGIL') || 
                            str_contains($sUpper, 'CISL') || 
                            str_contains($sUpper, 'UIL')) {
                            $haSindacatoPrincipale = true;
                            break;
                        }
                    }
                }
                
                return $haConfcommercio && $haSindacatoPrincipale;
            });
            
            // 4. Se trovato, usa quello. Altrimenti prendi il più recente
            return $conSindacatiPrincipali ?: $ordinati->first();
        })->values();
        
        return $contrattiUnici->map(function ($contratto) {
            // Aggiungi i campi delle regole per retrocompatibilita con il frontend
            if ($contratto->regoleCalcolo->isNotEmpty()) {
                $regola = $contratto->regoleCalcolo->first();
                $contratto->ore_settimanali_teoriche = $regola->ore_settimanali_teoriche;
                $contratto->soglia_maggiorazione_1 = $regola->soglia_maggiorazione_1;
                $contratto->soglia_maggiorazione_2 = $regola->soglia_maggiorazione_2;
            } else {
                // Valori default se non ci sono regole configurate
                $contratto->ore_settimanali_teoriche = 40;
                $contratto->soglia_maggiorazione_1 = 15;
                $contratto->soglia_maggiorazione_2 = 30;
            }
            return $contratto;
        });
    }
}