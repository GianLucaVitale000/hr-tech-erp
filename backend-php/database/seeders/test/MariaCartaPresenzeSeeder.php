<?php

namespace Database\Seeders\test;

use Illuminate\Database\Seeder;
use Faker\Factory as Faker;
use App\Models\Dipendente;
use App\Models\Presenza;
use Carbon\Carbon;

class MariaCartaPresenzeSeeder extends Seeder
{
    public function run()
    {
        $faker = Faker::create('it_IT');
        $today = Carbon::today();
        $inizioMeseCorrente = $today->copy()->firstOfMonth();

        // Trova Maria Carta (per email o nome)
        $dipendente = Dipendente::with('user')
            ->whereHas('user', function($query) {
                $query->where('email', 'maria.carta@example.com')
                      ->orWhere('name', 'Maria Carta');
            })
            ->first();

        if (!$dipendente) {
            $this->command->error('Maria Carta non trovata! Assicurati che MariaCartaSeeder sia stato eseguito prima.');
            return;
        }

        $this->command->info('Trovata Maria Carta (ID: ' . $dipendente->id . ')');

        // Cancella tutte le presenze esistenti di Maria Carta
        Presenza::where('dipendente_id', $dipendente->id)->delete();
        $this->command->info('Cancellate tutte le vecchie presenze di Maria Carta');

        // Dati di Maria Carta
        $dataAssunzione = Carbon::parse($dipendente->data_assunzione);
        $dataCessazione = null;

        if ($dipendente->tipo_contratto === 'determinato' && $dipendente->data_scadenza_contratto) {
            $dataCessazione = Carbon::parse($dipendente->data_scadenza_contratto);
        }

        $dataInizio = $dataAssunzione->copy();
        $dataFine = $dataCessazione ? $dataCessazione->copy() : $today->copy();

        // Calcola ore giornaliere
        $oreSettimanali = $dipendente->ore_settimanali ?? 40;
        $oreGiornaliere = $oreSettimanali / $dipendente->giorni_lavorativi_settimanali;
        $isPartTime = (float)($dipendente->percentuale_part_time ?? 100) < 100;

        // --- MATERNITÀ 2024: esattamente 150 giorni di calendario ---
        // Dal 13 febbraio 2024 al 11 luglio 2024 (inclusi)
        // Calcolo: feb 17 + mar 31 + apr 30 + mag 31 + giu 30 + lug 11 = 150
        $inizioMaternita = Carbon::create(2024, 2, 13);
        $fineMaternita = Carbon::create(2024, 7, 11);
        
        // Verifica
        $giorniMaternita = $inizioMaternita->diffInDays($fineMaternita) + 1;
        $this->command->info("Maternità: {$inizioMaternita->format('Y-m-d')} al {$fineMaternita->format('Y-m-d')} = {$giorniMaternita} giorni");

        // --- CALCOLO TOTALE FERIE E PERMESSI DA SMALTIRE ---
        // Maria Carta ha:
        // 1. Contatori PREGRESSI (fino a 12 feb 2024) da azzerare
        // 2. Contatori MATURATI DOPO (2024-2025) da smaltire fino ad aprile 2025
        
        // ===== 1. Contatori pregressi (fino a 12 feb 2024) =====
        // Periodo di accumulo: 15 gen 2020 -> 12 feb 2024 (~49 mesi)
        $rateoFerieMensile = (float)($dipendente->rateo_mensile_ferie ?? 14.4444); // ore/mese
        $rateoPermessoRolMensile = (float)($dipendente->rateo_mensile_permessi_rol ?? 6.0); // ore/mese
        $oreGiornaliere = $oreSettimanali / $dipendente->giorni_lavorativi_settimanali;
        
        // Ferie pregresse accumulate: 49 mesi * rateo / 8 ore
        $feriePregresse = (int)round((49 * $rateoFerieMensile) / $oreGiornaliere);
        $permessoRolPregresso = (int)round((49 * $rateoPermessoRolMensile) / $oreGiornaliere);
        
        // Ferie già usate prima della maternità (dal database: 7+9+8 = 24 giorni)
        $ferieGiaUsate = 24;
        $permessoRolGiaUsato = 0;
        
        // Saldi pregressi residui al 11 luglio 2024
        $feriePregresseResidue = $feriePregresse - $ferieGiaUsate; // ~64 gg
        $permessoRolPregressoResiduo = $permessoRolPregresso - $permessoRolGiaUsato; // ~37 gg
        
        $this->command->info("Ferie pregresse: {$feriePregresse} gg, usate: {$ferieGiaUsate} gg, residue: {$feriePregresseResidue} gg");
        $this->command->info("Permesso ROL pregresso: {$permessoRolPregresso} gg, usati: {$permessoRolGiaUsato} gg, residuo: {$permessoRolPregressoResiduo} gg");
        
        // ===== 2. Contatori maturati DOPO il rientro (2024-2025) =====
        // Utente ha specificato: 528 ore ferie + 328 ore permesso_rol
        $ferieNuoveOre = 528; // ore
        $permessoRolNuovoOre = 328; // ore
        $ferieNuoveGg = (int)round($ferieNuoveOre / $oreGiornaliere); // ~66 gg
        $permessoRolNuovoGg = (int)round($permessoRolNuovoOre / $oreGiornaliere); // ~41 gg
        
        $this->command->info("Ferie nuove (2024-2025): {$ferieNuoveOre} ore = {$ferieNuoveGg} gg");
        $this->command->info("Permesso ROL nuovo (2024-2025): {$permessoRolNuovoOre} ore = {$permessoRolNuovoGg} gg");
        
        // ===== TOTALE DA SMALTIRE =====
        $ferieRimaste = $feriePregresseResidue + $ferieNuoveGg; // 64 + 66 = 130 gg
        $permessoRolRimasto = $permessoRolPregressoResiduo + $permessoRolNuovoGg; // 37 + 41 = 78 gg
        $giorniSmaltimentoTotali = $ferieRimaste + $permessoRolRimasto; // 208 gg
        $smaltimentoCompletato = false;
        
        $this->command->info("=== SMALTIMENTO TOTALE: {$ferieRimaste} gg ferie + {$permessoRolRimasto} gg permesso_rol = {$giorniSmaltimentoTotali} gg lavorativi ===");
        $this->command->info("Obbiettivo: fino ad aprile 2025 (circa 208 gg lavorativi da lug 2024)");
        
        // Data inizio smaltimento: il giorno lavorativo successivo alla fine maternità
        $dataInizioSmaltimento = $fineMaternita->copy()->addDay();
        
        // Trova il primo giorno lavorativo dopo la maternità
        while ($this->isWeekend($dataInizioSmaltimento, $dipendente->giorni_lavorativi_settimanali)) {
            $dataInizioSmaltimento->addDay();
        }
        
        $this->command->info("Inizio smaltimento: {$dataInizioSmaltimento->format('Y-m-d')}");

        // --- Itera giorno per giorno ---
        for ($date = $dataInizio->copy(); $date->lte($dataFine); $date->addDay()) {
            $isWeekend = $this->isWeekend($date, $dipendente->giorni_lavorativi_settimanali);
            
            // Determina se è in maternità (150 giorni di calendario, inclusi weekend)
            $inMaternita = false;
            if ($date->gte($inizioMaternita) && $date->lte($fineMaternita)) {
                $inMaternita = true;
            }

            // Per tutti gli altri casi: salta weekend
            if (!$inMaternita && $isWeekend) {
                continue;
            }

            // Determina se è in smaltimento
            $inSmaltimento = false;
            $causaleSmaltimento = null;
            
            if (!$inMaternita && !$smaltimentoCompletato && $date->gte($dataInizioSmaltimento)) {
                // Verifica se ci sono ancora ferie o permesso_rol da smaltire
                if ($ferieRimaste > 0) {
                    $inSmaltimento = true;
                    $causaleSmaltimento = 'ferie';
                    $ferieRimaste--;
                } elseif ($permessoRolRimasto > 0) {
                    $inSmaltimento = true;
                    $causaleSmaltimento = 'permesso_rol';
                    $permessoRolRimasto--;
                } elseif ($ferieRimaste <= 0 && $permessoRolRimasto <= 0) {
                    $smaltimentoCompletato = true;
                }
            }

            // Determina causale
            $causale = 'lavoro';
            $modalita = $faker->randomElement(['in_sede', 'smart_working', 'trasferta']);

            if ($inMaternita) {
                $causale = 'maternita';
            } elseif ($inSmaltimento) {
                $causale = $causaleSmaltimento;
            }

            // Costruisci il record
            $stato = ($date->gte($inizioMeseCorrente)) ? 'inviato' : 'approvato';
            
            $presenza = [
                'dipendente_id' => $dipendente->id,
                'data' => $date->toDateString(),
                'causale' => $causale,
                'modalita_lavoro' => ($causale === 'lavoro') ? $modalita : null,
                'stato' => $stato,
                'fonte_dato' => 'seeder_maria_carta',
            ];

            // Popola campi specifici
            $this->populatePresenzaFields($presenza, $dipendente, $date, $causale, $modalita, $faker, $inMaternita);

            Presenza::create($presenza);
        }

        // Verifica finale
        $maternitaCount = Presenza::where('dipendente_id', $dipendente->id)
            ->where('causale', 'maternita')
            ->count();
        $ferieCount = Presenza::where('dipendente_id', $dipendente->id)
            ->where('causale', 'ferie')
            ->count();
        $permessoRolCount = Presenza::where('dipendente_id', $dipendente->id)
            ->where('causale', 'permesso_rol')
            ->count();
        
        $this->command->info("✅ Presenze create!");
        $this->command->info("Maternità: {$maternitaCount} giorni");
        $this->command->info("Ferie: {$ferieCount} giorni");
        $this->command->info("Permesso ROL: {$permessoRolCount} giorni");
        $this->command->info("Smaltimento completato: " . ($smaltimentoCompletato ? 'SI' : 'NO'));
        $this->command->info("Contatori esauriti - Maria Carta rientra al lavoro");
    }

