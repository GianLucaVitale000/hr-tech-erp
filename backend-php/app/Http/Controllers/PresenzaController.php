<?php

namespace App\Http\Controllers;

use App\Models\Presenza;
use Illuminate\Http\Request;
use Carbon\Carbon;

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
        // Recupera il dipendente per ottenere contratto e parametri
        $dipendente = \App\Models\Dipendente::with('contratto')->find($request->dipendente_id);
        
        if (!$dipendente) {
            return response()->json(['error' => 'Dipendente non trovato'], 404);
        }
        
        // Calcola ore ordinarie massime giornaliere basate su:
        // - ore_settimanali_teoriche del contratto
        // - giorni_lavorativi_settimanali del dipendente
        // - percentuale_part_time del dipendente
        $oreGiornaliereContratto = $dipendente->contratto->ore_settimanali_teoriche / $dipendente->giorni_lavorativi_settimanali;
        $oreOrdinarieMax = $oreGiornaliereContratto * ($dipendente->percentuale_part_time / 100);
        
        // Per ora manteniamo il limite di 4 ore straordinarie giornaliere
        // (può essere reso configurabile in futuro)
        $oreStraordinarieMax = 4;
        
        // Limite per ore_causale: stesso delle ore ordinarie
        $oreCausaleMax = $oreOrdinarieMax;

        $validated = $request->validate([
            'dipendente_id' => 'required|exists:dipendenti,id',
            'data' => 'required|date',
            'ore_ordinarie' => "nullable|numeric|min:0|max:$oreOrdinarieMax",
            'ore_straordinarie' => "nullable|numeric|min:0|max:$oreStraordinarieMax",
            'ore_causale' => "nullable|numeric|min:0|max:$oreCausaleMax",
            'causale' => 'required|in:lavoro,ferie,permesso_rol,malattia,maternita,infortunio,assemblea',
            'modalita_lavoro' => 'nullable|in:in_sede,smart_working,trasferta',
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
        // Recupera il dipendente per ottenere contratto e parametri
        $dipendente = \App\Models\Dipendente::with('contratto')->find($presenza->dipendente_id);
        
        if (!$dipendente) {
            return response()->json(['error' => 'Dipendente non trovato'], 404);
        }
        
        // Calcola ore ordinarie massime giornaliere
        $oreGiornaliereContratto = $dipendente->contratto->ore_settimanali_teoriche / $dipendente->giorni_lavorativi_settimanali;
        $oreOrdinarieMax = $oreGiornaliereContratto * ($dipendente->percentuale_part_time / 100);
        $oreStraordinarieMax = 4;
        $oreCausaleMax = $oreOrdinarieMax;

        $validated = $request->validate([
            'ore_ordinarie' => "nullable|numeric|min:0|max:$oreOrdinarieMax",
            'ore_straordinarie' => "nullable|numeric|min:0|max:$oreStraordinarieMax",
            'ore_causale' => "nullable|numeric|min:0|max:$oreCausaleMax",
            'causale' => 'sometimes|in:lavoro,ferie,permesso_rol,malattia,maternita,infortunio,assemblea',
            'stato' => 'sometimes|in:bozza,inviato,approvato,rifiutato',
            'modalita_lavoro' => 'nullable|in:in_sede,smart_working,trasferta',
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

    public function inAttesa()
    {
        $mesi = Presenza::with('dipendente.user')
            ->where('stato', 'inviato')
            ->get()
            ->groupBy(function ($p) {
                return $p->dipendente_id . '-' . substr($p->data, 0, 7);
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

    // Registra un periodo di malattia su più giorni, anche a cavallo di mesi diversi
    public function registraMalattia(Request $request)
    {
        $validated = $request->validate([
            'dipendente_id' => 'required|exists:dipendenti,id',
            'data_inizio' => 'required|date',
            'data_fine' => 'required|date|after_or_equal:data_inizio',
            'protocollo' => 'required|string|max:255',
        ]);

        $inizio = Carbon::parse($validated['data_inizio']);
        $fine = Carbon::parse($validated['data_fine']);
        $righeCreate = [];

        for ($giorno = $inizio->copy(); $giorno->lte($fine); $giorno->addDay()) {
            $presenza = Presenza::updateOrCreate(
                [
                    'dipendente_id' => $validated['dipendente_id'],
                    'data' => $giorno->format('Y-m-d'),
                ],
                [
                    'causale' => 'malattia',
                    'ore_ordinarie' => 0,
                    'ore_straordinarie' => 0,
                    'ore_causale' => 8,
                    'modalita_lavoro' => null,
                    'protocollo_malattia' => $validated['protocollo'],
                    'data_inizio_malattia' => $validated['data_inizio'],
                    'data_fine_malattia' => $validated['data_fine'],
                ]
            );
            $righeCreate[] = $presenza;
        }

        return response()->json([
            'message' => 'Periodo di malattia registrato',
            'giorni_creati' => count($righeCreate),
            'presenze' => $righeCreate,
        ]);
    }

    // Upload giustificativo trasferta
    public function uploadGiustificativoTrasferta(Request $request, Presenza $presenza)
    {
        $request->validate([
            'file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        $path = $request->file('file')->store('giustificativi/trasferta', 'public');
        $presenza->update(['giustificativo_trasferta_path' => $path]);

        return $presenza;
    }

    // Upload giustificativo infortunio
    public function uploadGiustificativoInfortunio(Request $request, Presenza $presenza)
    {
        $request->validate([
            'file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        $path = $request->file('file')->store('giustificativi/infortunio', 'public');
        $presenza->update(['giustificativo_infortunio_path' => $path]);

        return $presenza;
    }
}