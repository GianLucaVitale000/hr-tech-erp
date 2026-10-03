<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PresenzaComunicazione extends Model
{
    protected $table = 'presenza_comunicazioni';

    protected $fillable = [
        'dipendente_id',
        'admin_id',
        'mese',
        'anno',
        'messaggio',
        'letto_at',
    ];

    protected $casts = [
        'letto_at' => 'datetime',
    ];

    public function dipendente()
    {
        return $this->belongsTo(Dipendente::class);
    }

    public function admin()
    {
        return $this->belongsTo(User::class, 'admin_id');
    }
}
