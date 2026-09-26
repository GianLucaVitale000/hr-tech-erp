<?php

namespace App\Http\Controllers;

use App\Models\Presenza;
use App\Models\Dipendente;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Firebase\JWT\JWT;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\Key;

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
            'usa_qr' => 'boolean',
            'pausa_ore' => 'nullable|numeric|min:0|max:8',
            'fonte_dato' => 'nullable|string|in:MANUALE,QR_CODE',
        ]);

        // 🔒 GESTIONE FLAG USA_QR: Validazione vincoli e azzeramento campi ore
        if (isset($validated['usa_qr']) && $validated['usa_qr']) {
            // Recupera il dipendente
            $dipendente = \App\Models\Dipendente::with(['contratto.regoleCalcolo', 'orariSettimanali'])->find($validated['dipendente_id']);
            
            // Verifica che il dipendente sia tempo pieno
            if ((float)($dipendente->percentuale_part_time ?? 100) < 100) {
                return response()->json(['error' => 'QR Code disabilitato per dipendenti part-time'], 403);
            }
            // Verifica che causale sia 'lavoro'
            if (($validated['causale'] ?? 'lavoro') !== 'lavoro') {
                return response()->json(['error' => 'QR Code consentito solo per causale "lavoro"'], 403);
            }
            // Verifica che modalita_lavoro sia 'in_sede'
            if (($validated['modalita_lavoro'] ?? 'in_sede') !== 'in_sede') {
                return response()->json(['error' => 'QR Code consentito solo per modalità "in sede"'], 403);
            }
            
            // Se usa QR, imposta i campi ore a 0 (verranno calcolati automaticamente al CHECK_OUT)
            // NOTE: Non usare NULL perché il database ha NOT NULL constraint con default 0
            $validated['ore_ordinarie'] = 0;
            $validated['ore_straordinarie'] = 0;
            $validated['ore_eccedenti'] = 0;
            $validated['ore_causale'] = 0;
            $validated['pausa_ore'] = $validated['pausa_ore'] ?? 0;
            $validated['fonte_dato'] = 'QR_CODE';
            
            // Se sta salvando una nuova presenza, non impostare ora_ingresso/ora_uscita
            // (verranno impostati dal QR scan)
            if (!isset($validated['ora_ingresso'])) {
                $validated['ora_ingresso'] = null;
            }
            if (!isset($validated['ora_uscita'])) {
                $validated['ora_uscita'] = null;
            }
        } else {
            $validated['fonte_dato'] = 'MANUALE';
        }

        // GESTIONE CAUSALI A GIORNATA INTERA: auto-imposta ore_causale = orePreviste
        // se il frontend non lo ha già valorizzato (o lo ha mandato a 0).
        // Questo tutela i salvataggi fatti prima del fix del frontend, e i part-time
        // che hanno distribuzioni orarie settimanali specifiche per giorno.
        $causaliGiornataIntera = ['ferie', 'malattia', 'maternita', 'infortunio'];
        if (
            isset($validated['causale']) &&
            in_array($validated['causale'], $causaliGiornataIntera, true) &&
            (float)($validated['ore_causale'] ?? 0) === 0.0
        ) {
            $validated['ore_causale'] = $oreOrdinarieMax;
            $validated['ore_ordinarie'] = 0;
        }

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
            'usa_qr' => 'boolean',
            'pausa_ore' => 'nullable|numeric|min:0|max:8',
        ]);

        // 🔒 GESTIONE FLAG USA_QR: Validazione vincoli
        if (isset($validated['usa_qr']) && $validated['usa_qr']) {
            // Verifica che il dipendente sia tempo pieno
            if ((float)($dipendente->percentuale_part_time ?? 100) < 100) {
                return response()->json(['error' => 'QR Code disabilitato per dipendenti part-time'], 403);
            }
            // Verifica che causale sia 'lavoro'
            $causaleCorrente = $validated['causale'] ?? $presenza->causale;
            if ($causaleCorrente !== 'lavoro') {
                return response()->json(['error' => 'QR Code consentito solo per causale "lavoro"'], 403);
            }
            // Verifica che modalita_lavoro sia 'in_sede'
            $modalitaCorrente = $validated['modalita_lavoro'] ?? $presenza->modalita_lavoro;
            if ($modalitaCorrente !== 'in_sede') {
                return response()->json(['error' => 'QR Code consentito solo per modalità "in sede"'], 403);
            }
            
            // Se attiva QR, imposta i campi ore a 0 (verranno calcolati automaticamente al CHECK_OUT)
            // NOTE: Non usare NULL perché il database ha NOT NULL constraint con default 0
            $validated['ore_ordinarie'] = 0;
            $validated['ore_straordinarie'] = 0;
            $validated['ore_eccedenti'] = 0;
            $validated['ore_causale'] = 0;
            $validated['pausa_ore'] = $validated['pausa_ore'] ?? ($presenza->pausa_ore ?? 0);
            $validated['fonte_dato'] = 'QR_CODE';
        } else {
            // Se disattiva QR, assicurati che fonte_dato sia MANUALE
            $validated['fonte_dato'] = 'MANUALE';
        }

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

    /**
     * Genera un token JWT per il QR Code di una presenza specifica
     * Solo per dipendenti tempo pieno con flag usa_qr attivo
     * 
     * @param Request $request
     * @param Presenza $presenza
     * @return \Illuminate\Http\JsonResponse
     */
    public function generateQrToken(Request $request, Presenza $presenza)
    {
        $user = $request->user();

        // Verifica autenticazione
        if (!$user) {
            return response()->json(['error' => 'Non autenticato'], 401);
        }

        // Carica le relazioni necessarie
        $user->load('dipendente');
        $presenza->load('dipendente');

        // Verifica che l'utente abbia un dipendente associato
        if (!$user->dipendente) {
            return response()->json(['error' => 'Utente non associato a un dipendente'], 403);
        }

        // Verifica che la presenza abbia un dipendente
        if (!$presenza->dipendente) {
            return response()->json(['error' => 'Dipendente non trovato per questa presenza'], 404);
        }

        // Verifica che l'utente sia il proprietario della presenza
        if ($presenza->dipendente_id !== $user->dipendente->id) {
            return response()->json(['error' => 'Non autorizzato a generare QR per questa presenza'], 403);
        }

        $dipendente = $presenza->dipendente;

        // Verifica che il dipendente sia tempo pieno
        if ((float)($dipendente->percentuale_part_time ?? 100) < 100) {
            return response()->json(['error' => 'QR Code disabilitato per dipendenti part-time'], 403);
        }

        // Verifica vincoli per QR
        if (!$presenza->usa_qr) {
            return response()->json(['error' => 'QR Code non attivo per questa presenza'], 403);
        }
        if ($presenza->causale !== 'lavoro') {
            return response()->json(['error' => 'QR Code consentito solo per causale "lavoro"'], 403);
        }
        if ($presenza->modalita_lavoro !== 'in_sede') {
            return response()->json(['error' => 'QR Code consentito solo per modalità "in sede"'], 403);
        }

        // Verifica che non ci siano già timbrature complete
        if ($presenza->ora_ingresso && $presenza->ora_uscita) {
            return response()->json(['error' => 'Timbrature già complete per questa presenza'], 400);
        }

        $payload = [
            'user_id' => $user->id,
            'dipendente_id' => $dipendente->id,
            'presenza_id' => $presenza->id,
            'data' => \Carbon\Carbon::parse($presenza->data)->toDateString(),
            'exp' => Carbon::now()->addSeconds(30)->timestamp,  // Scade dopo 30 secondi
        ];

        // Controlla che config app.key esista
        $appKey = config('app.key');
        if (empty($appKey)) {
            return response()->json(['error' => 'Configurazione applicazione non valida'], 500);
        }

        try {
            $token = JWT::encode($payload, $appKey, 'HS256');
            return ['qr_token' => $token];
        } catch (\Exception $e) {
            return response()->json(['error' => 'Errore nella generazione del token: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Elabora la scansione del QR Code dal tablet
     * Registra CHECK_IN o CHECK_OUT in base allo stato attuale
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function scanQrCode(Request $request)
    {
        $request->validate(['qr_token' => 'required|string']);

        try {
            $payload = JWT::decode($request->qr_token, new Key(config('app.key'), 'HS256'));
            
            $presenza = Presenza::findOrFail($payload->presenza_id);
            $dipendente = $presenza->dipendente;

            // Verifica che il token corrisponda alla presenza
            if ($payload->dipendente_id !== $dipendente->id || $payload->data !== $presenza->data) {
                throw new \Exception('Token non valido per questa presenza');
            }

            // Verifica che la presenza sia ancora configurata per QR
            if (!$presenza->usa_qr || $presenza->causale !== 'lavoro' || $presenza->modalita_lavoro !== 'in_sede') {
                throw new \Exception('Presenza non configurata per QR Code');
            }

            // Verifica che il dipendente sia tempo pieno
            if ((float)($dipendente->percentuale_part_time ?? 100) < 100) {
                throw new \Exception('QR Code disabilitato per dipendenti part-time');
            }

            $now = Carbon::now()->format('H:i:s');

            if (!$presenza->ora_ingresso) {
                // Prima timbratura = CHECK_IN
                $presenza->update([
                    'ora_ingresso' => $now,
                    'fonte_dato' => 'QR_CODE'
                ]);
                return ['message' => 'Ingresso registrato alle ' . $now];
            }
            elseif (!$presenza->ora_uscita) {
                // Seconda timbratura = CHECK_OUT
                // Usa la data della presenza + l'orario per evitare problemi con Carbon::parse
                // che altrimenti userebbe la data corrente reale invece di quella mockata
                $ingresso = Carbon::parse($presenza->data . ' ' . $presenza->ora_ingresso);
                $uscita = Carbon::parse($presenza->data . ' ' . $now);
                $oreLavorate = $ingresso->diffInMinutes($uscita) / 60;
                $pausaOre = (float)($presenza->pausa_ore ?? 0);
                
                // Arrotondamento a blocchi di 15 minuti (0.25, 0.50, 0.75, 1.00, ...)
                $oreLavorate = round($oreLavorate * 4) / 4;
                
                // Protezione: pausa non può superare le ore lavorate → valore minimo 0.00
                $oreNette = max(0, $oreLavorate - $pausaOre);

                // Calcola ore ordinarie/straordinarie in base al contratto
                $dataPresenza = Carbon::parse($presenza->data);
                $oreOrdinarieMax = $dipendente->getOrePrevistePerGiorno($dataPresenza->dayOfWeek);
                
                // Arrotondamento finale a blocchi di 15 minuti
                $oreStraordinarie = round(max(0, $oreNette - $oreOrdinarieMax) * 4) / 4;
                $oreOrdinarie = round(min($oreNette, $oreOrdinarieMax) * 4) / 4;

                $presenza->update([
                    'ora_uscita' => $now,
                    'ore_ordinarie' => $oreOrdinarie,
                    'ore_straordinarie' => $oreStraordinarie,
                    'fonte_dato' => 'QR_CODE'
                ]);

                return [
                    'message' => 'Uscita registrata alle ' . $now,
                    'ore' => $oreNette,
                    'ore_ordinarie' => $oreOrdinarie,
                    'ore_straordinarie' => $oreStraordinarie
                ];
            }
            else {
                return response()->json(['error' => 'Timbrature già complete per questa presenza'], 400);
            }

        } catch (ExpiredException $e) {
            return response()->json(['error' => 'QR Code scaduto. Generane uno nuovo.'], 400);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
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
                    'totale_ore_ordinarie' => round($gruppo->sum('ore_ordinarie'), 2),
                    'totale_ore_straordinarie' => round($gruppo->sum('ore_straordinarie'), 2),
                    'totale_ore_eccedenti' => round($gruppo->sum('ore_eccedenti'), 2),
                    'percentuale_part_time' => $prima->dipendente->percentuale_part_time ?? 100,
                    'stato' => $prima->stato,
                ];
            })
            ->values()
            ->sortBy([
                ['anno', 'desc'],
                ['mese', 'asc'],
                ['dipendente_nome', 'desc']
            ])
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
            })
            ->sortBy([
                ['anno', 'asc'],
                ['mese', 'asc']
            ])
            ->values();

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
                    'pausa_ore' => 0,
                    'fonte_dato' => 'MANUALE',
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
                    'pausa_ore' => 0,
                    'fonte_dato' => 'MANUALE',
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

    /**
     * Endpoint interno per fornire i dati strutturati delle presenze approvate al microservizio Python
     */
    public function exportDataForPython(Request $request)
    {
        $mese = $request->input('mese');
        $anno = $request->input('anno');

        if (!$mese || !$anno) {
            return response()->json(['error' => 'Parametri mese e anno obbligatori'], 400);
        }

        $presenze = Presenza::with(['dipendente.user', 'dipendente.contratto', 'dipendente.regoleCalcolo'])
            ->whereMonth('data', $mese)
            ->whereYear('data', $anno)
            ->where('stato', 'approvato')
            ->orderBy('data')
            ->get();

        return response()->json([
            'mese' => (int)$mese,
            'anno' => (int)$anno,
            'totale_righe' => $presenze->count(),
            'presenze' => $presenze
        ]);
    }
}