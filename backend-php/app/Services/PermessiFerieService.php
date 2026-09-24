<?php

namespace App\Services;

use App\Models\Dipendente;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class PermessiFerieService
{
    public function calcola(Dipendente $dipendente, int $anno, ?Carbon $dataFineCustom = null): array
    {
        $inizioAssunzione = $dipendente->data_assunzione
            ? Carbon::parse($dipendente->data_assunzione)->startOfDay()
            : Carbon::create($anno, 1, 1)->startOfDay();
        
        $finePeriodo = $dataFineCustom ? $dataFineCustom->copy()->endOfDay() : Carbon::create($anno, 12, 31)->endOfDay();
        $inizioAnno = Carbon::create($anno, 1, 1)->startOfDay();
        $oggi = Carbon::today();

        $condizioni = $this->condizioni($dipendente);
        
        // Se il dipendente è stato assunto nell'anno corrente ($anno), il residuo precedente è 0.
        // Altrimenti, se non è valorizzato esplicitamente sul record, lo calcoliamo dinamicamente dall'anno precedente ricavandolo dalle presenze.
        $annoAssunzione = $dipendente->data_assunzione ? Carbon::parse($dipendente->data_assunzione)->year : null;
        
        if ($annoAssunzione && $annoAssunzione === $anno) {
            $residuoFerieAnnoPrecedente = 0.0;
            $residuoPermessiAnnoPrecedente = 0.0;
        } else {
            $residuoFerieAnnoPrecedente = (float) ($dipendente->residuo_precedente_ferie ?? 0);
            $residuoPermessiAnnoPrecedente = (float) ($dipendente->residuo_precedente_permessi ?? 0);

            // Se non è mai stato salvato (è 0) ma siamo in un anno successivo all'assunzione, calcoliamo dinamicamente il residuo dell'anno precedente ($anno - 1)
            if ($residuoFerieAnnoPrecedente === 0.0 && $residuoPermessiAnnoPrecedente === 0.0 && (! $annoAssunzione || $annoAssunzione < $anno)) {
                $annoPrecedente = $anno - 1;
                $calcoloPrecedente = $this->calcolaAnnoPrecedenteDinamicamente($dipendente, $annoPrecedente);
                $residuoFerieAnnoPrecedente = $calcoloPrecedente['ferie'];
                $residuoPermessiAnnoPrecedente = $calcoloPrecedente['permessi'];
            }
        }

        // Ora calcoliamo per l'anno corrente (da Gennaio fino a $finePeriodo)
        $rateiAnnoCorrente = [];
        $meseAnnoCorr = $inizioAnno->copy()->startOfMonth();
        $ultimoMeseAnnoCorr = $finePeriodo->copy()->startOfMonth();
        while ($meseAnnoCorr <= $ultimoMeseAnnoCorr) {
            $condizione = $this->condizionePerMese($condizioni, $meseAnnoCorr);
            $attivo = $meseAnnoCorr->year > $inizioAssunzione->year ||
                ($meseAnnoCorr->year === $inizioAssunzione->year && $meseAnnoCorr->month >= $inizioAssunzione->month);
            $matura = $attivo && $this->maturaNelMese($meseAnnoCorr, $inizioAssunzione, $condizione);
            $percentuale = (float) ($condizione?->percentuale_part_time ?? $dipendente->percentuale_part_time ?? 100);
            
            $rateoFerie = (float) ($dipendente->rateo_mensile_ferie ?? 0);
            $rateoPermessiRol = (float) ($dipendente->rateo_mensile_permessi_rol ?? 0);
            $rateoExFestivita = (float) ($dipendente->rateo_mensile_ex_festivita ?? 0);

            $rateiAnnoCorrente[] = [
                'anno' => $meseAnnoCorr->year,
                'mese' => $meseAnnoCorr->month,
                'ferie' => $matura ? $this->riproporziona($rateoFerie, $percentuale) : 0,
                'permessi' => $matura ? $this->riproporziona($rateoPermessiRol + $rateoExFestivita, $percentuale) : 0,
            ];
            $meseAnnoCorr->addMonth();
        }

        $godutiAnnoCorrente = $this->godute($dipendente, $inizioAnno, $finePeriodo);
        
        $maturatoFerieAnno = collect($rateiAnnoCorrente)->sum('ferie');
        $maturatoPermessiAnno = collect($rateiAnnoCorrente)->sum('permessi');

        $godutoFerieAnno = (float) ($godutiAnnoCorrente['ferie'] ?? 0);
        $godutoPermessiAnno = (float) ($godutiAnnoCorrente['permessi'] ?? 0);

        $residuoFerieAggiornato = $residuoFerieAnnoPrecedente + $maturatoFerieAnno - $godutoFerieAnno;
        $residuoPermessiAggiornato = $residuoPermessiAnnoPrecedente + $maturatoPermessiAnno - $godutoPermessiAnno;

        $minimoDueSettimane = $maturatoFerieAnno / 2;
        $godutoEntroAnno = $godutoFerieAnno;
        $residuoLegale = max(0, $maturatoFerieAnno - $minimoDueSettimane);
        
        $mensile = $this->calcolaSaldiMensiliConResiduo($rateiAnnoCorrente, $godutiAnnoCorrente['per_mese'], $residuoFerieAnnoPrecedente, $residuoPermessiAnnoPrecedente);

        return [
            'anno' => $anno,
            'ferie' => [
                'residuo_anno_precedente' => round($residuoFerieAnnoPrecedente, 5),
                'maturate' => round($maturatoFerieAnno, 5),
                'godute' => round($godutoFerieAnno, 5),
                'residue' => round($residuoFerieAggiornato, 5),
                'godute_entra_anno' => round($godutoEntroAnno, 5),
                'minimo_due_settimane' => round($minimoDueSettimane, 5),
                'percentuale_due_settimane' => $minimoDueSettimane > 0 ? min(100, $godutoEntroAnno / $minimoDueSettimane * 100) : 100,
                'residuo_legale' => round($residuoLegale, 5),
                'goduto_residuo_legale' => $godutoEntroAnno,
                'percentuale_smaltimento' => $residuoLegale > 0 ? min(100, $godutoEntroAnno / $residuoLegale * 100) : 100,
                'scadenza_residuo_legale' => Carbon::create($anno + 1, 6, 30)->toDateString(),
                'stato' => $this->statoFerie($godutoEntroAnno, $minimoDueSettimane, $godutoEntroAnno, $residuoLegale, Carbon::create($anno + 1, 6, 30), $oggi),
                'dettaglio' => $rateiAnnoCorrente,
            ],
            'permessi_rol_ex_festivita' => [
                'residuo_anno_precedente' => round($residuoPermessiAnnoPrecedente, 5),
                'maturati' => round($maturatoPermessiAnno, 5),
                'goduti' => round($godutoPermessiAnno, 5),
                'residui' => round($residuoPermessiAggiornato, 5),
            ],
            'mensile' => $mensile['righe'],
        ];
    }

    private function condizioni(Dipendente $dipendente): Collection
    {
        $condizioni = $dipendente->condizioniContrattuali()->with('contratto')->orderBy('data_inizio')->get();
        if ($condizioni->isNotEmpty()) return $condizioni;
        return collect([(object) [
            'contratto_id' => $dipendente->contratto_id,
            'percentuale_part_time' => $dipendente->percentuale_part_time ?? 100,
            'data_inizio' => $dipendente->data_assunzione,
            'contratto' => $dipendente->contratto,
        ]]);
    }

    private function condizionePerMese(Collection $condizioni, Carbon $mese): mixed
    {
        return $condizioni->filter(function ($condizione) use ($mese) {
            $inizio = Carbon::parse($condizione->data_inizio);
            if ($inizio->startOfMonth()->greaterThan($mese)) return false;
            return $inizio->startOfMonth()->lessThan($mese) || $inizio->day <= 15;
        })->last() ?? $condizioni->first();
    }

    private function maturaNelMese(Carbon $mese, Carbon $assunzione, mixed $condizione): bool
    {
        $inizio = Carbon::parse($condizione?->data_inizio ?? $assunzione);
        if ($mese->year === $inizio->year && $mese->month === $inizio->month) return $inizio->day <= 15;
        return true;
    }

    private function riproporziona(mixed $rateo, float $percentuale): float
    {
        return round((float) ($rateo ?? 0) * $percentuale / 100, 5);
    }

    private function godute(Dipendente $dipendente, Carbon $da, Carbon $a): array
    {
        $presenze = $dipendente->presenze()->whereBetween('data', [$da, $a])->where('stato', 'approvato')->get();
        $feriePerAnno = [];
        $permessiPerAnno = [];
        $perMese = [];

        foreach ($presenze as $presenza) {
            $anno = Carbon::parse($presenza->data)->year;
            $mese = Carbon::parse($presenza->data)->format('Y-m');
            $ore = (float) ($presenza->ore_causale ?? 0);

            if (!isset($perMese[$mese])) {
                $perMese[$mese] = ['ferie' => 0, 'permessi' => 0];
            }

            if ($presenza->causale === 'ferie') {
                $feriePerAnno[$anno] = ($feriePerAnno[$anno] ?? 0) + $ore;
                $perMese[$mese]['ferie'] += $ore;
            }

            if ($presenza->causale === 'permesso_rol') {
                $permessiPerAnno[$anno] = ($permessiPerAnno[$anno] ?? 0) + $ore;
                $perMese[$mese]['permessi'] += $ore;
            }
        }

        return [
            'ferie' => (float) $presenze->where('causale', 'ferie')->sum('ore_causale'),
            'permessi' => (float) $presenze->where('causale', 'permesso_rol')->sum('ore_causale'),
            'ferie_per_anno' => $feriePerAnno,
            'permessi_per_anno' => $permessiPerAnno,
            'per_mese' => $perMese,
        ];
    }

    private function calcolaAnnoPrecedenteDinamicamente(Dipendente $dipendente, int $annoPrecedente): array
    {
        $inizioAssunzione = $dipendente->data_assunzione
            ? Carbon::parse($dipendente->data_assunzione)->startOfDay()
            : Carbon::create($annoPrecedente, 1, 1)->startOfDay();

        // Se l'anno precedente è antecedente all'assunzione, non ci sono residui
        if ($annoPrecedente < $inizioAssunzione->year) {
            return ['ferie' => 0.0, 'permessi' => 0.0];
        }

        $finePeriodo = Carbon::create($annoPrecedente, 12, 31)->endOfDay();
        $inizioAnno = Carbon::create($annoPrecedente, 1, 1)->startOfDay();

        $condizioni = $this->condizioni($dipendente);
        
        // Per l'anno ancora precedente, ricorsione (o 0 se siamo all'anno di assunzione)
        $residuoFeriePP = 0.0;
        $residuoPermessiPP = 0.0;
        $annoAssunzione = $inizioAssunzione->year;

        if ($annoPrecedente > $annoAssunzione) {
            // Ricorsione limitata all'anno precedente del precedente
            $pp = $this->calcolaAnnoPrecedenteDinamicamente($dipendente, $annoPrecedente - 1);
            $residuoFeriePP = $pp['ferie'];
            $residuoPermessiPP = $pp['permessi'];
        }

        $rateiAnno = [];
        $meseAnnoCorr = $inizioAnno->copy()->startOfMonth();
        $ultimoMeseAnnoCorr = $finePeriodo->copy()->startOfMonth();
        while ($meseAnnoCorr <= $ultimoMeseAnnoCorr) {
            $condizione = $this->condizionePerMese($condizioni, $meseAnnoCorr);
            $attivo = $meseAnnoCorr->year > $inizioAssunzione->year ||
                ($meseAnnoCorr->year === $inizioAssunzione->year && $meseAnnoCorr->month >= $inizioAssunzione->month);
            $matura = $attivo && $this->maturaNelMese($meseAnnoCorr, $inizioAssunzione, $condizione);
            $percentuale = (float) ($condizione?->percentuale_part_time ?? $dipendente->percentuale_part_time ?? 100);
            
            $rateoFerie = (float) ($dipendente->rateo_mensile_ferie ?? 0);
            $rateoPermessiRol = (float) ($dipendente->rateo_mensile_permessi_rol ?? 0);
            $rateoExFestivita = (float) ($dipendente->rateo_mensile_ex_festivita ?? 0);

            $rateiAnno[] = [
                'anno' => $meseAnnoCorr->year,
                'mese' => $meseAnnoCorr->month,
                'ferie' => $matura ? $this->riproporziona($rateoFerie, $percentuale) : 0,
                'permessi' => $matura ? $this->riproporziona($rateoPermessiRol + $rateoExFestivita, $percentuale) : 0,
            ];
            $meseAnnoCorr->addMonth();
        }

        $godutiAnno = $this->godute($dipendente, $inizioAnno, $finePeriodo);
        $maturatoFerie = collect($rateiAnno)->sum('ferie');
        $maturatoPermessi = collect($rateiAnno)->sum('permessi');

        $godutoFerie = (float) ($godutiAnno['ferie'] ?? 0);
        $godutoPermessi = (float) ($godutiAnno['permessi'] ?? 0);

        return [
            'ferie' => max(0, $residuoFeriePP + $maturatoFerie - $godutoFerie),
            'permessi' => max(0, $residuoPermessiPP + $maturatoPermessi - $godutoPermessi),
        ];
    }

    private function calcolaSaldiMensiliConResiduo(array $ratei, array $godutePerMese, float $residuoFerieIniziale, float $residuoPermessiIniziale): array
    {
        $saldoFerie = $residuoFerieIniziale;
        $saldoPermessi = $residuoPermessiIniziale;
        $righe = [];

        foreach ($ratei as $rateo) {
            $chiave = sprintf('%04d-%02d', $rateo['anno'], $rateo['mese']);
            $godutoFerie = (float) ($godutePerMese[$chiave]['ferie'] ?? 0);
            $godutoPermessi = (float) ($godutePerMese[$chiave]['permessi'] ?? 0);
            $saldoFerie += $rateo['ferie'] - $godutoFerie;
            $saldoPermessi += $rateo['permessi'] - $godutoPermessi;

            $righe[] = [
                'anno' => $rateo['anno'],
                'mese' => $rateo['mese'],
                'ferie_maturate' => $rateo['ferie'],
                'ferie_godute' => $godutoFerie,
                'saldo_ferie' => round($saldoFerie, 5),
                'permessi_maturati' => $rateo['permessi'],
                'permessi_goduti' => $godutoPermessi,
                'saldo_permessi' => round($saldoPermessi, 5),
            ];
        }

        return [
            'righe' => $righe,
            'saldo_ferie_fine_anno' => round($saldoFerie, 5),
            'saldo_permessi_fine_anno' => round($saldoPermessi, 5),
        ];
    }

    private function consumoFifo(array $ratei, float $goduto, string $tipo): array
    {
        $quote = [];
        $restante = $goduto;
        foreach ($ratei as $rateo) {
            $maturato = (float) $rateo[$tipo];
            $usato = min($maturato, $restante);
            $restante = max(0, $restante - $usato);
            $quote[] = [
                'anno' => $rateo['anno'], 'mese' => $rateo['mese'], 'maturato' => $maturato,
                'goduto' => $usato, 'goduto_entra_anno' => $usato,
                'goduto_residuo_legale' => $usato,
            ];
        }
        return ['quote' => $quote, 'eccedenza' => $restante];
    }

    private function statoFerie(float $godutoAnno, float $minimo, float $godutoResiduo, float $residuo, Carbon $scadenza, Carbon $oggi): string
    {
        if ($godutoAnno < $minimo && $oggi->year > $scadenza->year - 1) return 'non_conforme';
        if ($godutoResiduo >= $residuo) return 'regolare';
        return $oggi->greaterThan($scadenza) ? 'non_conforme' : 'in_corso';
    }
}
