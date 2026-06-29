<?php

namespace App\Http\Controllers;

use App\Models\RegolaCalcoloContratto;
use App\Models\Contratto;
use Illuminate\Http\Request;

class RegolaCalcoloContrattoController extends Controller
{
    public function index()
    {
        return RegolaCalcoloContratto::with('contratto')->get()->map(function ($regola) {
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
        ]);

        $regola = RegolaCalcoloContratto::create($validated);
        
        // Applica la conversione 0->null anche al risultato creato
        if ((float)$regola->ore_settimanali_teoriche === 0.0) {
            $regola->ore_settimanali_teoriche = null;
        }
        
        return $regola;
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
        ]);

        $regolaCalcoloContratto->update($validated);
        
        // Ricarica il model per ottenere i valori aggiornati
        $regolaCalcoloContratto->refresh();
        
        // Applica la conversione 0->null prima di restituire
        if ((float)$regolaCalcoloContratto->ore_settimanali_teoriche === 0.0) {
            $regolaCalcoloContratto->ore_settimanali_teoriche = null;
        }

        return $regolaCalcoloContratto;
    }

    public function destroy(RegolaCalcoloContratto $regolaCalcoloContratto)
    {
        $regolaCalcoloContratto->delete();

        return response()->json(['message' => 'Regola di calcolo eliminata']);
    }

    public function byContratto(Contratto $contratto)
    {
        return $contratto->regoleCalcolo()->with('dipendenti')->get()->map(function ($regola) {
            // Converti 0 (in qualsiasi formato) in null per coerenza con il frontend
            if ((float)$regola->ore_settimanali_teoriche === 0.0 || $regola->ore_settimanali_teoriche === null) {
                $regola->ore_settimanali_teoriche = null;
            }
            return $regola;
        });
    }
}
