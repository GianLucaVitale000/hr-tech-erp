<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Dipendente extends Model
{

    protected $table = 'dipendenti';

    protected $fillable = [
        'user_id',
        'contratto_id',
        'codice_fiscale',
        'iban',
        'livello',
        'mansione',
        'data_assunzione',
        'percentuale_part_time',
        'giorni_lavorativi_settimanali',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function contratto()
    {
        return $this->belongsTo(Contratto::class);
    }

    public function presenze()
    {
        return $this->hasMany(Presenza::class);
    }
}
