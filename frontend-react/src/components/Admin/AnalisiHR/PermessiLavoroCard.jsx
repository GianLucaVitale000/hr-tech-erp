import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts'

export function PermessiLavoroCard({ dipendenteSelezionato, annoSelezionato, datiAnnuali, formatValue }) {
  const datiPRPNRChart = [
    { name: 'PR', value: datiAnnuali.pr, color: '#3b82f6' },
    { name: 'PNR', value: datiAnnuali.pnr, color: '#10b981' },
    { name: 'CIG', value: datiAnnuali.cig, color: '#6b7280' },
    { name: 'Sind', value: datiAnnuali.sindacale, color: '#f59e0b' }
  ].filter(item => item.value > 0)

  return (
    <div className="analisi-hr-card">
      <div className="analisi-hr-card-header-sm">
        <span className="analisi-hr-card-title">PR, PNR, CIG, Sind / Modalità lavoro</span>
      </div>
      <hr className="analisi-hr-card-divider" />
      <div className="analisi-hr-card-body">
        {!dipendenteSelezionato || !annoSelezionato ? (
          <div className="analisi-hr-flex-center">
            <p className="analisi-hr-text-gray">Seleziona un dipendente per visualizzare i dati.</p>
          </div>
        ) : (
          <>
            {/* Totale ore e percentuale - affiancati orizzontalmente */}
            {(() => {
              const totale = datiAnnuali.pr + datiAnnuali.pnr + datiAnnuali.cig + datiAnnuali.sindacale
              const percentuale = datiAnnuali.giorniTeoriciLavorabili > 0 ?
                ((totale) / (datiAnnuali.giorniTeoriciLavorabili * 8) * 100) : 0
              return (
                <div className="analisi-hr-flex-space-around">
                  <div className="analisi-hr-text-center">
                    <div className="analisi-hr-text-value">
                      {formatValue(totale)} h
                    </div>
                    <div className="analisi-hr-text-label">
                      Tot. anno
                    </div>
                  </div>
                  <div className="analisi-hr-text-center">
                    <div className="analisi-hr-text-value">
                      {formatValue(percentuale, 1)}%
                    </div>
                    <div className="analisi-hr-text-label">
                      % su h lavorabili
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Grafico a torta */}
            <div className="analisi-hr-flex-row-center">
              <div className="analisi-hr-chart-180">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={datiPRPNRChart}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={55}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ percent, x, y, payload }) => (
                        <text 
                          x={x} 
                          y={y} 
                          fontSize={12}
                          fill={payload.color}
                          textAnchor="middle"
                          dominantBaseline="central"
                        >
                          {`${(percent * 100).toFixed(0)}%`}
                        </text>
                      )}
                    >
                      {datiPRPNRChart.map((entry, index) => (
                        <Cell key={`cell-pr-pnr-cig-sind-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      cursor={false}
                      wrapperStyle={{ backgroundColor: '#374151', opacity: 1, zIndex: 100 }}
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null
                        return (
                          <div style={{ backgroundColor: '#374151', border: '1px solid #4b5563', padding: '0.5rem', borderRadius: '4px' }}>
                            {payload.map((entry, index) => (
                              <div key={index} style={{ color: entry.payload.color }}>
                                {entry.payload.name}: {formatValue(entry.value, 2)} h
                              </div>
                            ))}
                          </div>
                        )
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="analisi-hr-legend-flex">
                <div className="analisi-hr-legend-item">
                  <div className="analisi-hr-legend-color" style={{ backgroundColor: '#3b82f6'}} />
                  <span>PR: {formatValue(datiAnnuali.pr)} h</span>
                </div>
                <div className="analisi-hr-legend-item">
                  <div className="analisi-hr-legend-color" style={{ backgroundColor: '#10b981'}} />
                  <span>PNR: {formatValue(datiAnnuali.pnr)} h</span>
                </div>
                <div className="analisi-hr-legend-item">
                  <div className="analisi-hr-legend-color" style={{ backgroundColor: '#6b7280'}} />
                  <span>CIG: {formatValue(datiAnnuali.cig)} h</span>
                </div>
                <div className="analisi-hr-legend-item">
                  <div className="analisi-hr-legend-color" style={{ backgroundColor: '#f59e0b'}} />
                  <span>Sind: {formatValue(datiAnnuali.sindacale)} h</span>
                </div>
              </div>
            </div>

            {/* Grafico istogramma modalità di lavoro per mese */}
            <div className="analisi-hr-chart-bar">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datiAnnuali.modalitaLavoroPerMese} margin={{ top: 2, right: 0, left: 0, bottom: 0 }} activeBar={{ fillOpacity: 1 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                  <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 8 }} />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 10 }} hide />
                  <Tooltip
                    cursor={false}
                    content={({ payload }) => (
                      <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'white', padding: '8px 12px', fontSize: '0.75rem', zIndex: 1000 }}>
                        {payload && payload.map((entry, index) => (
                          <div key={index} style={{ color: entry.fill || 'white' }}>{`${entry.name}: ${formatValue(entry.value, 2)} h`}</div>
                        ))}
                      </div>
                    )}
                  />
                  {(() => {
                    const totaleInSede = datiAnnuali.modalitaLavoroPerMese.reduce((sum, m) => sum + (m.in_sede || 0), 0)
                    const totaleSmartWorking = datiAnnuali.modalitaLavoroPerMese.reduce((sum, m) => sum + (m.smart_working || 0), 0)
                    const totaleTrasferta = datiAnnuali.modalitaLavoroPerMese.reduce((sum, m) => sum + (m.trasferta || 0), 0)
                    const totaleLavorato = totaleInSede + totaleSmartWorking + totaleTrasferta
                    const pctInSede = totaleLavorato > 0 ? (totaleInSede / totaleLavorato * 100) : 0
                    const pctSmartWorking = totaleLavorato > 0 ? (totaleSmartWorking / totaleLavorato * 100) : 0
                    const pctTrasferta = totaleLavorato > 0 ? (totaleTrasferta / totaleLavorato * 100) : 0
                    return (
                      <Legend
                        wrapperStyle={{ color: '#9ca3af', fontSize: '0.6rem', marginBottom: 0 }}
                        formatter={(value) => {
                          if (value === 'In Sede') return <span style={{ color: '#3b82f6' }}>{`In Sede: ${pctInSede.toFixed(1)}%`}</span>
                          if (value === 'SW') return <span style={{ color: '#10b981' }}>{`SW: ${pctSmartWorking.toFixed(1)}%`}</span>
                          if (value === 'Trasferta') return <span style={{ color: '#f59e0b' }}>{`Trasferta: ${pctTrasferta.toFixed(1)}%`}</span>
                          return value
                        }}
                      />
                    )
                  })()}
                  <Bar dataKey="in_sede" stackId="modalita" fill="#3b82f6" name="In Sede" />
                  <Bar dataKey="smart_working" stackId="modalita" fill="#10b981" name="SW" />
                  <Bar dataKey="trasferta" stackId="modalita" fill="#f59e0b" name="Trasferta" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
