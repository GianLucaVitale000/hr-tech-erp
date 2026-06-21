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
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function contratto()
    {
        return $this->belongsTo(Contratto::class);
    }
}