    // Controlla se è weekend
    protected function isWeekend($date, $giorniLavorativi)
    {
        if ($giorniLavorativi === 5) {
            return $date->isSaturday() || $date->isSunday();
        } elseif ($giorniLavorativi === 6) {
            return $date->isSunday();
        }
        return false;
    }

    // Popola campi specifici per causale
    protected function populatePresenzaFields(&$presenza, $dipendente, $date, $causale, $modalita, $faker, $inMaternita)
    {
        $giornoSettimana = $date->dayOfWeek;
        $oreOrdinarieMax = $dipendente->getOrePrevistePerGiorno($giornoSettimana);
        
        if ($oreOrdinarieMax === 0.0 && (float)($dipendente->percentuale_part_time ?? 100) < 100) {
            $oreSettimanali = $dipendente->ore_settimanali ?? 40;
            $oreFullTimeGiornaliere = $oreSettimanali / $dipendente->giorni_lavorativi_settimanali;
            $oreOrdinarieMax = $oreFullTimeGiornaliere * ((float)($dipendente->percentuale_part_time ?? 100) / 100);
        }
        
        $oreSettimanali = $dipendente->ore_settimanali ?? 40;
        $oreGiornaliere = $oreSettimanali / $dipendente->giorni_lavorativi_settimanali;

        switch ($causale) {
            case 'lavoro':
                $isPartTime = (float)($dipendente->percentuale_part_time ?? 100) < 100;
                $oreLavorate = round($faker->randomFloat(2, $oreOrdinarieMax, $oreOrdinarieMax + 4), 2);
                
                if ($isPartTime) {
                    if ($oreLavorate > $oreOrdinarieMax) {
                        $eccedenza = round($oreLavorate - $oreOrdinarieMax, 2);
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
                    // Non generiamo PDF fake per Maria Carta per semplificare
                }
                break;

            case 'ferie':
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

            default:
                $presenza['ore_causale'] = $oreGiornaliere;
        }
    }
}
