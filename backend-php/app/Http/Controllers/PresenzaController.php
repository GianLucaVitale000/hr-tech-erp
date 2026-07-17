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
        
        // BLOCCO: Contratto scaduto - non si possono inserire presenze
        if ($dipendente->tipo_contratto === 'determinato' && 
            $dipendente->data_scadenza_contratto && 
            \Carbon\Carbon::parse($dipendente->data_scadenza_contratto)->isPast()) {
            return response()->json([
                'error' => 'Impossibile inserire presenze: il contratto di questo dipendente è scaduto il ' . 
                           \Carbon\Carbon::parse($dipendente->data_scadenza_contratto)->format('d/m/Y')
            ], 403);
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
        
        // Limite consigliato per ore straordinarie giornaliere
        $oreStraordinarieLimiteConsigliato = 4;
        
        // Per causali come ferie/malattia, le ore_causale devono corrispondere alle ore previste per quel giorno
        // Non un valore fisso di 8 ore
        $oreCausaleMax = $oreOrdinarieMax;

        $validated = $request->validate([
            'dipendente_id' => 'required|exists:dipendenti,id',
            'data' => 'required|date',
            'ore_ordinarie' => "nullable|numeric|min:0",
            'ore_straordinarie' => "nullable|numeric|min:0",
            'ore_eccedenti' => "nullable|numeric|min:0",
            'ore_causale' => "nullable|numeric|min:0|max:$oreCausaleMax",
            'causale' => 'required|in:lavoro,ferie,permesso_rol,permesso_retribuito,permesso_non_retribuito,malattia,maternita,infortunio,assemblea,sciopero,cassa_integrazione',
            'modalita_lavoro' => 'nullable|in:in_sede,smart_working,trasferta',
        ]);

        // GESTIONE CASSA INTEGRAZIONE: calcolo automatico ore_ordinarie per differenza
        // e blocco ore_straordinarie
        if (isset($validated['causale']) && $validated['causale'] === 'cassa_integrazione') {
            // Calcola ore_ordinarie = ore_previste - ore_causale (differenza)
            if (isset($validated['ore_causale']) && $validated['ore_causale'] > 0) {
                $validated['ore_ordinarie'] = $oreOrdinarieMax - (float)$validated['ore_causale'];
            }
            // Blocca ore_straordinarie per cassa integrazione
            if (isset($validated['ore_straordinarie']) && (float)$validated['ore_straordinarie'] > 0) {
                return response()->json([
                    'error' => 'Per la cassa integrazione non è possibile inserire ore straordinarie. Le ore ordinarie vengono calcolate automaticamente come differenza.'
                ], 422);
            }
        }

        // SPLIT AUTOMATICO: Se ore_ordinarie supera il limite giornaliero,
        // sposta l'eccedenza in ore_straordinarie (solo per causale = lavoro)
        if (isset($validated['causale']) && $validated['causale'] === 'lavoro' &&
            isset($validated['ore_ordinarie']) && (float)$validated['ore_ordinarie'] > $oreOrdinarieMax) {
            $eccedenza = (float)$validated['ore_ordinarie'] - $oreOrdinarieMax;
            $validated['ore_straordinarie'] = (float)($validated['ore_straordinarie'] ?? 0) + $eccedenza;
            $validated['ore_ordinarie'] = $oreOrdinarieMax;
        }

        // Warning se ore straordinarie superano il limite consigliato
        if (isset($validated['ore_straordinarie']) && (float)$validated['ore_straordinarie'] > $oreStraordinarieLimiteConsigliato) {
            $validated['warning'] = 'Attenzione: superato limite consigliato di straordinario giornaliero';
        }
        
        // GESTIONE ORE ECCEDENTI (per part-time):
        // Il frontend gestisce già correttamente la ripartizione per part-time,
        // quindi non sovrascriviamo i valori. Mantieni solo i valori forniti.
        
        // Validazione: ore_ordinarie + ore_causale non devono superare il limite giornaliero
        // (per causali diverse da lavoro e assemblea: permesso_rol, PR, PNR, ferie, malattia, ecc.)
        // Per l'assemblea, permettiamo che il totale superi il limite (l'eccedenza va in ore_eccedenti)
        if (isset($validated['causale']) && 
            $validated['causale'] !== 'lavoro' && 
            $validated['causale'] !== 'assemblea') {
            $totaleOre = (float)($validated['ore_ordinarie'] ?? 0) + (float)($validated['ore_causale'] ?? 0);
            if ($totaleOre > $oreOrdinarieMax) {
                return response()->json([
                    'error' => 'La somma tra ore ordinarie e ore di causale supera il limite giornaliere previsto (' . $oreOrdinarieMax . ' ore)'
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
        
        // BLOCCO: Contratto scaduto - non si possono modificare presenze
        if ($dipendente->tipo_contratto === 'determinato' && 
            $dipendente->data_scadenza_contratto && 
            \Carbon\Carbon::parse($dipendente->data_scadenza_contratto)->isPast()) {
            return response()->json([
                'error' => 'Impossibile modificare presenze: il contratto di questo dipendente è scaduto il ' . 
                           \Carbon\Carbon::parse($dipendente->data_scadenza_contratto)->format('d/m/Y')
            ], 403);
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
        
        // Limite consigliato per ore straordinarie giornaliere
        $oreStraordinarieLimiteConsigliato = 4;
        
        $oreCausaleMax = $oreOrdinarieMax;

        $validated = $request->validate([
            'ore_ordinarie' => "nullable|numeric|min:0",
            'ore_straordinarie' => "nullable|numeric|min:0",
            'ore_eccedenti' => "nullable|numeric|min:0",
            'ore_causale' => "nullable|numeric|min:0|max:$oreCausaleMax",
            'causale' => 'sometimes|in:lavoro,ferie,permesso_rol,permesso_retribuito,permesso_non_retribuito,malattia,maternita,infortunio,assemblea,sciopero,cassa_integrazione',
            'stato' => 'sometimes|in:bozza,inviato,approvato,rifiutato',
            'modalita_lavoro' => 'nullable|in:in_sede,smart_working,trasferta',
        ]);

        // GESTIONE CASSA INTEGRAZIONE: calcolo automatico ore_ordinarie per differenza
        // e blocco ore_straordinarie
        $causaleCorrente = isset($validated['causale']) ? $validated['causale'] : $presenza->causale;
        if ($causaleCorrente === 'cassa_integrazione') {
            // Calcola ore_ordinarie = ore_previste - ore_causale (differenza)
            if (isset($validated['ore_causale']) && $validated['ore_causale'] > 0) {
                $validated['ore_ordinarie'] = $oreOrdinarieMax - (float)$validated['ore_causale'];
            }
            // Blocca ore_straordinarie per cassa integrazione
            if (isset($validated['ore_straordinarie']) && (float)$validated['ore_straordinarie'] > 0) {
                return response()->json([
                    'error' => 'Per la cassa integrazione non è possibile inserire ore straordinarie. Le ore ordinarie vengono calcolate automaticamente come differenza.'
                ], 422);
            }
        }

        // SPLIT AUTOMATICO: Se ore_ordinarie supera il limite giornaliero,
        // sposta l'eccedenza in ore_straordinarie (solo per causale = lavoro)
        if ((isset($validated['causale']) ? $validated['causale'] : $presenza->causale) === 'lavoro' &&
            isset($validated['ore_ordinarie']) && (float)$validated['ore_ordinarie'] > $oreOrdinarieMax) {
            $eccedenza = (float)$validated['ore_ordinarie'] - $oreOrdinarieMax;
            $validated['ore_straordinarie'] = (float)($validated['ore_straordinarie'] ?? $presenza->ore_straordinarie ?? 0) + $eccedenza;
            $validated['ore_ordinarie'] = $oreOrdinarieMax;
        }

        // Warning se ore straordinarie superano il limite consigliato
        if (isset($validated['ore_straordinarie']) && (float)$validated['ore_straordinarie'] > $oreStraordinarieLimiteConsigliato) {
            $validated['warning'] = 'Attenzione: superato limite consigliato di straordinario giornaliero';
        }
        
        // GESTIONE ORE ECCEDENTI:
        // Il frontend gestisce già correttamente la ripartizione per part-time,
        // quindi non sovrascriviamo i valori. Mantieni solo i valori forniti.
        
        // Validazione: ore_ordinarie + ore_causale non devono superare il limite giornaliero
        // (per causali diverse da lavoro e assemblea: permesso_rol, PR, PNR, ferie, malattia, ecc.)
        // Per l'assemblea, permettiamo che il totale superi il limite (l'eccedenza va in ore_eccedenti)
        // NOTE: Usiamo i valori vecchi per i campi non inviati (il frontend deve inviare tutti i campi quando cambia causale)
        $causaleCorrente = isset($validated['causale']) ? $validated['causale'] : $presenza->causale;
        if ($causaleCorrente !== 'lavoro' && 
            $causaleCorrente !== 'assemblea') {
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
                    'totale_ore_eccedenti' => $gruppo->sum('ore_eccedenti'),
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
                    'ore_eccedenti' => 0,
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

    // Registra un periodo di cassa integrazione su più giorni, anche a cavallo di mesi diversi
    public function registraCassaIntegrazione(Request $request)
    {
        $validated = $request->validate([
            'dipendente_id' => 'required|exists:dipendenti,id',
            'data_inizio' => 'required|date',
            'data_fine' => 'required|date|after_or_equal:data_inizio',
            'percentuale' => 'required|numeric|min:0|max:100',
        ]);

        // Recupera il dipendente con gli orari settimanali
        $dipendente = \App\Models\Dipendente::with(['contratto.regoleCalcolo', 'orariSettimanali'])->find($validated['dipendente_id']);
        
        if (!$dipendente) {
            return response()->json(['error' => 'Dipendente non trovato'], 404);
        }
        
        // BLOCCO: Per dipendenti part-time, serve la configurazione orari settimanali
        if (!$dipendente->has_orari_settimanali_configurati && (float)($dipendente->percentuale_part_time ?? 100) < 100) {
            return response()->json([
                'error' => 'Impossibile registrare cassa integrazione: il dipendente part-time non ha la configurazione orari settimanali completata'
            ], 403);
        }

        $inizio = Carbon::parse($validated['data_inizio']);
        $fine = Carbon::parse($validated['data_fine']);
        $percentuale = (float)$validated['percentuale'];
        $righeCreate = [];

        for ($giorno = $inizio->copy(); $giorno->lte($fine); $giorno->addDay()) {
            $dataStr = $giorno->format('Y-m-d');
            
            // Escludi i giorni già registrati come malattia
            $esisteMalattia = Presenza::where('dipendente_id', $validated['dipendente_id'])
                ->where('data', $dataStr)
                ->where('causale', 'malattia')
                ->exists();
            
            if ($esisteMalattia) {
                continue; // Salta questo giorno
            }
            
            // Calcola le ore previste per questo giorno specifico
            $giornoSettimana = $giorno->dayOfWeek;
            $orePreviste = $dipendente->getOrePrevistePerGiorno($giornoSettimana);
            $oreCausale = $orePreviste * ($percentuale / 100);
            
            $presenza = Presenza::updateOrCreate(
                [
                    'dipendente_id' => $validated['dipendente_id'],
                    'data' => $dataStr,
                ],
                [
                    'causale' => 'cassa_integrazione',
                    'ore_ordinarie' => 0,
                    'ore_straordinarie' => 0,
                    'ore_eccedenti' => 0,
                    'ore_causale' => $oreCausale,
                    'modalita_lavoro' => null,
                    'data_inizio_cassa_integrazione' => $validated['data_inizio'],
                    'data_fine_cassa_integrazione' => $validated['data_fine'],
                    'percentuale_cassa_integrazione' => $percentuale,
                ]
            );
            $righeCreate[] = $presenza;
        }

        return response()->json([
            'message' => 'Periodo di cassa integrazione registrato',
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