<?php

namespace App\Http\Controllers;

use App\Models\Dipendente;
use App\Models\DipendenteCondizioneContrattuale;
use App\Services\PermessiFerieService;
use Carbon\Carbon;
use Illuminate\Http\Request;

class DipendenteController extends Controller
{
    public function index()
    {
        return Dipendente::with(['user', 'contratto', 'contratto.regoleCalcolo', 'regoleCalcolo', 'orariSettimanali'])->get();
    }

    public function me(Request $request)
    {
        $dipendente = \App\Models\Dipendente::with(['contratto', 'contratto.regoleCalcolo', 'orariSettimanali', 'condizioniContrattuali'])
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
            'sesso' => 'nullable|in:M,F',
            'tipo_contratto' => 'required|in:determinato,indeterminato',
            'data_scadenza_contratto' => 'nullable|date|required_if:tipo_contratto,determinato',
            'percentuale_part_time' => 'nullable|numeric|min:0|max:100',
            'giorni_lavorativi_settimanali' => 'nullable|integer|min:4|max:6',
            'R1' => 'nullable|integer|min:1|max:7',
            'R2' => 'nullable|integer|min:1|max:7',
            'rateo_mensile_ferie' => 'nullable|numeric|decimal:0,5|min:0',
            'rateo_mensile_permessi_rol' => 'nullable|numeric|decimal:0,5|min:0',
            'rateo_mensile_ex_festivita' => 'nullable|numeric|decimal:0,5|min:0',
        ]);

        $dipendente = Dipendente::create($validated);
        DipendenteCondizioneContrattuale::create([
            'dipendente_id' => $dipendente->id,
            'contratto_id' => $dipendente->contratto_id,
            'percentuale_part_time' => $dipendente->percentuale_part_time ?? 100,
            'R1' => $dipendente->R1,
            'R2' => $dipendente->R2,
            'data_inizio' => $dipendente->data_assunzione ?? Carbon::today(),
        ]);

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
            'sesso' => 'nullable|in:M,F',
            'tipo_contratto' => 'nullable|in:determinato,indeterminato',
            'data_scadenza_contratto' => 'nullable|date|required_if:tipo_contratto,determinato',
            'percentuale_part_time' => 'nullable|numeric|min:0|max:100',
            'giorni_lavorativi_settimanali' => 'nullable|integer|min:4|max:6',
            'R1' => 'nullable|integer|min:1|max:7',
            'R2' => 'nullable|integer|min:1|max:7',
            'data_decorrenza_variazione' => 'nullable|date',
            'rateo_mensile_ferie' => 'nullable|numeric|decimal:0,5|min:0',
            'rateo_mensile_permessi_rol' => 'nullable|numeric|decimal:0,5|min:0',
            'rateo_mensile_ex_festivita' => 'nullable|numeric|decimal:0,5|min:0',
        ]);

        $variazione = $dipendente->contratto_id != ($validated['contratto_id'] ?? $dipendente->contratto_id)
            || (float) $dipendente->percentuale_part_time !== (float) ($validated['percentuale_part_time'] ?? $dipendente->percentuale_part_time)
            || $dipendente->R1 != ($validated['R1'] ?? $dipendente->R1)
            || $dipendente->R2 != ($validated['R2'] ?? $dipendente->R2);
        if ($variazione && empty($validated['data_decorrenza_variazione'])) {
            return response()->json(['message' => 'Indica la data di decorrenza della variazione contrattuale'], 422);
        }

        $dataVariazione = $validated['data_decorrenza_variazione'] ?? null;
        unset($validated['data_decorrenza_variazione']);

        if ($variazione) {
            $ultima = $dipendente->condizioniContrattuali()->latest('data_inizio')->first();
            if (!$ultima) {
                $ultima = DipendenteCondizioneContrattuale::create([
                    'dipendente_id' => $dipendente->id,
                    'contratto_id' => $dipendente->contratto_id,
                    'percentuale_part_time' => $dipendente->percentuale_part_time ?? 100,
                    'R1' => $dipendente->R1,
                    'R2' => $dipendente->R2,
                    'data_inizio' => $dipendente->data_assunzione ?? Carbon::today(),
                ]);
            }
            $ultima->update(['data_fine' => Carbon::parse($dataVariazione)->subDay()->toDateString()]);
        }

        $dipendente->update($validated);

        if ($variazione) {
            DipendenteCondizioneContrattuale::create([
                'dipendente_id' => $dipendente->id,
                'contratto_id' => $dipendente->contratto_id,
                'percentuale_part_time' => $dipendente->percentuale_part_time ?? 100,
                'R1' => $dipendente->R1,
                'R2' => $dipendente->R2,
                'data_inizio' => $dataVariazione,
            ]);
        }

        return $dipendente->load(['user', 'contratto', 'contratto.regoleCalcolo', 'orariSettimanali']);
    }

    public function destroy(Dipendente $dipendente)
    {
        $dipendente->delete();

        return response()->json(['message' => 'Dipendente eliminato']);
    }

    public function analisiFerie(Dipendente $dipendente, Request $request, PermessiFerieService $service)
    {
        $anno = (int) $request->input('anno', now()->year);
        return response()->json($service->calcola($dipendente, $anno));
    }
}