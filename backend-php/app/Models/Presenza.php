<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Presenza extends Model
{
    protected $table = 'presenze';

    protected $fillable = [
    'dipendente_id',
    'data',
    'ore_ordinarie',
    'ore_straordinarie',
    'ore_supplementari',
    'ore_causale',
    'causale',
    'stato',
    'modalita_lavoro',
    'giustificativo_trasferta_path',
    'protocollo_malattia',
    'data_inizio_malattia',
    'data_fine_malattia',
    'giustificativo_infortunio_path',
    'warning',
];

    public function dipendente()
    {
        return $this->belongsTo(Dipendente::class);
    }
}