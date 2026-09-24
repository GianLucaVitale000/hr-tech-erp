<?php

namespace App\Console\Commands;

use App\Models\Dipendente;
use App\Services\PermessiFerieService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class CalcolaResiduiAnnuiFeriePermessi extends Command
{
    protected $signature = 'dipendenti:aggiorna-residui-annui {anno?}';
    protected $description = 'Calcola il residuo al 31/12 dell\'anno precedente e lo imposta come residuo precedente (saldo iniziale) per l\'anno successivo per tutti i dipendenti.';

    public function handle(PermessiFerieService $service)
    {
        $annoRiferimento = $this->argument('anno') ? (int) $this->argument('anno') : Carbon::now()->subYear()->year;
        $annoSuccessivo = $annoRiferimento + 1;

        $this->info("Calcolo dei residui al 31/12/{$annoRiferimento} per il riporto al {$annoSuccessivo}...");

        $dipendenti = Dipendente::all();
        $count = 0;

        foreach ($dipendenti as $dipendente) {
            $dataAssunzione = $dipendente->data_assunzione ? Carbon::parse($dipendente->data_assunzione) : null;
            if ($dataAssunzione && $dataAssunzione->year > $annoRiferimento) {
                continue;
            }

            $risultato = $service->calcola($dipendente, $annoRiferimento);

            $residuoFerie = $risultato['ferie']['residue'] ?? 0;
            $residuoPermessi = $risultato['permessi_rol_ex_festivita']['residui'] ?? 0;

            $dipendente->update([
                'residuo_precedente_ferie' => $residuoFerie,
                'residuo_precedente_permessi' => $residuoPermessi,
            ]);

            $count++;
            $this->line("Dipendente ID {$dipendente->id}: Residuo Ferie = {$residuoFerie}, Residuo Permessi = {$residuoPermessi}");
        }

        $this->info("Aggiornamento completato con successo per {$count} dipendenti.");
        return 0;
    }
}
