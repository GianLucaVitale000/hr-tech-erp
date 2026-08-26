<?php

namespace App\Services;

use App\Models\Dipendente;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class PermessiFerieService
{
    public function calcola(Dipendente $dipendente, int $anno): array
    {
        $inizioAssunzione = $dipendente->data_assunzione
            ? Carbon::parse($dipendente->data_assunzione)->startOfDay()
            : Carbon::create($anno, 1, 1)->startOfDay();
        $fineAnno = Carbon::create($anno, 12, 31)->endOfDay();
        $oggi = Carbon::today();

        $condizioni = $this->condizioni($dipendente);
        $ratei = [];
        $godute = $this->godute($dipendente, $inizioAssunzione, $fineAnno);

        $mese = $inizioAssunzione->copy()->startOfMonth();
        $ultimoMese = $fineAnno->copy()->startOfMonth();
        while ($mese <= $ultimoMese) {
            $condizione = $this->condizionePerMese($condizioni, $mese);
            $attivo = $mese->year > $inizioAssunzione->year ||
                ($mese->year === $inizioAssunzione->year && $mese->month >= $inizioAssunzione->month);
            $matura = $attivo && $this->maturaNelMese($mese, $inizioAssunzione, $condizione);
            $percentuale = (float) ($condizione?->percentuale_part_time ?? $dipendente->percentuale_part_time ?? 100);
            $contratto = $condizione?->contratto;

            $ratei[] = [
                'anno' => $mese->year,
                'mese' => $mese->month,
                'ferie' => $matura ? $this->riproporziona($contratto?->rateo_mensile_ferie, $percentuale) : 0,
                'permessi' => $matura ? $this->riproporziona((float) ($contratto?->rateo_mensile_permessi_rol ?? 0) + (float) ($contratto?->rateo_mensile_ex_festivita ?? 0), $percentuale) : 0,
            ];
            $mese->addMonth();
        }

        $ferie = $this->consumoFifo($ratei, $godute['ferie'], 'ferie');
        $permessi = $this->consumoFifo($ratei, $godute['permessi'], 'permessi');
        $quoteAnno = collect($ferie['quote'])->where('anno', $anno);
        $maturatoAnno = (float) $quoteAnno->sum('maturato');
        $godutoAnno = (float) ($godute['ferie_per_anno'][$anno] ?? 0);
        $maturatoPermessiAnno = (float) collect($permessi['quote'])->where('anno', $anno)->sum('maturato');
        $godutoPermessiAnno = (float) ($godute['permessi_per_anno'][$anno] ?? 0);
        $minimoDueSettimane = $maturatoAnno / 2;
        $godutoEntroAnno = $godutoAnno;
        $residuoLegale = max(0, $maturatoAnno - $minimoDueSettimane);
        $godutoResiduoLegale = (float) $quoteAnno->sum('goduto_residuo_legale');
        $scadenza = Carbon::create($anno + 1, 6, 30);
        $mensile = $this->calcolaSaldiMensili($ratei, $godute['per_mese']);

        return [
            'anno' => $anno,
            'ferie' => [
                'maturate' => $maturatoAnno,
                'godute' => $godutoAnno,
                'residue' => $mensile['saldo_ferie_fine_anno'],
                'godute_entra_anno' => $godutoEntroAnno,
                'minimo_due_settimane' => $minimoDueSettimane,
                'percentuale_due_settimane' => $minimoDueSettimane > 0 ? min(100, $godutoEntroAnno / $minimoDueSettimane * 100) : 100,
                'residuo_legale' => $residuoLegale,
                'goduto_residuo_legale' => $godutoResiduoLegale,
                'percentuale_smaltimento' => $residuoLegale > 0 ? min(100, $godutoResiduoLegale / $residuoLegale * 100) : 100,
                'scadenza_residuo_legale' => $scadenza->toDateString(),
                'stato' => $this->statoFerie($godutoEntroAnno, $minimoDueSettimane, $godutoResiduoLegale, $residuoLegale, $scadenza, $oggi),
                'dettaglio' => $ferie['quote'],
            ],
            'permessi_rol_ex_festivita' => [
                'maturati' => $maturatoPermessiAnno,
                'goduti' => $godutoPermessiAnno,
                'residui' => $mensile['saldo_permessi_fine_anno'],
            ],
            'mensile' => collect($mensile['righe'])->where('anno', $anno)->values(),
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
        $presenze = $dipendente->presenze()->whereBetween('data', [$da, $a])->get();
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

    private function calcolaSaldiMensili(array $ratei, array $godutePerMese): array
    {
        $saldoFerie = 0.0;
        $saldoPermessi = 0.0;
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
