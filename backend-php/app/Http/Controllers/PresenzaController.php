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
        // Recupera il dipendente con eager loading
        $dipendente = \App\Models\Dipendente::with(['contratto.regoleCalcolo', 'orariSettimanali'])->find($request->dipendente_id);
        
        if (!$dipendente) {
            return response()->json(['error' => 'Dipendente non trovato'], 404);
        }
        
        // BLOCCO: Per dipendenti part-time, serve la configurazione orari settimanali
        if (!$dipendente->has_orari_settimanali_configurati && (float)($dipendente->percentuale_part_time ?? 100) < 100) {
            return response()->json([
                'error' => 'Impossibile inserire presenze: il dipendente part-time non ha la configurazione orari settimanali completata'
            ], 403);
        }
        
        // Calcola il giorno della settimana per la data
        $data = \Carbon\Carbon::parse($request->data);
        $giornoSettimana = $data->dayOfWeek; // 0=Dom, 1=Lun, etc.
        
        // Ottieni le ore previste per questo giorno specifico
        $oreOrdinarieMax = $dipendente->getOrePrevistePerGiorno($giornoSettimana);
        
        // Per ora manteniamo il limite di 4 ore straordinarie giornaliere
        // (può essere reso configurabile in futuro)
        $oreStraordinarieMax = 4;
        
        // Per causali come ferie/malattia, le ore_causale devono corrispondere alle ore previste per quel giorno
        // Non un valore fisso di 8 ore
        $oreCausaleMax = $oreOrdinarieMax;

        $validated = $request->validate([
            'dipendente_id' => 'required|exists:dipendenti,id',
            'data' => 'required|date',
            'ore_ordinarie' => "nullable|numeric|min:0",
            'ore_straordinarie' => "nullable|numeric|min:0|max:$oreStraordinarieMax",
            'ore_supplementari' => "nullable|numeric|min:0",
            'ore_causale' => "nullable|numeric|min:0|max:$oreCausaleMax",
            'causale' => 'required|in:lavoro,ferie,permesso_rol,malattia,maternita,infortunio,assemblea',
            'modalita_lavoro' => 'nullable|in:in_sede,smart_working,trasferta',
        ]);
        
        // GESTIONE SUPPLEMENTARI:
        // Per i dipendenti part-time con configurazione orari settimanali,
        // le ore che superano il limite ordinario del giorno diventano supplementari
        if ((float)($dipendente->percentuale_part_time ?? 100) < 100) {
            $oreInserite = (float)($validated['ore_ordinarie'] ?? 0);
            
            if ($oreInserite > $oreOrdinarieMax) {
                // Sposta l'eccedenza in supplementari
                $validated['ore_supplementari'] = $oreInserite - $oreOrdinarieMax;
                $validated['ore_ordinarie'] = $oreOrdinarieMax;
            }
        }
        
        // Validazione: ore_ordinarie + ore_causale non devono superare il limite giornaliero
        // (per causali diverse da lavoro come assemblea, ferie, permesso, ecc.)
        if (isset($validated['causale']) && $validated['causale'] !== 'lavoro') {
            $totaleOre = (float)($validated['ore_ordinarie'] ?? 0) + (float)($validated['ore_causale'] ?? 0);
            if ($totaleOre > $oreOrdinarieMax) {
                return response()->json([
                    'error' => 'La somma tra ore ordinarie e ore di causale supera il limite giornaliero previsto (' . $oreOrdinarieMax . ' ore)'
                ], 422);
            }
        }

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
        // Recupera il dipendente con eager loading
        $dipendente = \App\Models\Dipendente::with(['contratto.regoleCalcolo', 'orariSettimanali'])->find($presenza->dipendente_id);
        
        if (!$dipendente) {
            return response()->json(['error' => 'Dipendente non trovato'], 404);
        }
        
        // BLOCCO: Per dipendenti part-time, serve la configurazione orari settimanali
        if (!$dipendente->has_orari_settimanali_configurati && (float)($dipendente->percentuale_part_time ?? 100) < 100) {
            return response()->json([
                'error' => 'Impossibile aggiornare presenze: il dipendente part-time non ha la configurazione orari settimanali completata'
            ], 403);
        }
        
        // Calcola il giorno della settimana per la data
        $data = \Carbon\Carbon::parse($presenza->data);
        $giornoSettimana = $data->dayOfWeek;
        
        // Ottieni le ore previste per questo giorno specifico
        $oreOrdinarieMax = $dipendente->getOrePrevistePerGiorno($giornoSettimana);
        $oreStraordinarieMax = 4;
        $oreCausaleMax = $oreOrdinarieMax;

        $validated = $request->validate([
            'ore_ordinarie' => "nullable|numeric|min:0",
            'ore_straordinarie' => "nullable|numeric|min:0|max:$oreStraordinarieMax",
            'ore_supplementari' => "nullable|numeric|min:0",
            'ore_causale' => "nullable|numeric|min:0|max:$oreCausaleMax",
            'causale' => 'sometimes|in:lavoro,ferie,permesso_rol,malattia,maternita,infortunio,assemblea',
            'stato' => 'sometimes|in:bozza,inviato,approvato,rifiutato',
            'modalita_lavoro' => 'nullable|in:in_sede,smart_working,trasferta',
        ]);
        
        // GESTIONE SUPPLEMENTARI:
        if ((float)($dipendente->percentuale_part_time ?? 100) < 100) {
            $oreInserite = (float)($validated['ore_ordinarie'] ?? ($presenza->ore_ordinarie ?? 0));
            
            if ($oreInserite > $oreOrdinarieMax) {
                $validated['ore_supplementari'] = $oreInserite - $oreOrdinarieMax;
                $validated['ore_ordinarie'] = $oreOrdinarieMax;
            }
        }
        
        // Validazione: ore_ordinarie + ore_causale non devono superare il limite giornaliero
        // (per causali diverse da lavoro come assemblea, ferie, permesso, ecc.)
        $causaleCorrente = isset($validated['causale']) ? $validated['causale'] : $presenza->causale;
        if ($causaleCorrente !== 'lavoro') {
            $totaleOre = (float)($validated['ore_ordinarie'] ?? $presenza->ore_ordinarie ?? 0) + 
                        (float)($validated['ore_causale'] ?? $presenza->ore_causale ?? 0);
            if ($totaleOre > $oreOrdinarieMax) {
                return response()->json([
                    'error' => 'La somma tra ore ordinarie e ore di causale supera il limite giornaliero previsto (' . $oreOrdinarieMax . ' ore)'
                ], 422);
            }
        }

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
        try {
            $validated = $request->validate([
                'dipendente_id' => 'required|exists:dipendenti,id',
                'mese' => 'required|integer|min:1|max:12',
                'anno' => 'required|integer',
            ]);

            // Controlla se ci sono presenze con stato 'rifiutato' o 'reinviato' per questo mese
            $esisteRifiutatoOReinviato = Presenza::where('dipendente_id', $validated['dipendente_id'])
                ->whereMonth('data', $validated['mese'])
                ->whereYear('data', $validated['anno'])
                ->whereIn('stato', ['rifiutato', 'reinviato'])
                ->exists();

            $nuovoStato = $esisteRifiutatoOReinviato ? 'reinviato' : 'inviato';

            $updated = Presenza::where('dipendente_id', $validated['dipendente_id'])
                ->whereMonth('data', $validated['mese'])
                ->whereYear('data', $validated['anno'])
                ->update(['stato' => $nuovoStato]);

            if ($updated === 0) {
                return response()->json([
                    'error' => 'Nessuna presenza trovata per questo dipendente/mese/anno. Salva prima le presenze.'
                ], 404);
            }

            return response()->json(['message' => 'Mese inviato per approvazione']);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Errore durante l\'invio: ' . $e->getMessage()
            ], 500);
        }
    }

    public function inAttesa()
    {
        $mesi = Presenza::with('dipendente.user')
            ->whereIn('stato', ['inviato', 'approvato', 'rifiutato', 'reinviato'])
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
                    'totale_ore_supplementari' => $gruppo->sum('ore_supplementari'),
                    'percentuale_part_time' => $prima->dipendente->percentuale_part_time ?? 100,
                    'stato' => $prima->stato,
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
            'stato' => 'required|in:approvato,rifiutato,reinviato',
        ]);

        Presenza::where('dipendente_id', $validated['dipendente_id'])
            ->whereMonth('data', $validated['mese'])
            ->whereYear('data', $validated['anno'])
            ->update(['stato' => $validated['stato']]);

        return response()->json(['message' => 'Stato aggiornato con successo']);
    }

    public function mesiApprovati()
    {
        $mesi = Presenza::with('dipendente.user')
            ->where('stato', 'approvato')
            ->get()
            ->groupBy(function ($p) {
                return substr($p->data, 0, 7);
            })
            ->map(function ($gruppo) {
                $prima = $gruppo->first();
                return [
                    'dipendente_id' => $prima->dipendente_id,
                    'dipendente_nome' => $prima->dipendente->user->name,
                    'mese' => (int) substr($prima->data, 5, 2),
                    'anno' => (int) substr($prima->data, 0, 4),
                ];
            })
            ->values()
            ->unique(function ($item) {
                return $item['mese'] . '-' . $item['anno'];
            });

        return $mesi;
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

        // Recupera il dipendente con gli orari settimanali
        $dipendente = \App\Models\Dipendente::with(['contratto.regoleCalcolo', 'orariSettimanali'])->find($validated['dipendente_id']);
        
        if (!$dipendente) {
            return response()->json(['error' => 'Dipendente non trovato'], 404);
        }
        
        // BLOCCO: Per dipendenti part-time, serve la configurazione orari settimanali
        if (!$dipendente->has_orari_settimanali_configurati && (float)($dipendente->percentuale_part_time ?? 100) < 100) {
            return response()->json([
                'error' => 'Impossibile registrare malattia: il dipendente part-time non ha la configurazione orari settimanali completata'
            ], 403);
        }

        $inizio = Carbon::parse($validated['data_inizio']);
        $fine = Carbon::parse($validated['data_fine']);
        $righeCreate = [];

        for ($giorno = $inizio->copy(); $giorno->lte($fine); $giorno->addDay()) {
            // Calcola le ore previste per questo giorno specifico
            $giornoSettimana = $giorno->dayOfWeek;
            $orePreviste = $dipendente->getOrePrevistePerGiorno($giornoSettimana);
            
            $presenza = Presenza::updateOrCreate(
                [
                    'dipendente_id' => $validated['dipendente_id'],
                    'data' => $giorno->format('Y-m-d'),
                ],
                [
                    'causale' => 'malattia',
                    'ore_ordinarie' => 0,
                    'ore_straordinarie' => 0,
                    'ore_supplementari' => 0,
                    'ore_causale' => $orePreviste,
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