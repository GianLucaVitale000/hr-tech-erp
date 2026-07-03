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
    'ore_eccedenti',
    'ore_causale',
    'causale',
    'stato',
    'modalita_lavoro',
    'giustificativo_trasferta_path',
    'protocollo_malattia',
    'data_inizio_malattia',
    'data_fine_malattia',
    'giustificativo_infortunio_path',
    'data_inizio_cassa_integrazione',
    'data_fine_cassa_integrazione',
    'percentuale_cassa_integrazione',
    'warning',
];

    public function dipendente()
    {
        return $this->belongsTo(Dipendente::class);
    }
}