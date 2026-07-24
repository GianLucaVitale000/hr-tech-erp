<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Dipendente;
use App\Models\DipendenteOrarioSettimanale;
use App\Models\Contratto;
use App\Models\RegolaCalcoloContratto;
use App\Models\DipendenteRegolaCalcolo;
use Illuminate\Support\Facades\Hash;

class DipendentiSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Trova i contratti necessari
        $contrattoC011 = Contratto::where('codice_cnel', 'C011')->orderBy('id')->first();
        
        // Trova contratto H011 con ore_settimanali_teoriche valorizzato (preferenza a 40 ore)
        $contrattoH011 = Contratto::where('codice_cnel', 'H011')
            ->whereNotNull('ore_settimanali_teoriche')
            ->orderBy('ore_settimanali_teoriche', 'DESC')
            ->first();
        
        // Se non trova uno con ore valorizzate, prendi il primo disponibile
        if (!$contrattoH011) {
            $contrattoH011 = Contratto::where('codice_cnel', 'H011')->orderBy('id')->first();
        }
        
        // Trova contratto I100 con ore_settimanali_teoriche valorizzato
        $contrattoI100 = Contratto::where('codice_cnel', 'I100')
            ->whereNotNull('ore_settimanali_teoriche')
            ->orderBy('ore_settimanali_teoriche', 'DESC')
            ->first();
        
        // Se non trova uno con ore valorizzate, prendi il primo disponibile
        if (!$contrattoI100) {
            $contrattoI100 = Contratto::where('codice_cnel', 'I100')->orderBy('id')->first();
        }

        if (!$contrattoC011 || !$contrattoH011 || !$contrattoI100) {
            $this->command->error('Contratti C011, H011 o I100 non trovati!');
            return;
        }
        
        // Imposta default per I100 e H011 se non hanno ore_settimanali_teoriche
        $oreI100 = $contrattoI100->ore_settimanali_teoriche ?: 39.00;
        $oreH011 = $contrattoH011->ore_settimanali_teoriche ?: 40.00;

        // Trova o crea Mario Rossi (esiste già dal RolesAndUsersSeeder)
        $marioRossi = User::firstOrCreate(
            ['email' => 'dipendente@hrtech.it'],
            [
                'name' => 'Mario Rossi',
                'email' => 'dipendente@hrtech.it',
                'password' => Hash::make('password'),
            ]
        );

        // Crea Paolo Bianchi
        $paoloBianchi = User::firstOrCreate(
            ['email' => 'paolo.bianchi@hrtech.it'],
            [
                'name' => 'Paolo Bianchi',
                'email' => 'paolo.bianchi@hrtech.it',
                'password' => Hash::make('password'),
            ]
        );

        // Crea Antonio Verdi
        $antonioVerdi = User::firstOrCreate(
            ['email' => 'antonio.verdi@hrtech.it'],
            [
                'name' => 'Antonio Verdi',
                'email' => 'antonio.verdi@hrtech.it',
                'password' => Hash::make('password'),
            ]
        );

        // Mario Rossi: C011, tempo pieno, indeterminato
        $dipendenteMario = Dipendente::updateOrCreate(
            ['user_id' => $marioRossi->id],
            [
                'user_id' => $marioRossi->id,
                'contratto_id' => $contrattoC011->id,
                'codice_fiscale' => 'RSSMRA80A01H501Z',
                'iban' => 'IT60X0542811101000000123456',
                'livello' => 'D2',
                'mansione' => 'Addetto produzione',
                'data_assunzione' => '2020-01-15',
                'tipo_contratto' => 'indeterminato',
                'data_scadenza_contratto' => null,
                'percentuale_part_time' => 100,
                'giorni_lavorativi_settimanali' => 5,
            ]
        );

        // Paolo Bianchi: H011, tempo parziale 50%, indeterminato, 5 giorni
        $dipendentePaolo = Dipendente::updateOrCreate(
            ['user_id' => $paoloBianchi->id],
            [
                'user_id' => $paoloBianchi->id,
                'contratto_id' => $contrattoH011->id,
                'codice_fiscale' => 'BNCPLA85B02H501T',
                'iban' => 'IT60X0542811101000000234567',
                'livello' => '4',
                'mansione' => 'Magazziniere',
                'data_assunzione' => '2021-03-10',
                'tipo_contratto' => 'indeterminato',
                'data_scadenza_contratto' => null,
                'percentuale_part_time' => 50,
                'giorni_lavorativi_settimanali' => 5,
            ]
        );

        // Antonio Verdi: C011, tempo pieno, determinato, scadenza 30 giugno 2026
        $dipendenteAntonio = Dipendente::updateOrCreate(
            ['user_id' => $antonioVerdi->id],
            [
                'user_id' => $antonioVerdi->id,
                'contratto_id' => $contrattoC011->id,
                'codice_fiscale' => 'VRDNTN90C03H501S',
                'iban' => 'IT60X0542811101000000345678',
                'livello' => 'D2',
                'mansione' => 'Manutentore',
                'data_assunzione' => '2023-06-01',
                'tipo_contratto' => 'determinato',
                'data_scadenza_contratto' => '2026-06-30',
                'percentuale_part_time' => 100,
                'giorni_lavorativi_settimanali' => 5,
            ]
        );

        // ====================================================================
        // NUOVI DIPENDENTI CON CONTRATTO I100 (Commesso vendita al pubblico, livello 4, 6 giorni)
        // ====================================================================

        // Crea user per dipendente I100 tempo pieno
        $userI100FullTime = User::firstOrCreate(
            ['email' => 'luca.neri@hrtech.it'],
            [
                'name' => 'Luca Neri',
                'email' => 'luca.neri@hrtech.it',
                'password' => Hash::make('password'),
            ]
        );

        // Luca Neri: I100, tempo pieno (100%), commesso vendita al pubblico, livello 4, 6 giorni
        $dipendenteI100Full = Dipendente::updateOrCreate(
            ['user_id' => $userI100FullTime->id],
            [
                'user_id' => $userI100FullTime->id,
                'contratto_id' => $contrattoI100->id,
                'codice_fiscale' => 'NRCLCA90D04H501X',
                'iban' => 'IT60X0542811101000000456789',
                'livello' => '4',
                'mansione' => 'Commesso alla vendita al pubblico',
                'data_assunzione' => '2025-01-01',
                'tipo_contratto' => 'indeterminato',
                'data_scadenza_contratto' => null,
                'percentuale_part_time' => 100,
                'giorni_lavorativi_settimanali' => 6,
                'ore_settimanali' => $contrattoI100->ore_settimanali_teoriche,
            ]
        );

        // Crea orari settimanali per Luca Neri (tempo pieno, 6 giorni)
        $this->createOrariSettimanali($dipendenteI100Full->id, 6, $dipendenteI100Full->ore_settimanali);

        // Crea user per dipendente I100 part-time 75%
        $userI100PartTime = User::firstOrCreate(
            ['email' => 'marco.gialli@hrtech.it'],
            [
                'name' => 'Marco Gialli',
                'email' => 'marco.gialli@hrtech.it',
                'password' => Hash::make('password'),
            ]
        );

        // Marco Gialli: I100, part-time 75%, commesso vendita al pubblico, livello 4, 6 giorni
        // Calcolo ore settimanali: 75% di 39 ore = 29.25 ore
        $oreSettimanaliI100PartTime = $contrattoI100->ore_settimanali_teoriche ? ($contrattoI100->ore_settimanali_teoriche * 0.75) : 29.25;
        
        $dipendenteI100Part = Dipendente::updateOrCreate(
            ['user_id' => $userI100PartTime->id],
            [
                'user_id' => $userI100PartTime->id,
                'contratto_id' => $contrattoI100->id,
                'codice_fiscale' => 'GLLMRC91E05H501Y',
                'iban' => 'IT60X0542811101000000567890',
                'livello' => '4',
                'mansione' => 'Commesso alla vendita al pubblico',
                'data_assunzione' => '2025-01-01',
                'tipo_contratto' => 'indeterminato',
                'data_scadenza_contratto' => null,
                'percentuale_part_time' => 75,
                'giorni_lavorativi_settimanali' => 6,
                'ore_settimanali' => $oreSettimanaliI100PartTime,
            ]
        );

        // Crea orari settimanali per Marco Gialli (part-time 75%, 6 giorni, 29.25 ore)
        // Distribuzione: 29.25 / 6 = 4.875 ore al giorno (arrotondato a 4.88)
        $this->createOrariSettimanali($dipendenteI100Part->id, 6, $oreSettimanaliI100PartTime);

        // ====================================================================
        // NUOVI DIPENDENTI CON CONTRATTO H011 (Pompista specializzato, livello 4, 5 giorni)
        // ====================================================================

        // ====================================================================
        // CREA REGOLA DI CALCOLO SPECIFICA PER POMPISTA 45 ORE (Gestori di impianti di distribuzione carburanti)
        // ====================================================================
        $regolaPompista45 = RegolaCalcoloContratto::firstOrCreate(
            [
                'contratto_id' => $contrattoH011->id,
                'descrizione' => 'Pompista specializzato - Gestori di impianti di distribuzione carburanti (45 ore)'
            ],
            [
                'contratto_id' => $contrattoH011->id,
                'descrizione' => 'Pompista specializzato - Gestori di impianti di distribuzione carburanti (45 ore)',
                'ore_settimanali_teoriche' => 45.00,
            ]
        );

        // Crea user per dipendente H011 con 45 ore
        $userH011_45 = User::firstOrCreate(
            ['email' => 'giuseppe.bruni@hrtech.it'],
            [
                'name' => 'Giuseppe Bruni',
                'email' => 'giuseppe.bruni@hrtech.it',
                'password' => Hash::make('password'),
            ]
        );

        // Giuseppe Bruni: H011, tempo pieno, pompista specializzato, livello 4, 5 giorni, 45 ore
        $dipendenteH011_45 = Dipendente::updateOrCreate(
            ['user_id' => $userH011_45->id],
            [
                'user_id' => $userH011_45->id,
                'contratto_id' => $contrattoH011->id,
                'codice_fiscale' => 'BRNGPP88F06H501Z',
                'iban' => 'IT60X0542811101000000678901',
                'livello' => '4',
                'mansione' => 'Pompista specializzato - Gestori di impianti di distribuzione carburanti',
                'data_assunzione' => '2025-01-01',
                'tipo_contratto' => 'indeterminato',
                'data_scadenza_contratto' => null,
                'percentuale_part_time' => 100,
                'giorni_lavorativi_settimanali' => 5,
                'ore_settimanali' => 45,
            ]
        );

        // Associa la regola specifica a Giuseppe Bruni
        DipendenteRegolaCalcolo::firstOrCreate(
            ['dipendente_id' => $dipendenteH011_45->id],
            [
                'dipendente_id' => $dipendenteH011_45->id,
                'regola_calcolo_contratto_id' => $regolaPompista45->id,
            ]
        );

        // Crea orari settimanali per Giuseppe Bruni (45 ore su 5 giorni = 9 ore/giorno)
        $this->createOrariSettimanali($dipendenteH011_45->id, 5, 45);

        // ====================================================================
        // CREA REGOLA DI CALCOLO SPECIFICA PER POMPISTA 42 ORE (Distribuzione carburante metano autotrazione)
        // ====================================================================
        $regolaPompista42 = RegolaCalcoloContratto::firstOrCreate(
            [
                'contratto_id' => $contrattoH011->id,
                'descrizione' => 'Pompista specializzato - Distribuzione carburante metano autotrazione (42 ore)'
            ],
            [
                'contratto_id' => $contrattoH011->id,
                'descrizione' => 'Pompista specializzato - Distribuzione carburante metano autotrazione (42 ore)',
                'ore_settimanali_teoriche' => 42.00,
            ]
        );

        // Crea user per dipendente H011 con 42 ore
        $userH011_42 = User::firstOrCreate(
            ['email' => 'franco.neri@hrtech.it'],
            [
                'name' => 'Franco Neri',
                'email' => 'franco.neri@hrtech.it',
                'password' => Hash::make('password'),
            ]
        );

        // Franco Neri: H011, tempo pieno, pompista specializzato, livello 4, 5 giorni, 42 ore
        $dipendenteH011_42 = Dipendente::updateOrCreate(
            ['user_id' => $userH011_42->id],
            [
                'user_id' => $userH011_42->id,
                'contratto_id' => $contrattoH011->id,
                'codice_fiscale' => 'NRFRNC87G07H501W',
                'iban' => 'IT60X0542811101000000789012',
                'livello' => '4',
                'mansione' => 'Pompista specializzato - Distribuzione carburante metano autotrazione',
                'data_assunzione' => '2025-01-01',
                'tipo_contratto' => 'indeterminato',
                'data_scadenza_contratto' => null,
                'percentuale_part_time' => 100,
                'giorni_lavorativi_settimanali' => 5,
                'ore_settimanali' => 42,
            ]
        );

        // Associa la regola specifica a Franco Neri
        DipendenteRegolaCalcolo::firstOrCreate(
            ['dipendente_id' => $dipendenteH011_42->id],
            [
                'dipendente_id' => $dipendenteH011_42->id,
                'regola_calcolo_contratto_id' => $regolaPompista42->id,
            ]
        );

        // Crea orari settimanali per Franco Neri (42 ore su 5 giorni = 8.4 ore/giorno)
        $this->createOrariSettimanali($dipendenteH011_42->id, 5, 42);

        $this->command->info('Dipendenti seedati con successo!');
    }

    /**
     * Crea orari settimanali per un dipendente
     * 
     * @param int $dipendenteId
     * @param int $giorniLavorativi (1-7, dove 1=Lunedì, 6=Sabato)
     * @param float|null $oreSettimanali Ore totali settimanali (se null, usa 8 ore/giorno * giorni)
     */
    protected function createOrariSettimanali(int $dipendenteId, int $giorniLavorativi, ?float $oreSettimanali = null): void
    {
        // Calcola ore giornaliere
        $oreGiornaliere = $oreSettimanali ? ($oreSettimanali / $giorniLavorativi) : 8;
        
        // Definisci i giorni della settimana (1=Lunedì, 6=Sabato)
        $giorni = [];
        if ($giorniLavorativi >= 1) $giorni[] = 1; // Lunedì
        if ($giorniLavorativi >= 2) $giorni[] = 2; // Martedì
        if ($giorniLavorativi >= 3) $giorni[] = 3; // Mercoledì
        if ($giorniLavorativi >= 4) $giorni[] = 4; // Giovedì
        if ($giorniLavorativi >= 5) $giorni[] = 5; // Venerdì
        if ($giorniLavorativi >= 6) $giorni[] = 6; // Sabato
        
        foreach ($giorni as $giorno) {
            DipendenteOrarioSettimanale::firstOrCreate(
                [
                    'dipendente_id' => $dipendenteId,
                    'giorno_settimana' => $giorno,
                ],
                [
                    'dipendente_id' => $dipendenteId,
                    'giorno_settimana' => $giorno,
                    'ore_giornaliere_previste' => $oreGiornaliere,
                    'turno1_dalle' => $giorniLavorativi >= 6 ? '08:00:00' : '08:30:00',
                    'turno1_alle' => $giorniLavorativi >= 6 ? '13:00:00' : null,
                    // Per 6 giorni: turno pomeridiano per sabato
                    'turno2_dalle' => $giorno == 6 && $giorniLavorativi >= 6 ? '14:00:00' : null,
                    'turno2_alle' => $giorno == 6 && $giorniLavorativi >= 6 ? '18:00:00' : null,
                ]
            );
        }
    }
}
