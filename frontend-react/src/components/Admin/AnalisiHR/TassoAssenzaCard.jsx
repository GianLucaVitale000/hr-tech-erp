import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts'

export function TassoAssenzaCard({ dipendenteSelezionato, annoSelezionato, datiAnnuali, formatValue }) {
  const getBarChartGiorniSettimana = () => {
    const giorni = [
      { name: 'Dom', day: 0 },
      { name: 'Lun', day: 1 },
      { name: 'Mar', day: 2 },
      { name: 'Mer', day: 3 },
      { name: 'Gio', day: 4 },
      { name: 'Ven', day: 5 },
      { name: 'Sab', day: 6 }
    ]
    
    return giorni.map(g => ({
      name: g.name,
      Assenze: datiAnnuali.assenzeIndividualiPerGiornoSettimana[g.day] || 0
    }))
  }

  const datiAssenzeChart = [
    { name: 'Malattia', value: datiAnnuali.giorniAssenzaTotali.malattia, color: '#ef4444' },
    { name: 'Maternità', value: datiAnnuali.giorniAssenzaTotali.maternita, color: '#8b5cf6' },
    { name: 'Infortunio', value: datiAnnuali.giorniAssenzaTotali.infortunio, color: '#f59e0b' },
    { name: 'CIG', value: datiAnnuali.giorniAssenzaTotali.cig, color: '#6b7280' },
    { name: 'PNR', value: datiAnnuali.giorniAssenzaTotali.pnr, color: '#10b981' }
  ].filter(item => item.value > 0)

  return (
    <div className="analisi-hr-card">
      <div className="analisi-hr-card-header-sm">
        <span className="analisi-hr-card-title">Tasso di Assenza Individuale</span>
      </div>
      <hr className="analisi-hr-card-divider" />
      <div className="analisi-hr-card-body">
        {!dipendenteSelezionato || !annoSelezionato ? (
          <div className="analisi-hr-flex-center">
            <p className="analisi-hr-text-gray">Seleziona un dipendente per visualizzare i dati.</p>
          </div>
        ) : (
          <>
            {/* Tasso di assenteismo e grafico distribuzione per giorno - allineati orizzontalmente */}
            <div className="analisi-hr-flex-center">
              {/* Tasso percentuale */}
              <div className="analisi-hr-big-number-center">
                <div className="analisi-hr-big-number">
                  {datiAnnuali.giorniTeoriciLavorabili > 0 ?
                    formatValue((datiAnnuali.totaleGiorniAssenza / datiAnnuali.giorniTeoriciLavorabili) * 100, 1) + '%' : '0%'
                  }
                </div>
                {datiAnnuali.assenzeVicinoFestivi > 0 && (
                  <div className="analisi-hr-warning-text">
                    gg. "assenza ponte" su festivi/riposi: {datiAnnuali.assenzeVicinoFestivi}
                  </div>
                )}
              </div>

              {/* Grafico a barre distribuzione per giorno della settimana */}
              <div className="analisi-hr-chart-small">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getBarChartGiorniSettimana()} layout="vertical" activeBar={{ fillOpacity: 1 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={35} tick={{ fontSize: 10, fill: '#9ca3af' }} interval={0} />
                    <Bar dataKey="Assenze" fill="#3b82f6" barSize={12} />
                    <Tooltip
                      cursor={false}
                      wrapperStyle={{ opacity: 1 }}
                      contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--card-value-color)', fontSize: '0.75rem' }}
                      formatter={(value) => [value, 'Assenze']}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Grafico a torta con composizione assenze */}
            <div className="analisi-hr-flex-column-center">
              <div className="analisi-hr-chart-medium">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={datiAssenzeChart}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ percent, x, y, payload }) => (
                        <text 
                          x={x} 
                          y={y} 
                          fontSize={11}
                          fill={payload.color}
                          textAnchor="middle"
                          dominantBaseline="central"
                        >
                          {`${(percent * 100).toFixed(0)}%`}
                        </text>
                      )}
                    >
                      {datiAssenzeChart.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      wrapperStyle={{ opacity: 1 }}
                      contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--card-value-color)', fontSize: '0.75rem' }}
                      formatter={(value) => [value, 'Giorni']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="analisi-hr-legend-grid">
                <div className="analisi-hr-legend-item">
                  <div className="analisi-hr-legend-color" style={{ backgroundColor: '#ef4444'}} />
                  <span>Malattia: {datiAnnuali.giorniAssenzaTotali.malattia} gg.</span>
                </div>
                <div className="analisi-hr-legend-item">
                  <div className="analisi-hr-legend-color" style={{ backgroundColor: '#6b7280'}} />
                  <span>CIG: {datiAnnuali.giorniAssenzaTotali.cig} gg.</span>
                </div>
                <div className="analisi-hr-legend-item">
                  <div className="analisi-hr-legend-color" style={{ backgroundColor: '#8b5cf6'}} />
                  <span>Maternità: {datiAnnuali.giorniAssenzaTotali.maternita} gg.</span>
                </div>
                <div className="analisi-hr-legend-item">
                  <div className="analisi-hr-legend-color" style={{ backgroundColor: '#10b981'}} />
                  <span>PNR: {datiAnnuali.giorniAssenzaTotali.pnr} gg.</span>
                </div>
                <div className="analisi-hr-legend-item">
                  <div className="analisi-hr-legend-color" style={{ backgroundColor: '#f59e0b'}} />
                  <span>Infortunio: {datiAnnuali.giorniAssenzaTotali.infortunio} gg.</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
