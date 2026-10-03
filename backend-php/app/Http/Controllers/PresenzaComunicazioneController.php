<?php

namespace App\Http\Controllers;

use App\Models\PresenzaComunicazione;
use Illuminate\Http\Request;

class PresenzaComunicazioneController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        if ($user->hasRole('admin')) {
            $validated = $request->validate([
                'dipendente_id' => 'required|exists:dipendenti,id',
                'mese' => 'required|integer|between:1,12',
                'anno' => 'required|integer|min:2000|max:2100',
            ]);

            return PresenzaComunicazione::with('admin:id,name')
                ->where('dipendente_id', $validated['dipendente_id'])
                ->where('mese', $validated['mese'])
                ->where('anno', $validated['anno'])
                ->latest()
                ->get();
        }

        $dipendente = $user->dipendente;
        if (!$dipendente) {
            return response()->json(['message' => 'Profilo dipendente non trovato.'], 404);
        }

        return PresenzaComunicazione::with('admin:id,name')
            ->where('dipendente_id', $dipendente->id)
            ->latest()
            ->get();
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->hasRole('admin'), 403);

        $validated = $request->validate([
            'dipendente_id' => 'required|exists:dipendenti,id',
            'mese' => 'required|integer|between:1,12',
            'anno' => 'required|integer|min:2000|max:2100',
            'messaggio' => 'required|string|max:5000',
        ]);

        return response()->json(
            PresenzaComunicazione::create([
                ...$validated,
                'admin_id' => $request->user()->id,
            ])->load('admin:id,name'),
            201
        );
    }

    public function markAsRead(Request $request, PresenzaComunicazione $comunicazione)
    {
        abort_unless($request->user()->dipendente?->id === $comunicazione->dipendente_id, 403);

        $comunicazione->update(['letto_at' => now()]);

        return response()->noContent();
    }
}
