import { arrotondaQuartoOra } from '../../../utils/analisiHRUtils'

export function RisultatoAnalisiPartTime({ risultato, datiDipendente }) {
  const { oreSettimanaliFT, oreSettimanaliPT, percentualePartTime } = datiDipendente
  const orePT = oreSettimanaliPT
  const suppSett = risultato.mediaSettimanale
  const oreIpoteticheArrotondate = arrotondaQuartoOra(orePT + suppSett)

  const nuovaPercentuale = oreSettimanaliFT > 0
    ? (oreIpoteticheArrotondate / oreSettimanaliFT) * 100
    : 0
  const incrementoPunti = nuovaPercentuale - percentualePartTime
  const formatValue = (v, d = 2) => Number(v || 0).toFixed(d)

  return (
    <>
      <div>
        <strong>Periodo:</strong>{' '}
        <span>{risultato.mesiTrovati.join(' → ')}</span>
      </div>
      <div>
        <strong>Media suppl.:</strong>{' '}
        <span>{formatValue(risultato.mediaMensile)} h/mese</span>
        {' = '}
        <span><strong>{formatValue(suppSett)} h/sett.</strong></span>
      </div>
      <div className="analisi-hr-parttime-divider">
        <div>
          <strong>Tempo Pieno da CCNL :</strong>{' '}
          <span>{formatValue(oreSettimanaliFT)} h/sett.</span>
        </div>
        <div>
          <strong>% Part-Time attuale:</strong>{' '}
          <span className="analisi-hr-parttime-text-yellow">{formatValue(percentualePartTime)}%</span>
          {' = '}
          <span>{formatValue(orePT)} h/sett</span>
        </div>
        <div className="analisi-hr-parttime-divider-dashed">
          <strong>Nuova % Part-Time:</strong>{' '}
          <span>{formatValue(orePT)} + {formatValue(suppSett)} = {formatValue(oreIpoteticheArrotondate)} h/sett</span>
          {' → '}
          <span className="analisi-hr-parttime-text-yellow">
            {formatValue(nuovaPercentuale)}%
          </span>
          <span className="analisi-hr-text-muted"> (</span>
          <span className="analisi-hr-parttime-text-green">
            +{formatValue(incrementoPunti)} pt
          </span>
          <span className="analisi-hr-text-muted">)</span>
        </div>
      </div>
    </>
  )
}
