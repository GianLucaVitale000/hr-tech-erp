<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RegolaCalcoloContratto extends Model
{
    protected $table = 'regole_calcolo_contratto';

    protected $fillable = [
        'contratto_id',
        'ore_settimanali_teoriche',
    ];

    protected $casts = [
        'ore_settimanali_teoriche' => 'decimal:2',
    ];

    // Accessor per convertire solo null in null (0 è un valore valido)
    public function getOreSettimanaliTeoricheAttribute($value)
    {
        if ($value === null) {
            return null;
        }
        return (float)$value;
    }

    public function contratto()
    {
        return $this->belongsTo(Contratto::class);
    }

    public function dipendenti()
    {
        return $this->hasMany(Dipendente::class, 'regola_calcolo_id');
    }
}
