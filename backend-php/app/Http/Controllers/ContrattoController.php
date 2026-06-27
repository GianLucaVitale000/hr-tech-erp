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
        
        // Rimuovi duplicati: per ogni codice_cnel, mantieni solo il piu recente
        // I dati CNEL possono avere piu accordi per lo stesso CCNL
        $contrattiUnici = $contratti->groupBy('codice_cnel')->map(function ($gruppo) {
            // Ordina per data_decorrenza (piu recente primo) e prendi il primo
            return $gruppo->sortByDesc('data_decorrenza')->first();
        })->values();
        
        // Aggiungi i campi delle regole al contratto per retrocompatibilita con il frontend
        // Se un contratto ha regole, prendi la prima (tipicamente ce n'e' una per contratto)
        return $contrattiUnici->map(function ($contratto) {
            if ($contratto->regoleCalcolo->isNotEmpty()) {
                $regola = $contratto->regoleCalcolo->first();
                $contratto->ore_settimanali_teoriche = $regola->ore_settimanali_teoriche;
                $contratto->limite_straordinario_mensile = $regola->limite_straordinario_mensile;
                $contratto->soglia_maggiorazione_1 = $regola->soglia_maggiorazione_1;
                $contratto->soglia_maggiorazione_2 = $regola->soglia_maggiorazione_2;
            } else {
                // Se non ci sono regole, imposta a null per retrocompatibilita
                $contratto->ore_settimanali_teoriche = null;
                $contratto->limite_straordinario_mensile = null;
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
            $contratto->limite_straordinario_mensile = $regola->limite_straordinario_mensile;
            $contratto->soglia_maggiorazione_1 = $regola->soglia_maggiorazione_1;
            $contratto->soglia_maggiorazione_2 = $regola->soglia_maggiorazione_2;
        } else {
            $contratto->ore_settimanali_teoriche = null;
            $contratto->limite_straordinario_mensile = null;
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
        
        // Rimuovi duplicati: per ogni codice_cnel, mantieni solo il piu recente
        // I dati CNEL possono avere piu accordi per lo stesso CCNL
        $contrattiUnici = $contratti->groupBy('codice_cnel')->map(function ($gruppo) {
            return $gruppo->sortByDesc('data_decorrenza')->first();
        })->values();
        
        return $contrattiUnici->map(function ($contratto) {
            // Aggiungi i campi delle regole per retrocompatibilita con il frontend
            if ($contratto->regoleCalcolo->isNotEmpty()) {
                $regola = $contratto->regoleCalcolo->first();
                $contratto->ore_settimanali_teoriche = $regola->ore_settimanali_teoriche;
                $contratto->limite_straordinario_mensile = $regola->limite_straordinario_mensile;
                $contratto->soglia_maggiorazione_1 = $regola->soglia_maggiorazione_1;
                $contratto->soglia_maggiorazione_2 = $regola->soglia_maggiorazione_2;
            } else {
                // Valori default se non ci sono regole configurate
                $contratto->ore_settimanali_teoriche = 40;
                $contratto->limite_straordinario_mensile = 32;
                $contratto->soglia_maggiorazione_1 = 15;
                $contratto->soglia_maggiorazione_2 = 30;
            }
            return $contratto;
        });
    }
}