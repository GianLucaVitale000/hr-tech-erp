<?php

namespace App\Http\Controllers;

use App\Models\Presenza;
use Illuminate\Http\Request;

class PresenzaController extends Controller
{
    // Lista presenze di un dipendente per mese/anno
    public function index(Request $request)
    {
        $query = Presenza::with('dipendente.user');

        if ($request->has('dipendente_id')) {
            $query->where('dipendente_id', $request->dipendente_id);
        }

        if ($request->has('mese') && $request->has('anno')) {
            $query->whereMonth('data', $request->mese)
                  ->whereYear('data', $request->anno);
        }

        return $query->orderBy('data')->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'dipendente_id' => 'required|exists:dipendenti,id',
            'data' => 'required|date',
            'ore_ordinarie' => 'nullable|numeric|min:0|max:24',
            'ore_straordinarie' => 'nullable|numeric|min:0|max:24',
            'causale' => 'required|in:lavoro,ferie,permesso_rol,malattia,maternita,infortunio,assemblea',
        ]);

        // Crea o aggiorna se esiste già una riga per quel giorno
        $presenza = Presenza::updateOrCreate(
            [
                'dipendente_id' => $validated['dipendente_id'],
                'data' => $validated['data'],
            ],
            $validated
        );

        return $presenza;
    }

    public function show(Presenza $presenza)
    {
        return $presenza->load('dipendente.user');
    }

    public function update(Request $request, Presenza $presenza)
    {
        $validated = $request->validate([
            'ore_ordinarie' => 'nullable|numeric|min:0|max:24',
            'ore_straordinarie' => 'nullable|numeric|min:0|max:24',
            'causale' => 'sometimes|in:lavoro,ferie,permesso_rol,malattia,maternita,infortunio,assemblea',
            'stato' => 'sometimes|in:bozza,inviato,approvato,rifiutato',
        ]);

        $presenza->update($validated);

        return $presenza;
    }

    public function destroy(Presenza $presenza)
    {
        $presenza->delete();

        return response()->json(['message' => 'Presenza eliminata']);
    }

    // Invia il mese al manager (cambia stato in 'inviato')
    public function inviaMese(Request $request)
    {
        $validated = $request->validate([
            'dipendente_id' => 'required|exists:dipendenti,id',
            'mese' => 'required|integer|min:1|max:12',
            'anno' => 'required|integer',
        ]);

        Presenza::where('dipendente_id', $validated['dipendente_id'])
            ->whereMonth('data', $validated['mese'])
            ->whereYear('data', $validated['anno'])
            ->update(['stato' => 'inviato']);

        return response()->json(['message' => 'Mese inviato per approvazione']);
    }
}