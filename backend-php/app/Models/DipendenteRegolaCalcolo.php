<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DipendenteRegolaCalcolo extends Model
{
    protected $table = 'dipendente_regola_calcolo';

    protected $fillable = [
        'dipendente_id',
        'regola_calcolo_contratto_id',
    ];

    public function dipendente()
    {
        return $this->belongsTo(Dipendente::class);
    }

    public function regolaCalcolo()
    {
        return $this->belongsTo(RegolaCalcoloContratto::class, 'regola_calcolo_contratto_id');
    }
}
