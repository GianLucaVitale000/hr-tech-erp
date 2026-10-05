<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PrivacyAcknowledgment extends Model
{
    protected $fillable = [
        'dipendente_id',
        'recorded_by',
        'document_type',
        'document_version',
        'document_date',
        'acknowledged_at',
        'archive_method',
        'archive_reference',
        'notes',
    ];

    protected $casts = [
        'document_date' => 'date:Y-m-d',
        'acknowledged_at' => 'date:Y-m-d',
    ];

    public function dipendente()
    {
        return $this->belongsTo(Dipendente::class);
    }

    public function recorder()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
