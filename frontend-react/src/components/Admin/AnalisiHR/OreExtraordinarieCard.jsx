import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'
import { RisultatoAnalisiPartTime } from './RisultatoAnalisiPartTime'
import { calcolaMediaSupplementari } from '../../../utils/analisiHRUtils'

export function OreExtraordinarieCard({
  dipendenteSelezionato,
  annoSelezionato,
  datiAnnuali,
  datiMensualiOreExtraordinarie,
  mesiConsecutiviSelezionati,
  setMesiConsecutiviSelezionati,
  datiDipendentePerAnalisi,
  formatValue
}) {
  return (
    <div className="analisi-hr-card">
      <div className="analisi-hr-card-header">
        <span className="analisi-hr-card-title">{datiAnnuali.isFullTime ? 'Ore Straordinarie' : 'Ore Eccedenti'}</span>
      </div>
      <hr className="analisi-hr-card-divider" />
      <div className="analisi-hr-card-body-chart">
        {!dipendenteSelezionato || !annoSelezionato || datiMensualiOreExtraordinarie.length === 0 ? (
          <div className="analisi-hr-flex-center">
            <p className="analisi-hr-text-gray">Seleziona un dipendente per visualizzare i dati.</p>
          </div>
        ) : (
          <div className="analisi-hr-flex-column-gap" style={{flex: 1}}>
            {/* Totali annuali */}
            <div className="analisi-hr-grid-2cols-sm">
              {datiAnnuali.isFullTime ? (
                <div><strong>Straordinarie:</strong> <span>{formatValue(datiAnnuali.oreStraordinarie)} h</span></div>
              ) : (
                <>
                  <div><strong>Supplementari:</strong> <span>{formatValue(datiMensualiOreExtraordinarie.reduce((s, m) => s + m.supplementari, 0))} h</span></div>
                  <div><strong>Straordinarie:</strong> <span>{formatValue(datiMensualiOreExtraordinarie.reduce((s, m) => s + m.straordinarie, 0))} h</span></div>
                </>
              )}
            </div>

            {/* Grafico istogramma ore straordinarie/eccedenti mensili */}
            <div className="analisi-hr-chart-280">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={datiMensualiOreExtraordinarie}
                  margin={{ top: 8, right: 8, left: -18, bottom: 4 }}
                  barGap={0}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                  <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 10 }} width={42} />
                  <Tooltip
                    cursor={false}
                    wrapperStyle={{ opacity: 1 }}
                    contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--card-value-color)', fontSize: '0.75rem' }}
                    formatter={(value, name) => {
                      let label = ''
                      if (name === 'ordinarie') label = 'Ordinarie'
                      else if (name === 'supplementari') label = 'Supplementari'
                      else if (name === 'straordinarie') label = 'Straordinarie'
                      return [formatValue(value, 2) + ' h', label]
                    }}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.7rem', marginBottom: 0 }} />
                  <Bar dataKey="ordinarie" name="Ordinarie" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  {!datiAnnuali.isFullTime && (
                    <Bar dataKey="supplementari" name="Supplementari" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                  )}
                  <Bar dataKey="straordinarie" name="Straordinarie" fill="#ef4444" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Analisi supplementari continuativi: visibile solo per part-time */}
            {!datiAnnuali.isFullTime && (
            <div className="analisi-hr-margin-top-sm">
              <div className="analisi-hr-flex-center-sm">
                <label htmlFor="mesi-consecutivi-select" className="analisi-hr-label-sm">
                  Mesi consecutivi con supplementari:
                </label>
                <select
                  id="mesi-consecutivi-select"
                  value={mesiConsecutiviSelezionati}
                  onChange={(e) => setMesiConsecutiviSelezionati(Number(e.target.value))}
                  className="analisi-hr-select-pt"
                >
                  {Array.from({ length: 11 }, (_, i) => i + 2).map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              {(() => {
                const risultato = calcolaMediaSupplementari(
                  datiMensualiOreExtraordinarie,
                  mesiConsecutiviSelezionati
                )

                if (!risultato.trovato) {
                  return (
                    <div className="analisi-hr-message analisi-hr-message-gray">
                      Nessun periodo continuativo di {mesiConsecutiviSelezionati} mesi con ore supplementari.
                    </div>
                  )
                }

                return (
                  <div className="analisi-hr-parttime-result">
                    <RisultatoAnalisiPartTime
                      risultato={risultato}
                      datiDipendente={datiDipendentePerAnalisi}
                    />
                  </div>
                )
              })()}
            </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
