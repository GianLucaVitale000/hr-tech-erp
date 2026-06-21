<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Contratto extends Model
{
    protected $table = 'contratti';

    protected $fillable = [
        'codice_cnel',
        'nome_contratto',
        'ore_settimanali_teoriche',
        'limite_straordinario_mensile',
        'soglia_maggiorazione_1',
        'soglia_maggiorazione_2',
    ];

    public function dipendenti()
    {
        return $this->hasMany(Dipendente::class);
    }
}
