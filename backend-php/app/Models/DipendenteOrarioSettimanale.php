<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DipendenteOrarioSettimanale extends Model
{
    protected $table = 'dipendente_orari_settimanali';

    protected $fillable = [
        'dipendente_id',
        'giorno_settimana',
        'ore_giornaliere_previste',
        'turno1_dalle',
        'turno1_alle',
        'turno2_dalle',
        'turno2_alle',
    ];

    protected $casts = [
        'ore_giornaliere_previste' => 'decimal:2',
        'giorno_settimana' => 'integer',
        'turno1_dalle' => 'datetime:H:i',
        'turno1_alle' => 'datetime:H:i',
        'turno2_dalle' => 'datetime:H:i',
        'turno2_alle' => 'datetime:H:i',
    ];

    public function dipendente()
    {
        return $this->belongsTo(Dipendente::class);
    }

    /**
     * Restituisce il nome del giorno della settimana
     */
    public function getGiornoSettimanaNameAttribute(): string
    {
        $giorni = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
        return $giorni[$this->giorno_settimana] ?? 'Sconosciuto';
    }
}
