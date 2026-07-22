<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Presenza extends Model
{
    protected $table = 'presenze';

    protected $casts = [
        'usa_qr' => 'boolean',
        'pausa_ore' => 'decimal:2',
    ];

    protected $dates = [
        'created_at',
        'updated_at',
    ];

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
    'usa_qr',
    'ora_ingresso',
    'ora_uscita',
    'pausa_ore',
    'fonte_dato',
];

    public function dipendente()
    {
        return $this->belongsTo(Dipendente::class);
    }
}