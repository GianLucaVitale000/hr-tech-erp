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

            // --- 3. MATERNITÀ: solo per donne (F) - 150 giorni DI CALENDARIO ---
            if ($dipendente->sesso === 'F' && $faker->boolean(80)) {
                $inizioMaternita = $faker->dateTimeBetween($dataInizio, $dataFine);
                $inizioMaternita = Carbon::parse($inizioMaternita);
                $dataFineMaternita = $inizioMaternita->copy()->addDays(150); // 150 giorni DI CALENDARIO
                $inMaternita = true;
            }

            // --- 4. Itera giorno per giorno ---
            for ($date = $dataInizio->copy(); $date->lte($dataFine); $date->addDay()) {
                if ($this->isWeekend($date, $dipendente->giorni_lavorativi_settimanali)) {
                    continue;
                }

                // --- 5. Gestione fine stati continuativi ---
                if ($inMalattia && $date->gte($dataFineMalattia)) $inMalattia = false;
                if ($inInfortunio && $date->gte($dataFineInfortunio)) $inInfortunio = false;
                if ($inMaternita && $date->gte($dataFineMaternita)) $inMaternita = false;
                if ($inFerie && $ferieConsecutive >= 15) {
                    $inFerie = false;
                    $ferieConsecutive = 0;
                }
                if ($inSciopero && $date->gte($dataFineSciopero)) $inSciopero = false;

                // --- 6. Decidi la causale ---
                $causale = 'lavoro';
                $modalita = $faker->randomElement(['in_sede', 'smart_working', 'trasferta']);

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
                    $causale = $faker->randomElement([
                        'lavoro', 'lavoro', 'lavoro', 'lavoro', 'lavoro',
                        'lavoro', 'lavoro', 'lavoro', 'lavoro', 'lavoro',
                        'lavoro', 'lavoro', 'lavoro', 'lavoro', 'lavoro',
                        'lavoro', 'lavoro', 'lavoro', 'lavoro', 'lavoro',
                        'lavoro', 'lavoro', 'lavoro', 'lavoro', 'lavoro',
                        'lavoro', 'lavoro', 'lavoro', 'lavoro', 'lavoro',
                        'ferie',
                        'malattia',
                        'infortunio',
                        'permesso_retribuito',
                        'permesso_non_retribuito',
                        'assemblea',
                        'sciopero',
                    ]);

                    if ($causale === 'ferie') {
                        $inFerie = true;
                        $ferieConsecutive = 1;
                        if ($faker->boolean(30)) {
                            $durataFerie = $faker->numberBetween(2, 15);
                            $ferieConsecutive = min($durataFerie, 15);
                        }
                    } elseif ($causale === 'malattia') {
                        $inMalattia = true;
                        $dataFineMalattia = $date->copy()->addDays($faker->numberBetween(1, 30));
                    } elseif ($causale === 'infortunio') {
                        $inInfortunio = true;
                        $dataFineInfortunio = $date->copy()->addDays($faker->numberBetween(5, 60));
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