<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RegolaCalcoloContratto extends Model
{
    protected $table = 'regole_calcolo_contratto';

    protected $fillable = [
        'contratto_id',
        'ore_settimanali_teoriche',
        'descrizione',
        'limite_straordinario_mensile',
    ];

    protected $casts = [
        'ore_settimanali_teoriche' => 'decimal:2',
        'limite_straordinario_mensile' => 'decimal:2',
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
        return $this->belongsToMany(
            Dipendente::class, 
            'dipendente_regola_calcolo',
            'regola_calcolo_contratto_id',  // foreign key su pivot table
            'dipendente_id'                 // other key su pivot table
        )->withTimestamps();
    }
}
