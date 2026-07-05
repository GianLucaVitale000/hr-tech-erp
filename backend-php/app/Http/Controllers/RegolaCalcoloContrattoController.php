<?php

namespace App\Http\Controllers;

use App\Models\RegolaCalcoloContratto;
use App\Models\Contratto;
use App\Models\Dipendente;
use App\Models\User;
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
            'descrizione' => 'nullable|string',
            'dipendenti_ids' => 'nullable|array',
            'dipendenti_ids.*' => 'exists:dipendenti,id',
        ]);

        // Debug logging
        \Log::info('store RegolaCalcoloContratto', [
            'contratto_id' => $validated['contratto_id'],
            'dipendenti_ids' => $validated['dipendenti_ids'] ?? [],
            'ore' => $validated['ore_settimanali_teoriche'],
            'descrizione' => $validated['descrizione'],
        ]);

        $regola = RegolaCalcoloContratto::create([
            'contratto_id' => $validated['contratto_id'],
            'ore_settimanali_teoriche' => $validated['ore_settimanali_teoriche'] ?? null,
            'descrizione' => $validated['descrizione'] ?? null,
        ]);
        
        // Associa dipendenti se forniti (sovrascrive l'associazione esistente)
        // Usiamo isset per gestire anche il caso di array vuoto []
        if (isset($validated['dipendenti_ids'])) {
            // Verifica che i dipendenti appartengano al contratto
            $contrattoId = $validated['contratto_id'];
            $dipendentiValidi = Dipendente::whereIn('id', $validated['dipendenti_ids'])
                ->where('contratto_id', $contrattoId)
                ->pluck('dipendenti.id');
            
            // Verifica che i dipendenti non siano già associati ad altre regole
            // (escludendo la regola corrente in caso di update, ma qui è store quindi non serve)
            $dipendentiGiaAssegnati = Dipendente::whereIn('id', $dipendentiValidi)
                ->whereHas('regoleCalcolo', function($q) use ($regola) {
                    $q->where('regola_calcolo_contratto_id', '!=', $regola->id);
                })
                ->pluck('dipendenti.id');
            
            if ($dipendentiGiaAssegnati->isNotEmpty()) {
                // Rimuovi i dipendenti già assegnati
                $dipendentiValidi = $dipendentiValidi->diff($dipendentiGiaAssegnati);
                \Log::warning('store - dipendenti già assegnati rimossi', [
                    'rimossi' => $dipendentiGiaAssegnati->toArray(),
                    'validi' => $dipendentiValidi->toArray()
                ]);
            }
            
            \Log::info('store - dipendentiValidi', ['ids' => $dipendentiValidi->toArray()]);
            
            // Usa sync invece di attach per sostituire completamente l'associazione
            // Sync con array vuoto rimuove tutte le associazioni
            $regola->dipendenti()->sync($dipendentiValidi);
            
            // Aggiorna anche il campo ore_settimanali dei dipendenti associati
            if ($regola->ore_settimanali_teoriche !== null) {
                Dipendente::whereIn('id', $dipendentiValidi)
                    ->update(['ore_settimanali' => $regola->ore_settimanali_teoriche]);
            }
            
            // Per i dipendenti che vengono rimossi da questa regola,
            // reimposta ore_settimanali a null (useranno il default del contratto)
            // Ma non lo facciamo qui perché un dipendente può essere associato solo a una regola
            // (grazie al vincolo unique su dipendente_id nella pivot table)
            
            \Log::info('store - sync eseguito con successo');
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
            'descrizione' => 'nullable|string',
            'dipendenti_ids' => 'nullable|array',
            'dipendenti_ids.*' => 'exists:dipendenti,id',
        ]);

        $regolaCalcoloContratto->update([
            'contratto_id' => $validated['contratto_id'] ?? $regolaCalcoloContratto->contratto_id,
            'ore_settimanali_teoriche' => $validated['ore_settimanali_teoriche'] ?? $regolaCalcoloContratto->ore_settimanali_teoriche,
            'descrizione' => $validated['descrizione'] ?? $regolaCalcoloContratto->descrizione,
        ]);
        
        // Associa dipendenti se forniti (sovrascrive l'associazione esistente)
        // Usiamo array_key_exists per gestire anche il caso di array vuoto []
        if (array_key_exists('dipendenti_ids', $validated)) {
            // Verifica che i dipendenti appartengano al contratto
            $contrattoId = $validated['contratto_id'] ?? $regolaCalcoloContratto->contratto_id;
            $dipendentiValidi = Dipendente::whereIn('id', $validated['dipendenti_ids'])
                ->where('contratto_id', $contrattoId)
                ->pluck('dipendenti.id');
            
            // Verifica che i dipendenti non siano già associati ad altre regole
            // (escludendo la regola corrente che stiamo aggiornando)
            $dipendentiGiaAssegnati = Dipendente::whereIn('id', $dipendentiValidi)
                ->whereHas('regoleCalcolo', function($q) use ($regolaCalcoloContratto) {
                    $q->where('regola_calcolo_contratto_id', '!=', $regolaCalcoloContratto->id);
                })
                ->pluck('dipendenti.id');
            
            if ($dipendentiGiaAssegnati->isNotEmpty()) {
                // Rimuovi i dipendenti già assegnati ad altre regole
                $dipendentiValidi = $dipendentiValidi->diff($dipendentiGiaAssegnati);
                \Log::warning('update - dipendenti già assegnati ad altre regole rimossi', [
                    'regola_id' => $regolaCalcoloContratto->id,
                    'rimossi' => $dipendentiGiaAssegnati->toArray(),
                    'validi' => $dipendentiValidi->toArray()
                ]);
            }
            
            // Sincronizza: rimuove i vecchi e aggiunge i nuovi
            // Sync con array vuoto rimuove tutte le associazioni
            $regolaCalcoloContratto->dipendenti()->sync($dipendentiValidi);
            
            // Aggiorna anche il campo ore_settimanali dei dipendenti associati
            $ore = $validated['ore_settimanali_teoriche'] ?? $regolaCalcoloContratto->ore_settimanali_teoriche;
            if ($ore !== null) {
                Dipendente::whereIn('id', $dipendentiValidi)
                    ->update(['ore_settimanali' => $ore]);
            }
            
            // Per i dipendenti che vengono rimossi da questa regola,
            // reimposta ore_settimanali a null (useranno il default del contratto)
            // Troviamo i dipendenti che erano associati prima ma non più ora
            $oldDipendentiIds = $regolaCalcoloContratto->dipendenti()->pluck('dipendenti.id');
            $removedDipendentiIds = $oldDipendentiIds->diff($dipendentiValidi);
            if ($removedDipendentiIds->isNotEmpty()) {
                Dipendente::whereIn('id', $removedDipendentiIds)
                    ->update(['ore_settimanali' => null]);
            }
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
     * Restituisce TUTTI i dipendenti che hanno un contratto con lo stesso codice_cnel,
     * indipendentemente dalla versione del contratto.
     * Questo perché i dipendenti sono associati a una versione specifica del contratto,
     * ma la regola di calcolo si applica al codice_cnel nel suo complesso.
     */
    public function getDipendentiByContratto(Contratto $contratto)
    {
        // Se c'è un codice_cnel, cerca tutti i dipendenti con contratti che hanno quel codice
        // Altrimenti cerca per ID diretto
        $query = Dipendente::with(['user', 'contratto'])
            ->join('users', 'dipendenti.user_id', '=', 'users.id')
            ->orderBy('users.name')
            ->select('dipendenti.*');
        
        if (!empty($contratto->codice_cnel)) {
            // Cerca per codice_cnel (include tutte le versioni del contratto)
            $query->whereHas('contratto', function($q) use ($contratto) {
                $q->where('codice_cnel', $contratto->codice_cnel);
            });
        } else {
            // Fallback: cerca per ID diretto
            $query->where('dipendenti.contratto_id', $contratto->id);
        }
        
        return $query->get();
    }

    /**
     * Ottiene i dipendenti per codice CCNL direttamente
     * Soluzione semplificata: data una sigla CCNL (es: H011), restituisce
     * tutti i dipendenti che hanno un contratto con quel codice_cnel
     */
    public function getDipendentiByCodiceContratto($codice)
    {
        // Trova tutti gli ID dei contratti con questo codice CCNL
        $contrattoIds = Contratto::where('codice_cnel', $codice)->pluck('id');
        
        // Poi trova i dipendenti che hanno uno di questi contratti
        return Dipendente::with(['user', 'contratto'])
            ->join('users', 'dipendenti.user_id', '=', 'users.id')
            ->whereIn('dipendenti.contratto_id', $contrattoIds)
            ->orderBy('users.name')
            ->select('dipendenti.*')
            ->get();
    }
}
