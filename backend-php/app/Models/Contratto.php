<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Contratto extends Model
{
    protected $table = 'contratti';

    protected $fillable = [
        'codice_cnel',
        'nome_contratto',
        'partiDatorialiFirmatarie',
        'partiSindacaliFirmatarie',
        'data_decorrenza',
        'data_scadenza',
        'ultimo_accordo_vigente',
    ];

    protected $casts = [
        'data_decorrenza' => 'date',
        'data_scadenza' => 'date',
        'ultimo_accordo_vigente' => 'boolean',
        'partiDatorialiFirmatarie' => 'array',
        'partiSindacaliFirmatarie' => 'array',
    ];

    public function dipendenti()
    {
        return $this->hasMany(Dipendente::class);
    }

    public function regoleCalcolo()
    {
        return $this->hasMany(RegolaCalcoloContratto::class);
    }
}
