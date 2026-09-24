<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedula la sincronizzazione dei contratti CNEL il primo giorno di ogni mese alle 03:00
Schedule::command('cnel:sync')->monthlyOn(1, '03:00');

// Schedula il calcolo e il riporto dei residui annuali di ferie e permessi al 31 dicembre di ogni anno alle 23:59
Schedule::command('dipendenti:aggiorna-residui-annui')->yearlyOn(12, 31, '23:59');
