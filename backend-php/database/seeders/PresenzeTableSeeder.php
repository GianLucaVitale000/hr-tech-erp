<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Faker\Factory as Faker;
use App\Models\Dipendente;
use App\Models\Presenza;
use Carbon\Carbon;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

class PresenzeTableSeeder extends Seeder
{
    public function run()
    {
        // Pulizia dati esistenti per evitare duplicati
        Presenza::truncate();
        
        $faker = Faker::create('it_IT');
        $today = Carbon::today();
        
        // Calcola l'inizio del mese corrente per determinare gli stati
        $inizioMeseCorrente = $today->copy()->firstOfMonth();

        $dipendenti = Dipendente::with('user')->get();

        foreach ($dipendenti as $dipendente) {
            // --- 1. Periodo di attività ---
            $dataAssunzione = Carbon::parse($dipendente->data_assunzione);
            $dataCessazione = null;

            if ($dipendente->tipo_contratto === 'determinato' && $dipendente->data_scadenza_contratto) {
                $dataCessazione = Carbon::parse($dipendente->data_scadenza_contratto);
            }

            $dataInizio = $dataAssunzione->copy();
            $dataFine = $dataCessazione ? $dataCessazione->copy() : $today->copy();

            // --- 2. Variabili di stato ---
            $ferieConsecutive = 0;
            $inMalattia = false;
            $inInfortunio = false;
            $inMaternita = false;
            $inFerie = false;
            $inSciopero = false;
            $dataFineMalattia = null;
            $dataFineInfortunio = null;
            $dataFineMaternita = null;
            $dataFineSciopero = null;
            
            // --- 2b. Variabili per gestione ferie estate ---
            $ferieEstateGiorni = 0;
            $maxFerieEstate = 15; // Massimo 15 giorni di ferie in giugno-luglio-agosto
            $ferieEstateAssegnate = false;
            $ferieEstateInCorso = false;
            $ferieEstateConsecutive = 0;
            
            // --- 2c. Flag per Maria Carta ---
            $isMariaCarta = ($dipendente->user && ($dipendente->user->name === 'Maria Carta' || $dipendente->user->name === 'Maria Carte')) || 
                           ($dipendente->user && ($dipendente->user->email === 'maria.carta@example.com' || $dipendente->user->email === 'maria.carte@example.com'));
            $maternitaMariaCartaAssegnata = false;
            $postMaternitaFerieSmaltite = false;
            $inSmaltimentoFerieMariaCarta = false;
            $smaltimentoFerieConsecutive = 0;

            // --- 3. MATERNITÀ: solo per donne (F) ---
            // Per Maria Carta: sola maternità nel 2024
            if ($dipendente->sesso === 'F') {
                if ($isMariaCarta) {
                    // Maria Carta: maternità solo nel 2024, 150 giorni di calendario
                    $anno2024Inizio = Carbon::create(2024, 1, 1);
                    $anno2024Fine = Carbon::create(2024, 12, 31);
                    
                    // Verifica se il 2024 è nel suo periodo di attività
                    if ($dataInizio->lte($anno2024Fine) && $dataFine->gte($anno2024Inizio)) {
                        $inizioMaternita = $faker->dateTimeBetween(
                            $dataInizio->copy()->max($anno2024Inizio),
                            $dataFine->copy()->min($anno2024Fine->copy()->subDays(150))
                        );
                        $inizioMaternita = Carbon::parse($inizioMaternita);
                        $dataFineMaternita = $inizioMaternita->copy()->addDays(150);
                        $inMaternita = true;
                        $maternitaMariaCartaAssegnata = true;
                    }
                } else {
                    // Altre donne: 80% di probabilità
                    if ($faker->boolean(80)) {
                        $inizioMaternita = $faker->dateTimeBetween($dataInizio, $dataFine);
                        $inizioMaternita = Carbon::parse($inizioMaternita);
                        $dataFineMaternita = $inizioMaternita->copy()->addDays(150);
                        $inMaternita = true;
                    }
                }
            }

            // --- 4. Itera giorno per giorno ---
            for ($date = $dataInizio->copy(); $date->lte($dataFine); $date->addDay()) {
                // Inizializza variabili estate per ogni anno
                if ($date->month === 6 && $date->day === 1) {
                    $inizioEstate = Carbon::create($date->year, 6, 1);
                    $fineEstate = Carbon::create($date->year, 8, 31);
                }
                
                if ($this->isWeekend($date, $dipendente->giorni_lavorativi_settimanali)) {
                    continue;
                }

                // --- 4b. Gestione ferie estate (giugno-luglio-agosto) ---
                // Se siamo in estate e non abbiamo ancora assegnato le ferie estive per quest'anno
                if ($date->month >= 6 && $date->month <= 8 && !$ferieEstateAssegnate) {
                    // Decide se assegnare ferie in estate (70% probabilità)
                    if ($faker->boolean(70)) {
                        // Assegna tra 5 e 15 giorni di ferie in estate
                        $durataFerieEstate = $faker->numberBetween(5, $maxFerieEstate);
                        $ferieEstateAssegnate = true;
                        $ferieEstateInCorso = true;
                        $ferieEstateConsecutive = 1;
                        
                        // Inizia le ferie estive dalla data corrente
                        $inFerie = true;
                        $ferieConsecutive = 1;
                    } else {
                        $ferieEstateAssegnate = true; // Non assegnare ferie in estate
                    }
                }
                
                // Gestione fine ferie estate
                if ($ferieEstateInCorso && $ferieEstateConsecutive >= $durataFerieEstate ?? 15) {
                    $ferieEstateInCorso = false;
                    $ferieEstateConsecutive = 0;
                }

                // --- 5. Gestione fine stati continuativi ---
                if ($inMalattia && $date->gte($dataFineMalattia)) $inMalattia = false;
                if ($inInfortunio && $date->gte($dataFineInfortunio)) $inInfortunio = false;
                if ($inMaternita && $date->gte($dataFineMaternita)) {
                    $inMaternita = false;
                    // Per Maria Carta: dopo la maternità, smaltisci ferie e permessi
                    if ($isMariaCarta && $maternitaMariaCartaAssegnata && !$postMaternitaFerieSmaltite) {
                        $inSmaltimentoFerieMariaCarta = true;
                        $smaltimentoFerieConsecutive = 0;
                        // Inizia lo smaltimento con ferie
                        $inFerie = true;
                        $ferieConsecutive = 1;
                    }
                }
                if ($inFerie && $ferieConsecutive >= 15) {
                    $inFerie = false;
                    $ferieConsecutive = 0;
                }
                if ($ferieEstateInCorso) {
                    $ferieEstateConsecutive++;
                }
                if ($inSciopero && $date->gte($dataFineSciopero)) $inSciopero = false;
                
                // Gestione fine smaltimento ferie Maria Carta
                if ($isMariaCarta && $inSmaltimentoFerieMariaCarta) {
                    $smaltimentoFerieConsecutive++;
                    // Smaltisci per circa 10-20 giorni di ferie/permessi
                    if ($smaltimentoFerieConsecutive >= $faker->numberBetween(10, 20)) {
                        $inSmaltimentoFerieMariaCarta = false;
                        $postMaternitaFerieSmaltite = true;
                        $inFerie = false;
                        $ferieConsecutive = 0;
                    }
                }

                // --- 6. Decidi la causale ---
                $causale = 'lavoro';
                $modalita = $faker->randomElement(['in_sede', 'smart_working', 'trasferta']);

                // --- 6a. Gestione Maria Carta durante smaltimento ferie post-maternità ---
                if ($isMariaCarta && $inSmaltimentoFerieMariaCarta) {
                    // Durante lo smaltimento, alterna tra ferie, permesso_rol e permesso_retribuito
                    $causale = $faker->randomElement([
                        'ferie', 'ferie', 'ferie', 'ferie',
                        'permesso_rol', 'permesso_rol', 'permesso_rol',
                        'permesso_retribuito', 'permesso_retribuito'
                    ]);
                    
                    if ($causale === 'ferie' && !$inFerie) {
                        $inFerie = true;
                        $ferieConsecutive = 1;
                    }
                }

                if ($inMaternita) {
                    $causale = 'maternita';
                } elseif ($inMalattia) {
                    $causale = 'malattia';
                } elseif ($inInfortunio) {
                    $causale = 'infortunio';
                } elseif ($inFerie) {
                    $causale = 'ferie';
                    $ferieConsecutive++;
                } elseif ($inSciopero) {
                    $causale = 'sciopero';
                } else {
                    // --- 6b. Pesi modificati: ridurre infortunio e malattia, aumentare permesso_rol ---
                    // Per Maria Carta: tutto il resto è lavorato (tranne ferie estate)
                    if ($isMariaCarta && !$inMaternita && !$inSmaltimentoFerieMariaCarta && !$ferieEstateInCorso) {
                        $causale = 'lavoro';
                    } else {
                        $causale = $faker->randomElement([
                            'lavoro', 'lavoro', 'lavoro', 'lavoro', 'lavoro',
                            'lavoro', 'lavoro', 'lavoro', 'lavoro', 'lavoro',
                            'lavoro', 'lavoro', 'lavoro', 'lavoro', 'lavoro',
                            'lavoro', 'lavoro', 'lavoro', 'lavoro', 'lavoro',
                            'lavoro', 'lavoro', 'lavoro', 'lavoro', 'lavoro',
                            'lavoro', 'lavoro', 'lavoro', 'lavoro', 'lavoro',
                            'ferie', 'ferie',
                            'permesso_rol', 'permesso_rol', 'permesso_rol', 'permesso_rol',
                            'permesso_retribuito', 'permesso_retribuito',
                            'malattia',
                            'infortunio',
                            'permesso_non_retribuito',
                            'assemblea',
                            'sciopero',
                        ]);
                    }

                    if ($causale === 'ferie') {
                        $inFerie = true;
                        $ferieConsecutive = 1;
                        if ($faker->boolean(30)) {
                            $durataFerie = $faker->numberBetween(2, 15);
                            $ferieConsecutive = min($durataFerie, 15);
                        }
                    } elseif ($causale === 'malattia') {
                        $inMalattia = true;
                        $dataFineMalattia = $date->copy()->addDays($faker->numberBetween(1, 15)); // Ridotto da 30 a 15
                    } elseif ($causale === 'infortunio') {
                        $inInfortunio = true;
                        $dataFineInfortunio = $date->copy()->addDays($faker->numberBetween(2, 30)); // Ridotto da 5-60 a 2-30
                    } elseif ($causale === 'sciopero') {
                        $inSciopero = true;
                        $dataFineSciopero = $date->copy()->addDays($faker->numberBetween(1, 3));
                    }
                }

                // --- 7. Costruisci il record ---
                // Logica stati: mesi passati = approvato, mese corrente = inviato
                $stato = ($date->gte($inizioMeseCorrente)) ? 'inviato' : 'approvato';
                
                $presenza = [
                    'dipendente_id' => $dipendente->id,
                    'data' => $date->toDateString(),
                    'causale' => $causale,
                    'modalita_lavoro' => ($causale === 'lavoro') ? $modalita : null,
                    'stato' => $stato,
                    'fonte_dato' => 'seeder_fake',
                ];

                // --- 8. Campi specifici per causale ---
                $this->populatePresenzaFields($presenza, $dipendente, $date, $causale, $modalita, $faker, $inMalattia, $dataFineMalattia);

                // --- 9. Salva ---
                Presenza::create($presenza);
            }
        }
    }

