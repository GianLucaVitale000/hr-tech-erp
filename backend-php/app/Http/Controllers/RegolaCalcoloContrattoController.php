<?php

namespace App\Http\Controllers;

use App\Models\RegolaCalcoloContratto;
use App\Models\Contratto;
use Illuminate\Http\Request;

class RegolaCalcoloContrattoController extends Controller
{
    public function index()
    {
        return RegolaCalcoloContratto::with(['contratto', 'dipendenti'])->get()->map(function ($regola) {
            // Converti 0 (in qualsiasi formato) in null per coerenza con il frontend
            if ((float)$regola->ore_settimanali_teoriche === 0.0 || $regola->ore_settimanali_teoriche === null) {
                $regola->ore_settimanali_teoriche = null;
            }
            return $regola;
        });
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'contratto_id' => 'required|exists:contratti,id',
            'ore_settimanali_teoriche' => 'nullable|numeric',
            'nome_profilo' => 'nullable|string|max:255',
            'descrizione' => 'nullable|string',
            'dipendenti_ids' => 'nullable|array',
            'dipendenti_ids.*' => 'exists:dipendenti,id',
        ]);

        $regola = RegolaCalcoloContratto::create([
            'contratto_id' => $validated['contratto_id'],
            'ore_settimanali_teoriche' => $validated['ore_settimanali_teoriche'] ?? null,
            'nome_profilo' => $validated['nome_profilo'] ?? null,
            'descrizione' => $validated['descrizione'] ?? null,
        ]);
        
        // Associa dipendenti se forniti
        if (!empty($validated['dipendenti_ids'])) {
            // Verifica che i dipendenti appartengano al contratto
            $contrattoId = $validated['contratto_id'];
            $dipendentiValidi = Dipendente::whereIn('id', $validated['dipendenti_ids'])
                ->where('contratto_id', $contrattoId)
                ->pluck('id');
            
            if ($dipendentiValidi->isNotEmpty()) {
                $regola->dipendenti()->attach($dipendentiValidi);
            }
        }
        
        // Applica la conversione 0->null anche al risultato creato
        if ((float)$regola->ore_settimanali_teoriche === 0.0) {
            $regola->ore_settimanali_teoriche = null;
        }
        
        // Carica le relazioni per il frontend
        return $regola->load('contratto', 'dipendenti');
    }

    public function show(RegolaCalcoloContratto $regolaCalcoloContratto)
    {
        $regola = $regolaCalcoloContratto->load('contratto', 'dipendenti');
        // Converti 0 (in qualsiasi formato) in null per coerenza con il frontend
        if ((float)$regola->ore_settimanali_teoriche === 0.0 || $regola->ore_settimanali_teoriche === null) {
            $regola->ore_settimanali_teoriche = null;
        }
        return $regola;
    }

    public function update(Request $request, RegolaCalcoloContratto $regolaCalcoloContratto)
    {
        $validated = $request->validate([
            'contratto_id' => 'sometimes|exists:contratti,id',
            'ore_settimanali_teoriche' => 'nullable|numeric',
            'nome_profilo' => 'nullable|string|max:255',
            'descrizione' => 'nullable|string',
            'dipendenti_ids' => 'nullable|array',
            'dipendenti_ids.*' => 'exists:dipendenti,id',
        ]);

        $regolaCalcoloContratto->update([
            'contratto_id' => $validated['contratto_id'] ?? $regolaCalcoloContratto->contratto_id,
            'ore_settimanali_teoriche' => $validated['ore_settimanali_teoriche'] ?? $regolaCalcoloContratto->ore_settimanali_teoriche,
            'nome_profilo' => $validated['nome_profilo'] ?? $regolaCalcoloContratto->nome_profilo,
            'descrizione' => $validated['descrizione'] ?? $regolaCalcoloContratto->descrizione,
        ]);
        
        // Associa dipendenti se forniti (sovrascrive l'associazione esistente)
        if (isset($validated['dipendenti_ids'])) {
            // Verifica che i dipendenti appartengano al contratto
            $contrattoId = $validated['contratto_id'] ?? $regolaCalcoloContratto->contratto_id;
            $dipendentiValidi = Dipendente::whereIn('id', $validated['dipendenti_ids'])
                ->where('contratto_id', $contrattoId)
                ->pluck('id');
            
            // Sincronizza: rimuove i vecchi e aggiunge i nuovi
            $regolaCalcoloContratto->dipendenti()->sync($dipendentiValidi);
        }
        
        // Ricarica il model per ottenere i valori aggiornati
        $regolaCalcoloContratto->refresh();
        
        // Applica la conversione 0->null prima di restituire
        if ((float)$regolaCalcoloContratto->ore_settimanali_teoriche === 0.0) {
            $regolaCalcoloContratto->ore_settimanali_teoriche = null;
        }

        return $regolaCalcoloContratto->load('contratto', 'dipendenti');
    }

    public function destroy(RegolaCalcoloContratto $regolaCalcoloContratto)
    {
        $regolaCalcoloContratto->delete();

        return response()->json(['message' => 'Regola di calcolo eliminata']);
    }

    public function byContratto(Contratto $contratto)
    {
        return $contratto->regoleCalcolo()->with(['dipendenti', 'dipendenti.user'])->get()->map(function ($regola) {
            // Converti 0 (in qualsiasi formato) in null per coerenza con il frontend
            if ((float)$regola->ore_settimanali_teoriche === 0.0 || $regola->ore_settimanali_teoriche === null) {
                $regola->ore_settimanali_teoriche = null;
            }
            return $regola;
        });
    }

    /**
     * Ottiene i dipendenti di un contratto per il filtro nella modale
     */
    public function getDipendentiByContratto(Contratto $contratto)
    {
        return $contratto->dipendenti()->with('user')->orderBy('user.name')->get();
    }
}
