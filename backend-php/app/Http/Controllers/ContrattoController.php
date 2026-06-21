<?php

namespace App\Http\Controllers;

use App\Models\Contratto;
use Illuminate\Http\Request;

class ContrattoController extends Controller
{
    public function index()
    {
        return Contratto::all();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'codice_cnel' => 'nullable|string',
            'nome_contratto' => 'required|string',
            'ore_settimanali_teoriche' => 'required|numeric',
            'limite_straordinario_mensile' => 'nullable|numeric',
            'soglia_maggiorazione_1' => 'nullable|numeric',
            'soglia_maggiorazione_2' => 'nullable|numeric',
        ]);

        return Contratto::create($validated);
    }

    public function show(Contratto $contratto)
    {
        return $contratto;
    }

    public function update(Request $request, Contratto $contratto)
    {
        $validated = $request->validate([
            'codice_cnel' => 'nullable|string',
            'nome_contratto' => 'sometimes|string',
            'ore_settimanali_teoriche' => 'sometimes|numeric',
            'limite_straordinario_mensile' => 'nullable|numeric',
            'soglia_maggiorazione_1' => 'nullable|numeric',
            'soglia_maggiorazione_2' => 'nullable|numeric',
        ]);

        $contratto->update($validated);

        return $contratto;
    }

    public function destroy(Contratto $contratto)
    {
        $contratto->delete();

        return response()->json(['message' => 'Contratto eliminato']);
    }
}