    // --- METODO AUSILIARIO: Controlla se è weekend ---
    protected function isWeekend($date, $giorniLavorativi)
    {
        if ($giorniLavorativi === 5) {
            return $date->isSaturday() || $date->isSunday();
        } elseif ($giorniLavorativi === 6) {
            return $date->isSunday();
        }
        return false;
    }

    // --- METODO AUSILIARIO: Popola campi specifici ---
    protected function populatePresenzaFields(&$presenza, $dipendente, $date, $causale, $modalita, $faker, $inMalattia, $dataFineMalattia)
    {
        // Calcola ore previste per questo giorno specifico
        $giornoSettimana = $date->dayOfWeek; // 0=Dom, 1=Lun, etc.
        $oreOrdinarieMax = $dipendente->getOrePrevistePerGiorno($giornoSettimana);
        
        // Se getOrePrevistePerGiorno restituisce 0 (part-time senza orariSettimanali configurati),
        // calcola manualmente in base alla percentuale
        if ($oreOrdinarieMax === 0.0 && (float)($dipendente->percentuale_part_time ?? 100) < 100) {
            $oreSettimanali = $dipendente->ore_settimanali ?? 40; // Default 40 ore settimanali
            $oreFullTimeGiornaliere = $oreSettimanali / $dipendente->giorni_lavorativi_settimanali;
            $oreOrdinarieMax = $oreFullTimeGiornaliere * ((float)($dipendente->percentuale_part_time ?? 100) / 100);
        }
        
        // Calcola anche le ore giornaliere medie (per causali non-lavoro)
        $oreSettimanali = $dipendente->ore_settimanali ?? 40; // Default 40 ore settimanali
        $oreGiornaliere = $oreSettimanali / $dipendente->giorni_lavorativi_settimanali;

        switch ($causale) {
            case 'lavoro':
                // Determina se il dipendente è part-time
                $isPartTime = (float)($dipendente->percentuale_part_time ?? 100) < 100;
                
                // Decidi quante ore ha lavorato effettivamente (può superare le ore previste)
                $oreLavorate = round($faker->randomFloat(2, $oreOrdinarieMax, $oreOrdinarieMax + 4), 2);
                
                if ($isPartTime) {
                    // Per part-time: prima ore_eccedenti, poi ore_straordinarie
                    if ($oreLavorate > $oreOrdinarieMax) {
                        $eccedenza = round($oreLavorate - $oreOrdinarieMax, 2);
                        // Limite ore_eccedenti a 2 ore (configurabile)
                        $oreEccedenti = min($eccedenza, 2);
                        $oreStraordinarie = max(0, $eccedenza - $oreEccedenti);
                        
                        $presenza['ore_ordinarie'] = round($oreOrdinarieMax, 2);
                        $presenza['ore_eccedenti'] = $oreEccedenti;
                        $presenza['ore_straordinarie'] = $oreStraordinarie;
                    } else {
                        $presenza['ore_ordinarie'] = round($oreLavorate, 2);
                        $presenza['ore_eccedenti'] = 0;
                        $presenza['ore_straordinarie'] = 0;
                    }
                } else {
                    // Per full-time: solo ore_straordinarie
                    if ($oreLavorate > $oreOrdinarieMax) {
                        $presenza['ore_ordinarie'] = round($oreOrdinarieMax, 2);
                        $presenza['ore_straordinarie'] = round($oreLavorate - $oreOrdinarieMax, 2);
                        $presenza['ore_eccedenti'] = 0;
                    } else {
                        $presenza['ore_ordinarie'] = round($oreLavorate, 2);
                        $presenza['ore_straordinarie'] = 0;
                        $presenza['ore_eccedenti'] = 0;
                    }
                }
                
                $presenza['ora_ingresso'] = $faker->time('H:i', '08:00');
                $presenza['ora_uscita'] = $faker->time('H:i', '17:00');
                $presenza['pausa_ore'] = round($faker->randomFloat(2, 0.5, 1.5), 2);

                if ($modalita === 'trasferta') {
                    $presenza['giustificativo_trasferta_path'] = $this->generateFakePdf($dipendente, $date, 'giustificativo_trasferta');
                }
                break;

            case 'ferie':
                $presenza['ore_causale'] = $oreGiornaliere;
                break;

            case 'malattia':
                $presenza['protocollo_malattia'] = 'ML-' . strtoupper($faker->bothify('????-####-??'));
                $presenza['data_inizio_malattia'] = $inMalattia ? $date->toDateString() : null;
                $presenza['data_fine_malattia'] = $inMalattia ? $dataFineMalattia->toDateString() : null;
                $presenza['ore_causale'] = $oreGiornaliere;
                break;

            case 'infortunio':
                $presenza['giustificativo_infortunio_path'] = $this->generateFakePdf($dipendente, $date, 'giustificativo_infortunio');
                $presenza['ore_causale'] = $oreGiornaliere;
                break;

            case 'maternita':
                $presenza['ore_causale'] = $oreGiornaliere;
                break;

            case 'permesso_rol':
                $presenza['ore_causale'] = $oreGiornaliere;
                break;

            case 'permesso_retribuito':
                $presenza['ore_causale'] = $oreGiornaliere;
                break;

            case 'permesso_non_retribuito':
                $presenza['ore_causale'] = $oreGiornaliere;
                break;

            case 'assemblea':
                $presenza['ore_causale'] = 2; // 2 ore
                $presenza['ore_ordinarie'] = max(0, round($oreOrdinarieMax - 2, 2));
                break;

            case 'sciopero':
                $presenza['ore_ordinarie'] = 0;
                $presenza['ore_causale'] = 0;
                break;

            default:
                $presenza['ore_causale'] = $oreGiornaliere;
        }
    }

    // --- METODO AUSILIARIO: Genera PDF fake ---
    protected function generateFakePdf($dipendente, $date, $tipo)
    {
        $faker = Faker::create('it_IT');
        $nomeFile = $tipo . '_' . $dipendente->id . '_' . $date->format('Ymd') . '.pdf';
        $path = 'public/pdf/' . $nomeFile;

        $pdf = Pdf::loadView('pdf.fake_document', [
            'dipendente' => $dipendente,
            'data' => $date,
            'tipo' => $tipo,
            'protocollo' => strtoupper($faker->bothify('????-####-??')),
            'contenuto' => $faker->paragraph(3),
        ]);

        Storage::put($path, $pdf->output());
        return $path;
    }
}