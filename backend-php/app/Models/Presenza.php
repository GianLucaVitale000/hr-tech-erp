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
        'causale',
        'stato',
    ];

    public function dipendente()
    {
        return $this->belongsTo(Dipendente::class);
    }
}