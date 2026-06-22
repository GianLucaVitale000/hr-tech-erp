<?php

namespace App\Http\Controllers;

use App\Models\Presenza;
use Illuminate\Http\Request;

class PresenzaController extends Controller
{
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
            'ore_ordinarie' => 'nullable|numeric|min:0|max:8',
            'ore_straordinarie' => 'nullable|numeric|min:0|max:4',
            'ore_causale' => 'nullable|numeric|min:0|max:8',
            'causale' => 'required|in:lavoro,ferie,permesso_rol,malattia,maternita,infortunio,assemblea',
        ]);

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
            'ore_ordinarie' => 'nullable|numeric|min:0|max:8',
            'ore_straordinarie' => 'nullable|numeric|min:0|max:4',
            'ore_causale' => 'nullable|numeric|min:0|max:8',
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

    // Lista dei mesi inviati in attesa di approvazione (vista Admin)
    public function inAttesa()
    {
        $mesi = Presenza::with('dipendente.user')
            ->where('stato', 'inviato')
            ->get()
            ->groupBy(function ($p) {
                return $p->dipendente_id . '-' . substr($p->data, 0, 7); // es. "1-2026-06"
            })
            ->map(function ($gruppo) {
                $prima = $gruppo->first();
                return [
                    'dipendente_id' => $prima->dipendente_id,
                    'dipendente_nome' => $prima->dipendente->user->name,
                    'mese' => substr($prima->data, 5, 2),
                    'anno' => substr($prima->data, 0, 4),
                    'totale_giorni' => $gruppo->count(),
                    'totale_ore_ordinarie' => $gruppo->sum('ore_ordinarie'),
                    'totale_ore_straordinarie' => $gruppo->sum('ore_straordinarie'),
                ];
            })
            ->values();

        return $mesi;
    }

    // Approva o rifiuta un intero mese
    public function aggiornaStatoMese(Request $request)
    {
        $validated = $request->validate([
            'dipendente_id' => 'required|exists:dipendenti,id',
            'mese' => 'required|integer|min:1|max:12',
            'anno' => 'required|integer',
            'stato' => 'required|in:approvato,rifiutato',
        ]);

        Presenza::where('dipendente_id', $validated['dipendente_id'])
            ->whereMonth('data', $validated['mese'])
            ->whereYear('data', $validated['anno'])
            ->update(['stato' => $validated['stato']]);

        return response()->json(['message' => 'Stato aggiornato con successo']);
    }
}