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

    public function orariSettimanali()
    {
        return $this->hasMany(DipendenteOrarioSettimanale::class);
    }

    /**
     * Accessor per ottenere la regola di calcolo attraverso il contratto.
     * Restituisce la prima regola associata al contratto del dipendente.
     */
    public function getRegolaCalcoloAttribute()
    {
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
            return 0;
        }
        
        // Per part-time, cerca la configurazione personalizzata
        $orario = $this->orariSettimanali
            ->where('giorno_settimana', $giornoSettimana)
            ->first();
        
        return $orario ? (float)$orario->ore_giornaliere_previste : 0;
    }
}
