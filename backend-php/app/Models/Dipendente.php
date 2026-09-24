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
        'sesso',
        'tipo_contratto',
        'data_scadenza_contratto',
        'percentuale_part_time',
        'giorni_lavorativi_settimanali',
        'R1',
        'R2',
        'ore_settimanali',
        'rateo_mensile_ferie',
        'rateo_mensile_permessi_rol',
        'rateo_mensile_ex_festivita',
        'residuo_precedente_ferie',
        'residuo_precedente_permessi',
    ];

    protected $casts = [
        'data_assunzione' => 'datetime:Y-m-d',
        'data_scadenza_contratto' => 'datetime:Y-m-d',
        'rateo_mensile_ferie' => 'decimal:5',
        'rateo_mensile_permessi_rol' => 'decimal:5',
        'rateo_mensile_ex_festivita' => 'decimal:5',
        'residuo_precedente_ferie' => 'decimal:5',
        'residuo_precedente_permessi' => 'decimal:5',
    ];

    /**
     * Attributi calcolati che devono essere inclusi nella serializzazione JSON
     */
    protected $appends = [
        'regola_calcolo',
        'ore_settimanali_part_time',
        'has_orari_settimanali_configurati',
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

    public function condizioniContrattuali()
    {
        return $this->hasMany(DipendenteCondizioneContrattuale::class);
    }

    public function orariSettimanali()
    {
        return $this->hasMany(DipendenteOrarioSettimanale::class);
    }

    /**
     * Relazione molti-a-molti con RegolaCalcoloContratto tramite tabella pivot
     */
    public function regoleCalcolo()
    {
        return $this->belongsToMany(
            RegolaCalcoloContratto::class, 
            'dipendente_regola_calcolo',
            'dipendente_id',                // foreign key su pivot table
            'regola_calcolo_contratto_id'   // other key su pivot table
        )->withTimestamps();
    }

    /**
     * Accessor per ottenere la regola di calcolo del dipendente.
     * Priorità:
     * 1. Regola specifica associata tramite pivot (profilo orario personalizzato)
     * 2. Prima regola del contratto (fallback)
     */
    public function getRegolaCalcoloAttribute()
    {
        // 1. Verifica se c'è una regola specifica associata tramite pivot
        if ($this->regoleCalcolo->isNotEmpty()) {
            return $this->regoleCalcolo->first();
        }
        
        // 2. Fallback: prima regola del contratto
        if ($this->contratto && $this->contratto->regoleCalcolo->isNotEmpty()) {
            return $this->contratto->regoleCalcolo->first();
        }
        
        return null;
    }

    /**
     * Controlla se il dipendente ha la configurazione orari settimanali completata
     * Per part-time, serve questa configurazione per poter inserire presenze
     */
    public function getHasOrariSettimanaliConfiguratiAttribute(): bool
    {
        // Se è full-time (100%), non serve la configurazione personalizzata
        if ((float)($this->percentuale_part_time ?? 100) >= 100) {
            return true;
        }
        
        // Per part-time, serve almeno un record con ore > 0
        return $this->orariSettimanali()
            ->where('ore_giornaliere_previste', '>', 0)
            ->exists();
    }

    /**
     * Calcola le ore settimanali previste per questo dipendente
     * = ore_settimanali_teoriche * (percentuale_part_time / 100)
     * Richiede che il dipendente abbia un contratto con regole di calcolo configurate
     */
    public function getOreSettimanaliPartTimeAttribute(): ?float
    {
        $regola = $this->regolaCalcolo;
        
        // Se non c'è regola di calcolo o ore_settimanali_teoriche non è impostato
        // non possiamo calcolare le ore part-time
        if (!$regola || $regola->ore_settimanali_teoriche === null || (float)$regola->ore_settimanali_teoriche <= 0) {
            return null;
        }
        
        $percentuale = (float)($this->percentuale_part_time ?? 100);
        return (float)$regola->ore_settimanali_teoriche * ($percentuale / 100);
    }

    /**
     * Restituisce le ore previste per un specifico giorno della settimana
     * Usato per calcolare il limite ordinarie per quel giorno
     */
    public function getOrePrevistePerGiorno(int $giornoSettimana): float
    {
        // Per full-time, usa il calcolo standard
        if ((float)($this->percentuale_part_time ?? 100) >= 100) {
            $regola = $this->regolaCalcolo;
            if ($regola && $regola->ore_settimanali_teoriche > 0) {
                $oreGiornaliereContratto = (float)$regola->ore_settimanali_teoriche;
                $giorniLavorativi = $this->giorni_lavorativi_settimanali ?? 5;
                return ($oreGiornaliereContratto / $giorniLavorativi);
            }
            // Default per full-time senza regola: 8 ore (standard contrattuale)
            return 8;
        }
        
        // Per part-time, cerca la configurazione personalizzata
        $orario = $this->orariSettimanali
            ->where('giorno_settimana', $giornoSettimana)
            ->first();
        
        return $orario ? (float)$orario->ore_giornaliere_previste : 0;
    }
}
