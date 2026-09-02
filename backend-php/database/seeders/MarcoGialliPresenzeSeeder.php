<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Dipendente;
use App\Models\Presenza;
use Carbon\Carbon;

class MarcoGialliPresenzeSeeder extends Seeder
{
    public function run()
    {
        // Trova Marco Gialli per email o nome
        $dipendente = Dipendente::with('user', 'contratto')
            ->whereHas('user', function($query) {
                $query->where('email', 'marco.gialli@example.com')
                      ->orWhere('name', 'Marco Gialli');
            })
            ->first();

        if (!$dipendente) {
            $this->command->error('Marco Gialli non trovato!');
            return;
        }

        $this->command->info('Trovato Marco Gialli (ID: ' . $dipendente->id . ')');

        // Cancella solo le presenze di Marco Gialli da gennaio 2025 a dicembre 2026
        Presenza::where('dipendente_id', $dipendente->id)
            ->whereBetween('data', ['2025-01-01', '2026-12-31'])
            ->delete();
        $this->command->info('Cancellate presenze di Marco Gialli per 2025-2026');

        // Dati di Marco Gialli
        $isPartTime = (float)($dipendente->percentuale_part_time ?? 100) < 100;
        $oreSettimanali = $dipendente->ore_settimanali ?? 40;
        $giorni_lavorativi = $dipendente->giorni_lavorativi_settimanali ?? 5;
        $oreGiornaliere = $oreSettimanali / $giorni_lavorativi;
        $oreSettimanaliAttese = $oreSettimanali;
        
        if ($isPartTime) {
            $percentuale = (float)($dipendente->percentuale_part_time ?? 100);
            $oreSettimanaliAttese = ($oreSettimanali * $percentuale) / 100;
            $oreGiornaliere = $oreSettimanaliAttese / $giorni_lavorativi;
            $this->command->info("Marco Gialli è Part-Time al {$percentuale}%");
            $this->command->info("Ore settimanali attese: {$oreSettimanaliAttese}h, Ore giornaliere: {$oreGiornaliere}h");
        }

        // Giorni di riposo (lunedì=1, domennica=0, sabato=6)
        $riposiSet = [0, 6]; // domenica e sabato per FT
        if ($giorni_lavorativi === 6) {
            $riposiSet = [0]; // solo domenica per chi lavora 6 gg
        }

        // Festività italiane 2025-2026
        $festivita2025_2026 = [
            // 2025
            '2025-01-01', // Capodanno
            '2025-01-06', // Epifania
            '2025-04-20', // Pasqua
            '2025-04-21', // Pasquetta
            '2025-04-25', // Liberazione
            '2025-05-01', // Festa lavoro
            '2025-06-02', // Repubblica
            '2025-08-15', // Ferragosto
            '2025-11-01', // Ognissanti
            '2025-12-08', // Immacolata
            '2025-12-25', // Natale
            '2025-12-26', // Santo Stefano
            // 2026
            '2026-01-01', // Capodanno
            '2026-01-06', // Epifania
            '2026-04-12', // Pasqua
            '2026-04-13', // Pasquetta
            '2026-04-25', // Liberazione
            '2026-05-01', // Festa lavoro
            '2026-06-02', // Repubblica
            '2026-08-15', // Ferragosto
            '2026-11-01', // Ognissanti
            '2026-12-08', // Immacolata
            '2026-12-25', // Natale
            '2026-12-26', // Santo Stefano
        ];
        $festivitaSet = array_flip($festivita2025_2026);

        // Genera presenze da gennaio 2025 a dicembre 2026
        $dataInizio = Carbon::parse('2025-01-01');
        $dataFine = Carbon::parse('2026-12-31');
        
        $contatore = 0;
        $presenzeCreated = [];

        for ($data = $dataInizio->copy(); $data <= $dataFine; $data->addDay()) {
            $dataStr = $data->format('Y-m-d');
            $dayOfWeek = $data->dayOfWeek; // 0=dom, 1=lun, ..., 6=sab

            // Salta giorni di riposo (domenica, sabato)
            if (in_array($dayOfWeek, $riposiSet)) {
                continue;
            }

            // Salta festività
            if (isset($festivitaSet[$dataStr])) {
                continue;
            }

            // Strategia di eccedenze: genera sia supplementari che straordinarie
            $settimanaAnno = $data->isoWeek;
            $mese = $data->month;
            $anno = $data->year;
            
            // Distribuisci eccedenze per tipo:
            // - Mesi pari 2025 (02,04,06,08,10,12) + pari 2026 (02,04,06,08,10,12): +4h (straordinarie, supera mese)
            // - Mesi dispari 2025 (01,03,05,07,09,11) + dispari 2026 (01,03,05,07,09,11): +2h (supplementari, settimanale)
            $oreOrdinarie = $oreGiornaliere;
            if ($mese % 2 === 0) {
                // Mesi pari: +4h = straordinarie
                $oreOrdinarie += 4;
            } else {
                // Mesi dispari: +2h = supplementari
                $oreOrdinarie += 2;
            }

            // Crea la presenza
            $presenza = Presenza::create([
                'dipendente_id' => $dipendente->id,
                'data' => $dataStr,
                'ore_ordinarie' => $oreOrdinarie,
                'ore_straordinarie' => 0,
                'ore_eccedenti' => 0,
                'ore_causale' => 0,
                'causale' => 'lavoro',
                'stato' => 'approvato',
                'modalita_lavoro' => 'in_sede',
                'fonte_dato' => 'seeder',
            ]);

            $presenzeCreated[] = $dataStr;
            $contatore++;

            if ($contatore % 20 === 0) {
                $this->command->info("Creati {$contatore} giorni di presenze...");
            }
        }

        $this->command->info("✓ Completate {$contatore} presenze per Marco Gialli da gennaio 2025 a dicembre 2026");
        $this->command->info("📊 Mesi dispari (01,03,05,...): +2h/giorno = SUPPLEMENTARI");
        $this->command->info("📊 Mesi pari (02,04,06,...): +4h/giorno = STRAORDINARIE");
    }
}
