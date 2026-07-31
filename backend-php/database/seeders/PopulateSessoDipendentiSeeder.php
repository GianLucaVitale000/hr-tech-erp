<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Dipendente;

class PopulateSessoDipendentiSeeder extends Seeder
{
    public function run()
    {
        // 1. Imposta TUTTI i dipendenti con sesso NULL come 'M' (maschi)
        Dipendente::whereNull('sesso')->update(['sesso' => 'M']);

        // 2. Verifica che Maria Carta sia 'F' (opzionale, solo per sicurezza)
        $mariaCarta = Dipendente::whereHas('user', function($query) {
            $query->where('email', 'maria.carta@example.com');
        })->first();

        if ($mariaCarta && $mariaCarta->sesso !== 'F') {
            $mariaCarta->update(['sesso' => 'F']);
            $this->command->info('✅ Maria Carta impostata come femmina (F)');
        }

        $this->command->info('✅ Tutti i dipendenti senza sesso sono stati impostati come maschi (M)');
    }
}