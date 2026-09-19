import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'

export function FeriePermessiCard({ dipendenteSelezionato, annoSelezionato, analisiFerie, formatValue }) {
  return (
    <div className="analisi-hr-card">
      <div className="analisi-hr-card-header">
        <span className="analisi-hr-card-title">Ferie/Permessi</span>
      </div>
      <hr className="analisi-hr-card-divider" />
      <div className="analisi-hr-card-body-short">
        {!dipendenteSelezionato || !annoSelezionato || !analisiFerie ? (
          <p className="analisi-hr-text-gray">Seleziona un dipendente per visualizzare i dati.</p>
        ) : (
          <div className="analisi-hr-flex-column-gap">
            <div className="analisi-hr-grid-2cols">
              <div><strong>Ferie: </strong> <span>{formatValue(analisiFerie.ferie.maturate)} mat. / {formatValue(analisiFerie.ferie.godute)} god.</span></div>
              <div><strong>Residuo: </strong> <span>{formatValue(analisiFerie.ferie.residue)} ore</span></div>
              <div><strong>Min. 2 settimane:</strong> <span>{formatValue(analisiFerie.ferie.percentuale_due_settimane, 1)}%</span></div>
              <div><strong>Smaltimento legale:</strong> <span>{formatValue(analisiFerie.ferie.percentuale_smaltimento, 1)}%</span></div>
              <div><strong>situazione ferie:</strong> <span className="analisi-hr-text-status" style={{ color: analisiFerie.ferie.stato === 'regolare' ? '#34d399' : '#fbbf24' }}>{analisiFerie.ferie.stato}</span></div>
              <div><strong>ROL + Ex-fest.: </strong> <span>{formatValue(analisiFerie.permessi_rol_ex_festivita.maturati)} maturati / {formatValue(analisiFerie.permessi_rol_ex_festivita.goduti)} goduti</span></div>
              <div><strong>Residuo:</strong> <span>{formatValue(analisiFerie.permessi_rol_ex_festivita.residui)} ore</span></div>
            </div>
            <div className="analisi-hr-chart-220">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analisiFerie.mensile.map((mese) => ({
                    name: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'][mese.mese - 1],
                    ferie: mese.ferie_godute,
                    permessi: mese.permessi_goduti
                  }))}
                  margin={{ top: 8, right: 8, left: -18, bottom: 4 }}
                  barGap={2}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                  <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 10 }} width={42} />
                  <Tooltip
                    cursor={false}
                    wrapperStyle={{ opacity: 1 }}
                    contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--card-value-color)', fontSize: '0.75rem' }}
                    formatter={(value, name) => [formatValue(value, 2) + ' ore', name === 'ferie' || name === 'Ferie' ? 'Ferie' : 'Permessi/ROL-ex festività']}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.7rem', marginBottom: 0 }} />
                  <Bar dataKey="ferie" name="Ferie" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="permessi" name="Permessi/ROL-ex festività" fill="#10b981" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
