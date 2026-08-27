<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DipendenteCondizioneContrattuale extends Model
{
    protected $table = 'dipendente_condizioni_contrattuali';

    protected $fillable = [
        'dipendente_id',
        'contratto_id',
        'percentuale_part_time',
        'data_inizio',
        'data_fine',
    ];

    protected $casts = [
        'percentuale_part_time' => 'decimal:2',
        'data_inizio' => 'datetime:Y-m-d',
        'data_fine' => 'datetime:Y-m-d',
    ];

    public function dipendente(): BelongsTo
    {
        return $this->belongsTo(Dipendente::class);
    }

    public function contratto(): BelongsTo
    {
        return $this->belongsTo(Contratto::class);
    }
}
