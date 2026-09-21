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
                { name: 'Lavorati', value: valore },
                { name: 'Rimanenti', value: Math.max(0, totale - valore) }
              ]}
              cx="50%" cy="50%" innerRadius={30} outerRadius={40}
              fill="#8884d8" dataKey="value" labelLine={false} isAnimationActive={false}
              stroke="var(--donut-stroke)"
              strokeWidth={1}
            >
              {[
                { name: 'Lavorati', fill: colore },
                { name: 'Rimanenti', fill: 'var(--card-bg)' }
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
        }}>
          <div>{valore} gg</div>
          <div style={{ fontSize: '0.6rem', opacity: 0.8 }}>{percent.toFixed(0)}%</div>
        </div>
      </div>
    </div>
  )
}

function AdminDashboard() {
  const [dipendenti, setDipendenti] = useState([])
  const [initialLoading, setInitialLoading] = useState(true) // Caricamento solo al primo avvio
  const [isRefreshing, setIsRefreshing] = useState(false)   // Aggiornamento in background
  const [error, setError] = useState(null)
  const [meseSelezionato, setMeseSelezionato] = useState(new Date().getMonth() + 1)
  const [annoSelezionato, setAnnoSelezionato] = useState(new Date().getFullYear())
  const [isMobile, setIsMobile] = useState(false)

  const NOMI_MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // CHIAMATA API: Passa mese e anno selezionati e si riattiva ad ogni cambio di filtro SENZA smontare l'interfaccia
  useEffect(() => {
    const fetchDipendenti = async () => {
      try {
        setIsRefreshing(true)
        const response = await api.get('/dipendenti', {
          params: {
            mese: meseSelezionato,
            anno: annoSelezionato
          }
        })
        setDipendenti(response.data)
        setError(null)
      } catch (err) {
        setError('Errore nel recupero dei dati dei dipendenti')
        console.error('Error fetching dipendenti:', err)
      } finally {
        setInitialLoading(false)
        setIsRefreshing(false)
      }
    }

    fetchDipendenti()
  }, [meseSelezionato, annoSelezionato])

  // Calcolo dei giorni teorici lavorabili nel mese selezionato
  const calcolaGiorniTeoriciMese = (mese, anno, giorniSettimanali) => {
    const giorniNelMese = new Date(anno, mese, 0).getDate()
    let lavorabili = 0
    for (let giorno = 1; giorno <= giorniNelMese; giorno++) {
      const dayOfWeek = new Date(anno, mese - 1, giorno).getDay() // 0 = Dom, 6 = Sab
      if (giorniSettimanali === 5) {
        if (dayOfWeek !== 0 && dayOfWeek !== 6) lavorabili++
      } else {
        if (dayOfWeek !== 0) lavorabili++
      }
    }
    return lavorabili
  }

  const maxTeorici5gg = calcolaGiorniTeoriciMese(meseSelezionato, annoSelezionato, 5)
  const maxTeorici6gg = calcolaGiorniTeoriciMese(meseSelezionato, annoSelezionato, 6)

  const getAnnoMinimoAssunzione = () => {
    if (dipendenti.length === 0) return new Date().getFullYear()
    const anniAssunzione = dipendenti
      .filter(d => d.data_assunzione)
      .map(d => new Date(d.data_assunzione).getFullYear())
    return anniAssunzione.length > 0 ? Math.min(...anniAssunzione) : new Date().getFullYear()
  }

  const dipendenteAttivoInPeriodo = (dipendente, mese, anno) => {
    const tipoContratto = dipendente.tipo_contratto || 'indeterminato'
    const dataScadenza = dipendente.data_scadenza_contratto
    const dataAssunzione = dipendente.data_assunzione

    const inizioMeseSelezionato = new Date(anno, mese - 1, 1)
    const fineMeseSelezionato = new Date(anno, mese, 0)

    if (dataAssunzione) {
      const assunzioneDate = new Date(dataAssunzione)
      if (assunzioneDate > fineMeseSelezionato) return false
    }

    if (tipoContratto === 'determinato' && dataScadenza) {
      const scadenzaDate = new Date(dataScadenza)
      if (inizioMeseSelezionato > scadenzaDate) return false
    }

    return true
  }

  const dipendentiAttivi = dipendenti.filter(d => dipendenteAttivoInPeriodo(d, meseSelezionato, annoSelezionato))

  // CALCOLO MEDIA GIORNI LAVORATI PER I 4 GRUPPI
  const datiGruppi = {
    ft5: { sommaGiorni: 0, conteggio: 0, maxTeorici: maxTeorici5gg },
    ft6: { sommaGiorni: 0, conteggio: 0, maxTeorici: maxTeorici6gg },
    pt5: { sommaGiorni: 0, conteggio: 0, maxTeorici: maxTeorici5gg },
    pt6: { sommaGiorni: 0, conteggio: 0, maxTeorici: maxTeorici6gg }
  }

  dipendentiAttivi.forEach(d => {
    const ggSett = d.giorni_lavorativi_settimanali || 5
    const isFT = (d.percentuale_part_time ?? 100) >= 100
    const giorniLavorati = Number(d.giorni_lavorati ?? d.giorniLavorati ?? 0)

    let gruppoKey = ''
    if (ggSett === 5) {
      gruppoKey = isFT ? 'ft5' : 'pt5'
    } else if (ggSett === 6) {
      gruppoKey = isFT ? 'ft6' : 'pt6'
    }

    if (gruppoKey) {
      datiGruppi[gruppoKey].sommaGiorni += giorniLavorati
      datiGruppi[gruppoKey].conteggio += 1
    }
  })

  const media5ft = datiGruppi.ft5.conteggio > 0 ? Number((datiGruppi.ft5.sommaGiorni / datiGruppi.ft5.conteggio).toFixed(1)) : 0
  const media6ft = datiGruppi.ft6.conteggio > 0 ? Number((datiGruppi.ft6.sommaGiorni / datiGruppi.ft6.conteggio).toFixed(1)) : 0
  const media5pt = datiGruppi.pt5.conteggio > 0 ? Number((datiGruppi.pt5.sommaGiorni / datiGruppi.pt5.conteggio).toFixed(1)) : 0
  const media6pt = datiGruppi.pt6.conteggio > 0 ? Number((datiGruppi.pt6.sommaGiorni / datiGruppi.pt6.conteggio).toFixed(1)) : 0

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
      <div className="dashboard-header"></div>

      {initialLoading ? (
        <p className="dashboard-loading">Caricamento dati dipendenti...</p>
      ) : error ? (
        <p className="dashboard-error">{error}</p>
      ) : (
        <div
          className="dashboard-main"
          style={{
            opacity: isRefreshing ? 0.7 : 1,
            transition: 'opacity 0.2s ease-in-out'
          }}
        >
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
                      <h3 className="dashboard-mobile-widget-title">Dipendenti per CCNL applicato</h3>
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

              {/* Sezione Donut Chart */}
              {dipendentiAttivi.length > 0 && (
                <div className="dashboard-donut-section">
                  <h2 className="dashboard-donut-title-section">
                    Media GG. Lavorati Mensili ({NOMI_MESI[meseSelezionato - 1]} {annoSelezionato})
                  </h2>
                  <div className="dashboard-donut-container">
                    <DonutCard
                      titolo="Tempo pieno - 5 gg."
                      valore={media5ft}
                      totale={datiGruppi.ft5.maxTeorici}
                      colore="#10b981"
                    />
                    <DonutCard
                      titolo="Tempo pieno - 6 gg."
                      valore={media6ft}
                      totale={datiGruppi.ft6.maxTeorici}
                      colore="#3b82f6"
                    />
                    <DonutCard
                      titolo="Part-time - 5 gg."
                      valore={media5pt}
                      totale={datiGruppi.pt5.maxTeorici}
                      colore="#f59e0b"
                    />
                    <DonutCard
                      titolo="Part-time - 6 gg."
                      valore={media6pt}
                      totale={datiGruppi.pt6.maxTeorici}
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