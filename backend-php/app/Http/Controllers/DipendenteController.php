<?php

namespace App\Http\Controllers;

use App\Models\Dipendente;
use Illuminate\Http\Request;

class DipendenteController extends Controller
{
    public function index()
    {
        return Dipendente::with(['user', 'contratto', 'contratto.regoleCalcolo', 'regoleCalcolo', 'orariSettimanali'])->get();
    }

    public function me(Request $request)
    {
        $dipendente = \App\Models\Dipendente::with(['contratto', 'contratto.regoleCalcolo', 'orariSettimanali'])
            ->where('user_id', $request->user()->id)
            ->first();

        if (!$dipendente) {
            return response()->json(['message' => 'Profilo dipendente non trovato'], 404);
        }

        return $dipendente;
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'contratto_id' => 'nullable|exists:contratti,id',
            'codice_fiscale' => 'nullable|string|unique:dipendenti,codice_fiscale',
            'iban' => 'nullable|string',
            'livello' => 'nullable|string',
            'mansione' => 'nullable|string',
            'data_assunzione' => 'nullable|date',
            'percentuale_part_time' => 'nullable|numeric|min:0|max:100',
            'giorni_lavorativi_settimanali' => 'nullable|integer|min:4|max:6',
        ]);

        $dipendente = Dipendente::create($validated);

        return $dipendente->load(['user', 'contratto']);
    }

    public function show(Dipendente $dipendente)
    {
        return $dipendente->load(['user', 'contratto', 'contratto.regoleCalcolo', 'orariSettimanali']);
    }

    public function update(Request $request, Dipendente $dipendente)
    {
        $validated = $request->validate([
            'contratto_id' => 'nullable|exists:contratti,id',
            'codice_fiscale' => 'nullable|string|unique:dipendenti,codice_fiscale,' . $dipendente->id,
            'iban' => 'nullable|string',
            'livello' => 'nullable|string',
            'mansione' => 'nullable|string',
            'data_assunzione' => 'nullable|date',
            'percentuale_part_time' => 'nullable|numeric|min:0|max:100',
            'giorni_lavorativi_settimanali' => 'nullable|integer|min:4|max:6',
        ]);

        $dipendente->update($validated);

        return $dipendente->load(['user', 'contratto', 'contratto.regoleCalcolo', 'orariSettimanali']);
    }

    public function destroy(Dipendente $dipendente)
    {
        $dipendente->delete();

        return response()->json(['message' => 'Dipendente eliminato']);
    }
}