import { useState, useEffect } from 'react'
import api from '../../services/api'
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

// Componente per le card donut
function DonutCard({ titolo, valore, totale, colore }) {
  const percent = totale > 0 ? (valore / totale) * 100 : 0
  return (
    <div className="dashboard-donut-card">
      <div className="dashboard-donut-title" style={{ color: colore }}>{titolo}</div>
      <div className="dashboard-donut-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={[
                { name: 'Attivi', value: valore },
                { name: 'Inattivi', value: totale - valore }
              ]}
              cx="50%" cy="50%" innerRadius={30} outerRadius={40}
              fill="#8884d8" dataKey="value" labelLine={false} isAnimationActive={false}
              stroke="var(--donut-stroke)"
              strokeWidth={1}
            >
              {[
                { name: 'Attivi', fill: colore },
                { name: 'Inattivi', fill: 'var(--card-bg)' }
              ].map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: 'var(--text-color)',
          fontSize: '0.7rem', fontWeight: '700'
        }}>{percent.toFixed(1)}%</div>
      </div>
    </div>
  )
}


function AdminDashboard() {
  const [dipendenti, setDipendenti] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [meseSelezionato, setMeseSelezionato] = useState(new Date().getMonth() + 1)
  const [annoSelezionato, setAnnoSelezionato] = useState(new Date().getFullYear())
  const [isMobile, setIsMobile] = useState(false)

  // Rileva se è mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const NOMI_MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']

  useEffect(() => {
    const fetchDipendenti = async () => {
      try {
        setLoading(true)
        const response = await api.get('/dipendenti')
        setDipendenti(response.data)
        setError(null)
      } catch (err) {
        setError('Errore nel recupero dei dati dei dipendenti')
        console.error('Error fetching dipendenti:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDipendenti()
  }, [])

  // Calcola il primo anno di assunzione tra tutti i dipendenti
  const getAnnoMinimoAssunzione = () => {
    if (dipendenti.length === 0) return new Date().getFullYear()
    const anniAssunzione = dipendenti
      .filter(d => d.data_assunzione)
      .map(d => new Date(d.data_assunzione).getFullYear())
    return anniAssunzione.length > 0 ? Math.min(...anniAssunzione) : new Date().getFullYear()
  }

  // Funzione per verificare se un dipendente è attivo in un dato mese/anno
  const dipendenteAttivoInPeriodo = (dipendente, mese, anno) => {
    const tipoContratto = dipendente.tipo_contratto || 'indeterminato'
    const dataScadenza = dipendente.data_scadenza_contratto
    const dataAssunzione = dipendente.data_assunzione

    const inizioMeseSelezionato = new Date(anno, mese - 1, 1)
    const fineMeseSelezionato = new Date(anno, mese, 0)

    if (dataAssunzione) {
      const assunzioneDate = new Date(dataAssunzione)
      if (assunzioneDate > fineMeseSelezionato) {
        return false
      }
    }

    if (tipoContratto === 'determinato' && dataScadenza) {
      const scadenzaDate = new Date(dataScadenza)
      if (inizioMeseSelezionato > scadenzaDate) {
        return false
      }
    }

    return true
  }

  const dipendentiAttivi = dipendenti.filter(d => dipendenteAttivoInPeriodo(d, meseSelezionato, annoSelezionato))

  // Calcolo conteggi per le 4 categorie: (5gg/FT, 5gg/PT, 6gg/FT, 6gg/PT)
  let conta5ft = 0, conta5pt = 0, conta6ft = 0, conta6pt = 0
  dipendentiAttivi.forEach(d => {
    const ggSett = d.giorni_lavorativi_settimanali || 5
    const isFT = (d.percentuale_part_time ?? 100) >= 100
    if (ggSett === 5) {
      if (isFT) conta5ft++
      else conta5pt++
    } else if (ggSett === 6) {
      if (isFT) conta6ft++
      else conta6pt++
    }
  })
  const totale = dipendentiAttivi.length

  const aggregaPerCCNL = () => {
    const risultato = {}

    dipendentiAttivi.forEach(dipendente => {
      const siglaCCNL = dipendente.contratto?.codice_cnel || 'Sconosciuto'

      if (!risultato[siglaCCNL]) {
        risultato[siglaCCNL] = {
          sigla: siglaCCNL,
          totale: 0,
          tempoPieno: 0,
          tempoParziale: 0,
          giorni5: 0,
          giorni6: 0,
          tempoDeterminato: 0,
          tempoIndeterminato: 0
        }
      }

      const ccnlData = risultato[siglaCCNL]
      ccnlData.totale++

      if ((dipendente.percentuale_part_time ?? 100) >= 100) {
        ccnlData.tempoPieno++
      } else {
        ccnlData.tempoParziale++
      }

      if (dipendente.giorni_lavorativi_settimanali === 5) {
        ccnlData.giorni5++
      } else if (dipendente.giorni_lavorativi_settimanali === 6) {
        ccnlData.giorni6++
      }

      if (dipendente.tipo_contratto === 'determinato') {
        ccnlData.tempoDeterminato++
      } else {
        ccnlData.tempoIndeterminato++
      }
    })

    return Object.values(risultato)
  }

  const datiCCNL = aggregaPerCCNL()

  // Funzione per generare il pie chart SVG con label esterni
  const renderPieChart = (data) => {
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']
    const total = data.reduce((sum, c) => sum + c.totale, 0)

    if (total === 0) return null

    const sortedData = [...data].sort((a, b) => b.totale - a.totale)

    let cumulativeAngle = 0
    const chartRadius = 65
    const labelRadius = 75
    const svgSize = 300
    const centerX = svgSize / 2
    const centerY = svgSize / 2

    const elements = []

    sortedData.forEach((ccnl, index) => {
      const value = ccnl.totale
      const angle = (value / total) * 360
      const startAngle = cumulativeAngle
      cumulativeAngle += angle
      const endAngle = cumulativeAngle

      const startRad = (startAngle - 90) * Math.PI / 180
      const endRad = (endAngle - 90) * Math.PI / 180

      const x1 = centerX + chartRadius * Math.cos(startRad)
      const y1 = centerY + chartRadius * Math.sin(startRad)
      const x2 = centerX + chartRadius * Math.cos(endRad)
      const y2 = centerY + chartRadius * Math.sin(endRad)

      const largeArcFlag = angle > 180 ? 1 : 0

      const midAngle = startAngle + (angle / 2)
      const midRad = (midAngle - 90) * Math.PI / 180

      const labelX = centerX + labelRadius * Math.cos(midRad)
      const labelY = centerY + labelRadius * Math.sin(midRad)

      const color = colors[index % colors.length]

      elements.push(
        <path
          key={`slice-${ccnl.sigla}`}
          d={`M ${centerX} ${centerY} L ${x1} ${y1} A ${chartRadius} ${chartRadius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
          fill={color}
          stroke="#1f2937"
          strokeWidth="1"
        />
      )

      const cosMid = Math.cos(midRad)
      const sinMid = Math.sin(midRad)
      const textAnchor = cosMid > 0 ? 'start' : 'end'
      const labelYAdjust = sinMid > 0.15 ? 4 : (sinMid < -0.15 ? -4 : 0)

      elements.push(
        <text
          key={`label-${ccnl.sigla}`}
          x={labelX}
          y={labelY + labelYAdjust}
          textAnchor={textAnchor}
          fill={color}
          fontSize="11"
          fontWeight="bold"
        >
          {ccnl.sigla} = {value}
        </text>
      )
    })

    return (
      <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
        {elements}
      </svg>
        )
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
      </div>

      {loading ? (
        <p className="dashboard-loading">Caricamento dati dipendenti...</p>
      ) : error ? (
        <p className="dashboard-error">{error}</p>
      ) : (
        <div className="dashboard-main">
          <h1 className="dashboard-main-title">
            Dashboard di Amministrazione
          </h1>
          <div className="dashboard-section-header">
            <h2 className="dashboard-section-title">
              Riepilogo Dipendenti
            </h2>
            <div className="dashboard-selects-container">
              <select
                value={meseSelezionato}
                onChange={(e) => setMeseSelezionato(parseInt(e.target.value))}
                className="dashboard-select"
              >
                {NOMI_MESI.map((nome, i) => (
                  <option key={i + 1} value={i + 1}>{nome}</option>
                ))}
              </select>
              <select
                value={annoSelezionato}
                onChange={(e) => setAnnoSelezionato(parseInt(e.target.value))}
                className="dashboard-select"
              >
                {(() => {
                  const annoMinimo = getAnnoMinimoAssunzione()
                  const annoMassimo = new Date().getFullYear()
                  const anni = []
                  for (let y = annoMinimo; y <= annoMassimo; y++) {
                    anni.push(y)
                  }
                  return anni.map(y => <option key={y} value={y}>{y}</option>)
                })()}
              </select>
            </div>
          </div>

          {datiCCNL.length > 0 ? (
            <div>
              {isMobile ? (
                <div className="dashboard-mobile-container">
                  {datiCCNL.map((ccnl) => (
                    <div key={ccnl.sigla} className="dashboard-mobile-widget">
                      <h3 className="dashboard-mobile-widget-title">{ccnl.sigla}</h3>
                       <div className="dashboard-mobile-widget-list">
                        {/* Coppia 1: Tempo Pieno vs Tempo Parziale */}
                        <div className="dashboard-mobile-widget-pair">
                          <div className="dashboard-mobile-widget-field">
                            <span className="dashboard-mobile-widget-field-label">Tempo Pieno</span>
                            <span className="dashboard-mobile-widget-field-value">{ccnl.tempoPieno}</span>
                          </div>
                          <div className="dashboard-mobile-widget-field">
                            <span className="dashboard-mobile-widget-field-label">Tempo Parziale</span>
                            <span className="dashboard-mobile-widget-field-value">{ccnl.tempoParziale}</span>
                          </div>
                        </div>

                        {/* Coppia 2: T. Determinato vs T. Indeterminato */}
                        <div className="dashboard-mobile-widget-pair">
                          <div className="dashboard-mobile-widget-field">
                            <span className="dashboard-mobile-widget-field-label">T. Determinato</span>
                            <span className="dashboard-mobile-widget-field-value">{ccnl.tempoDeterminato}</span>
                          </div>
                          <div className="dashboard-mobile-widget-field">
                            <span className="dashboard-mobile-widget-field-label">T. Indeterminato</span>
                            <span className="dashboard-mobile-widget-field-value">{ccnl.tempoIndeterminato}</span>
                          </div>
                        </div>

                        {/* Coppia 3: 5 gg. vs 6 gg. */}
                        <div className="dashboard-mobile-widget-pair">
                          <div className="dashboard-mobile-widget-field">
                            <span className="dashboard-mobile-widget-field-label">5 gg./sett.</span>
                            <span className="dashboard-mobile-widget-field-value">{ccnl.giorni5}</span>
                          </div>
                          <div className="dashboard-mobile-widget-field">
                            <span className="dashboard-mobile-widget-field-label">6 gg./sett.</span>
                            <span className="dashboard-mobile-widget-field-value">{ccnl.giorni6}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="dashboard-totale-widget">
                    <h3 className="dashboard-mobile-widget-title">TOTALE = {datiCCNL.reduce((sum, c) => sum + c.totale, 0)}</h3>
                    <div className="dashboard-mobile-widget-grid dashboard-mobile-widget-grid-3col">
                      <div className="dashboard-mobile-widget-item">
                        <span className="dashboard-mobile-widget-label">Tempo Pieno</span>
                        <div className="dashboard-mobile-widget-value">{datiCCNL.reduce((sum, c) => sum + c.tempoPieno, 0)}</div>
                      </div>
                      <div className="dashboard-mobile-widget-item">
                        <span className="dashboard-mobile-widget-label">Tempo Parziale</span>
                        <div className="dashboard-mobile-widget-value">{datiCCNL.reduce((sum, c) => sum + c.tempoParziale, 0)}</div>
                      </div>
                      <div className="dashboard-mobile-widget-item">
                        <span className="dashboard-mobile-widget-label">Tempo Determinato</span>
                        <div className="dashboard-mobile-widget-value">{datiCCNL.reduce((sum, c) => sum + c.tempoDeterminato, 0)}</div>
                      </div>
                      <div className="dashboard-mobile-widget-item">
                        <span className="dashboard-mobile-widget-label">Tempo Indeterminato</span>
                        <div className="dashboard-mobile-widget-value">{datiCCNL.reduce((sum, c) => sum + c.tempoIndeterminato, 0)}</div>
                      </div>
                      <div className="dashboard-mobile-widget-item">
                        <span className="dashboard-mobile-widget-label">orario distribuito su 5 gg./sett.</span>
                        <div className="dashboard-mobile-widget-value">{datiCCNL.reduce((sum, c) => sum + c.giorni5, 0)}</div>
                      </div>
                      <div className="dashboard-mobile-widget-item">
                        <span className="dashboard-mobile-widget-label">orario distribuito su 6 gg./sett.</span>
                        <div className="dashboard-mobile-widget-value">{datiCCNL.reduce((sum, c) => sum + c.giorni6, 0)}</div>
                      </div>
                    </div>
                  </div>
                  {datiCCNL.length > 0 && (
                    <div className="dashboard-mobile-widget dashboard-mobile-widget-full">
                      <h3 className="dashboard-mobile-widget-title">Composizione CCNL</h3>
                      <div className="dashboard-pie-chart-container">
                        {renderPieChart(datiCCNL)}
                      </div>
                    </div>
                  )}
                </div> 
              ) : (
                <div className="dashboard-table-wrapper">
                  <div className="dashboard-table-container">
                    <table className="dashboard-table">
                      <colgroup>
                        <col span="1" />
                        <col span="1" />
                        <col span="1" />
                        <col span="1" />
                        <col span="1" />
                        <col span="1" />
                        <col span="1" />
                        <col span="1" />
                      </colgroup>
                      <thead>
                        <tr className="dashboard-table-header">
                          <th>CCNL</th>
                          <th>unità</th>
                          <th>TP</th>
                          <th>PT</th>
                          <th>T. Det.</th>
                          <th>T. Indet.</th>
                          <th>5 gg.</th>
                          <th>6 gg.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {datiCCNL.map((ccnl) => (
                          <tr key={ccnl.sigla} className="dashboard-table-row">
                            <td><strong>{ccnl.sigla}</strong></td>
                            <td>{ccnl.totale}</td>
                            <td>{ccnl.tempoPieno}</td>
                            <td>{ccnl.tempoParziale}</td>
                            <td>{ccnl.tempoDeterminato}</td>
                            <td>{ccnl.tempoIndeterminato}</td>
                            <td>{ccnl.giorni5}</td>
                            <td>{ccnl.giorni6}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="dashboard-table-footer">
                          <td>Totali</td>
                          <td>{datiCCNL.reduce((sum, c) => sum + c.totale, 0)}</td>
                          <td>{datiCCNL.reduce((sum, c) => sum + c.tempoPieno, 0)}</td>
                          <td>{datiCCNL.reduce((sum, c) => sum + c.tempoParziale, 0)}</td>
                          <td>{datiCCNL.reduce((sum, c) => sum + c.tempoDeterminato, 0)}</td>
                          <td>{datiCCNL.reduce((sum, c) => sum + c.tempoIndeterminato, 0)}</td>
                          <td>{datiCCNL.reduce((sum, c) => sum + c.giorni5, 0)}</td>
                          <td>{datiCCNL.reduce((sum, c) => sum + c.giorni6, 0)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div className="dashboard-pie-chart-render-table">
                    {renderPieChart(datiCCNL)}
                  </div>
                </div>
              )}

              {/* Sezione Donut Chart: distribuzione dipendenti per gg settimanali e contratto */}
              {dipendentiAttivi.length > 0 && (
                <div className="dashboard-donut-section">
                  <h2 className="dashboard-donut-title-section">GG. Lavorati <br/>(aggrega valori medi per tipologia) </h2>
                  <div className="dashboard-donut-container">
                    {/* Gruppo 1: Tempo Pieno */}
                    <DonutCard
                      titolo ="Tempo pieno - 5 gg."
                      valore={conta5ft}
                      totale={totale}
                      colore="#10b981"
                    />
                    <DonutCard
                      titolo="Tempo pieno - 6 gg."
                      valore={conta6ft}
                      totale={totale}
                      colore="#3b82f6"
                    />
                    {/* Gruppo 2: Part-time */}
                    <DonutCard
                      titolo="Part-time - 5 gg."
                      valore={conta5pt}
                      totale={totale}
                      colore="#f59e0b"
                    />
                    <DonutCard
                      titolo="Part-time - 6 gg."
                      valore={conta6pt}
                      totale={totale}
                      colore="#ef4444"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="dashboard-empty-message">
              Nessun dipendente attivo nel periodo selezionato
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default AdminDashboard