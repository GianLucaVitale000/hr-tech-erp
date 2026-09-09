import { useState, useEffect } from 'react'
import api from '../../services/api'


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
    const fineMeseSelezionato = new Date(anno, mese, 0) // Ultimo giorno del mese
    
    // 1. Controlla se il dipendente era già assunto alla fine del mese
    if (dataAssunzione) {
      const assunzioneDate = new Date(dataAssunzione)
      // Deve essere stato assunto prima o durante il mese selezionato
      if (assunzioneDate > fineMeseSelezionato) {
        return false  // Non era ancora assunto nel periodo
      }
    }
    
    // 2. Controlla scadenza del contratto (per determinato)
    if (tipoContratto === 'determinato' && dataScadenza) {
      const scadenzaDate = new Date(dataScadenza)
      if (inizioMeseSelezionato > scadenzaDate) {
        return false  // Contratto scaduto prima del mese
      }
    }
    
    // 3. Se passa tutti i controlli, è attivo
    return true
  }

  // Filtra i dipendenti attivi nel periodo selezionato
  const dipendentiAttivi = dipendenti.filter(d => dipendenteAttivoInPeriodo(d, meseSelezionato, annoSelezionato))

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
    
    // Ordina per valore decrescente in modo che le label più grandi siano posizionate prima
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
      
      // Converti angoli a radianti
      const startRad = (startAngle - 90) * Math.PI / 180
      const endRad = (endAngle - 90) * Math.PI / 180
      
      // Calcola coordinate per lo spicchio
      const x1 = centerX + chartRadius * Math.cos(startRad)
      const y1 = centerY + chartRadius * Math.sin(startRad)
      const x2 = centerX + chartRadius * Math.cos(endRad)
      const y2 = centerY + chartRadius * Math.sin(endRad)
      
      // Flag per arc grande (> 180 gradi)
      const largeArcFlag = angle > 180 ? 1 : 0
      
      // Punto medio dello spicchio
      const midAngle = startAngle + (angle / 2)
      const midRad = (midAngle - 90) * Math.PI / 180
      
      // Posizione per il label (all'esterno)
      const labelX = centerX + labelRadius * Math.cos(midRad)
      const labelY = centerY + labelRadius * Math.sin(midRad)
      
      const color = colors[index % colors.length]
      
      // Spicchio del pie chart
      elements.push(
        <path
          key={`slice-${ccnl.sigla}`}
          d={`M ${centerX} ${centerY} L ${x1} ${y1} A ${chartRadius} ${chartRadius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
          fill={color}
          stroke="#1f2937"
          strokeWidth="1"
        />
      )
      
      // Label esterno con colore dello spicchio
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
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        
      </div>


      {loading ? (
        <p style={{ color: 'white' }}>Caricamento dati dipendenti...</p>
      ) : error ? (
        <p style={{ color: '#ef4444' }}>{error}</p>
      ) : (
        <div style={{ marginTop: '2rem' }}>
            <h1 style={{ color: 'white', marginBottom: '2rem', fontSize: '2rem' }}>
              Dashboard di Amministrazione
      </h1>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ color: 'white', margin: 0, fontSize: '1.25rem' }}>
              Riepilogo Dipendenti
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select
                value={meseSelezionato}
                onChange={(e) => setMeseSelezionato(parseInt(e.target.value))}
                style={{ padding: '0.5rem', borderRadius: '4px', backgroundColor: '#374151', color: 'white' }}
              >
                {NOMI_MESI.map((nome, i) => (
                  <option key={i + 1} value={i + 1}>{nome}</option>
                ))}
              </select>
              <select
                value={annoSelezionato}
                onChange={(e) => setAnnoSelezionato(parseInt(e.target.value))}
                style={{ padding: '0.5rem', borderRadius: '4px', backgroundColor: '#374151', color: 'white' }}
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
            <>
              {isMobile ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  marginTop: '1rem'
                }}>
                  {datiCCNL.map((ccnl) => (
                    <div key={ccnl.sigla} style={mobileWidgetStyle}>
                      <h3 style={mobileWidgetTitleStyle}>{ccnl.sigla}</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0', borderBottom: '1px solid #4b5563' }}>
                          <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Tempo Pieno:</span>
                          <span style={{ color: 'white', fontSize: '1rem', fontWeight: '600' }}>{ccnl.tempoPieno}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0', borderBottom: '1px solid #4b5563' }}>
                          <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Tempo Parziale:</span>
                          <span style={{ color: 'white', fontSize: '1rem', fontWeight: '600' }}>{ccnl.tempoParziale}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0', borderBottom: '1px solid #4b5563' }}>
                          <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Tempo Determinato:</span>
                          <span style={{ color: 'white', fontSize: '1rem', fontWeight: '600' }}>{ccnl.tempoDeterminato}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0', borderBottom: '1px solid #4b5563' }}>
                          <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Tempo Indeterminato:</span>
                          <span style={{ color: 'white', fontSize: '1rem', fontWeight: '600' }}>{ccnl.tempoIndeterminato}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0', borderBottom: '1px solid #4b5563' }}>
                          <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>orario sett. su 5 giorni:</span>
                          <span style={{ color: 'white', fontSize: '1rem', fontWeight: '600' }}>{ccnl.giorni5}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0' }}>
                          <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>orario sett. su 6 giorni:</span>
                          <span style={{ color: 'white', fontSize: '1rem', fontWeight: '600' }}>{ccnl.giorni6}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div style={{...mobileWidgetStyle, gridColumn: '1 / -1'}}>
                    <h3 style={mobileWidgetTitleStyle}>TOTALE = {datiCCNL.reduce((sum, c) => sum + c.totale, 0)}</h3>
                    <div style={{...mobileWidgetGrid, gridTemplateColumns: 'repeat(3, 1fr)'}}>
                      <div style={mobileWidgetItem}>
                        <span style={mobileWidgetLabel}>Tempo Pieno</span>
                        <div style={mobileWidgetValue}>{datiCCNL.reduce((sum, c) => sum + c.tempoPieno, 0)}</div>
                      </div>
                      <div style={mobileWidgetItem}>
                        <span style={mobileWidgetLabel}>Part-Time</span>
                        <div style={mobileWidgetValue}>{datiCCNL.reduce((sum, c) => sum + c.tempoParziale, 0)}</div>
                      </div>
                      <div style={mobileWidgetItem}>
                        <span style={mobileWidgetLabel}>Tempo Determinato</span>
                        <div style={mobileWidgetValue}>{datiCCNL.reduce((sum, c) => sum + c.tempoDeterminato, 0)}</div>
                      </div>
                      <div style={mobileWidgetItem}>
                        <span style={mobileWidgetLabel}>Tempo Indeterminato</span>
                        <div style={mobileWidgetValue}>{datiCCNL.reduce((sum, c) => sum + c.tempoIndeterminato, 0)}</div>
                      </div>
                      <div style={mobileWidgetItem}>
                        <span style={mobileWidgetLabel}>orario settimanale su 5 giorni</span>
                        <div style={mobileWidgetValue}>{datiCCNL.reduce((sum, c) => sum + c.giorni5, 0)}</div>
                      </div>
                      <div style={mobileWidgetItem}>
                        <span style={mobileWidgetLabel}>orario settimanale su 6 giorni</span>
                        <div style={mobileWidgetValue}>{datiCCNL.reduce((sum, c) => sum + c.giorni6, 0)}</div>
                      </div>
                    </div>
                  </div>
                  {datiCCNL.length > 0 && (
                    <div style={{...mobileWidgetStyle, gridColumn: '1 / -1'}}>
                      <h3 style={mobileWidgetTitleStyle}>Composizione CCNL</h3>
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
                        {renderPieChart(datiCCNL)}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  overflowX: 'auto',
                  borderRadius: '8px',
                }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    minWidth: '800px',
                    tableLayout: 'fixed'
                  }}>
                    <colgroup>
                      <col style={{ width: '120px' }} />
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '80px' }} />
                      <col style={{ width: '80px' }} />
                    </colgroup>
                    <thead>
                      <tr style={{ backgroundColor: '#f3f4f6' }}>
                        <th style={tableHeaderStyle}>Sigla CCNL</th>
                        <th style={tableHeaderStyle}>Dipendenti</th>
                        <th style={tableHeaderStyle}>Full-time</th>
                        <th style={tableHeaderStyle}>Part-time</th>
                        <th style={tableHeaderStyle}>Tempo Determinato</th>
                        <th style={tableHeaderStyle}>Tempo Indeterminato</th>
                        <th style={tableHeaderStyle}>orario su 5 gg.</th>
                        <th style={tableHeaderStyle}>orario su 6 gg.</th> 
                      </tr>
                    </thead>
                    <tbody>
                      {datiCCNL.map((ccnl) => (
                        <tr key={ccnl.sigla} style={{ backgroundColor: '#374151', borderBottom: '1px solid #4b5563' }}>
                          <td style={bodyCellStyle}><strong>{ccnl.sigla}</strong></td>
                          <td style={bodyCellStyle}>{ccnl.totale}</td>
                          <td style={bodyCellStyle}>{ccnl.tempoPieno}</td>
                          <td style={bodyCellStyle}>{ccnl.tempoParziale}</td>
                          <td style={bodyCellStyle}>{ccnl.tempoDeterminato}</td>
                          <td style={bodyCellStyle}>{ccnl.tempoIndeterminato}</td>
                          <td style={bodyCellStyle}>{ccnl.giorni5}</td>
                          <td style={bodyCellStyle}>{ccnl.giorni6}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ backgroundColor: '#1f2937' }}>
                        <td style={footerCellStyle}>Totali</td>
                        <td style={footerCellStyle}>{datiCCNL.reduce((sum, c) => sum + c.totale, 0)}</td>
                        <td style={footerCellStyle}>{datiCCNL.reduce((sum, c) => sum + c.tempoPieno, 0)}</td>
                        <td style={footerCellStyle}>{datiCCNL.reduce((sum, c) => sum + c.tempoParziale, 0)}</td>
                        <td style={footerCellStyle}>{datiCCNL.reduce((sum, c) => sum + c.tempoDeterminato, 0)}</td>
                        <td style={footerCellStyle}>{datiCCNL.reduce((sum, c) => sum + c.tempoIndeterminato, 0)}</td>
                        <td style={footerCellStyle}>{datiCCNL.reduce((sum, c) => sum + c.giorni5, 0)}</td>
                        <td style={footerCellStyle}>{datiCCNL.reduce((sum, c) => sum + c.giorni6, 0)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </>
          ) : (
            <p style={{ color: 'white', fontStyle: 'italic' }}>
              Nessun dipendente attivo nel periodo selezionato
            </p>
          )}
        </div>
      )}
    </div>
  )
}

const tableHeaderStyle = {
  padding: '0.2rem 1rem',
  textAlign: 'center',
  fontWeight: '600',
  color: '#374151',
  fontSize: '0.75rem',
  letterSpacing: '0.05em'
}

const bodyCellStyle = {
  padding: '0.75rem 1rem',
  textAlign: 'center',
  color: 'white',
  fontSize: '0.875rem'
}

const footerCellStyle = {
  padding: '0.75rem 1rem',
  textAlign: 'center',
  color: 'white',
  fontSize: '0.875rem'
}

// Mobile Widget Styles
const mobileWidgetStyle = {
  backgroundColor: '#374151',
  borderRadius: '8px',
  padding: '1rem',
  border: '1px solid #4b5563'
}

const mobileWidgetTitleStyle = {
  color: 'white',
  margin: '0 0 1rem 0',
  fontSize: '1.1rem',
  borderBottom: '1px solid #4b5563',
  paddingBottom: '0.5rem'
}

const mobileWidgetGrid = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.75rem'
}

const mobileWidgetItem = {
  backgroundColor: '#1f2937',
  borderRadius: '4px',
  padding: '0.5rem',
  textAlign: 'center',
  flex: '1 0 calc(50% - 0.375rem)',
  boxSizing: 'border-box',
  minWidth: 'calc(50% - 0.375rem)'
}

const mobileWidgetLabel = {
  display: 'block',
  color: '#9ca3af',
  fontSize: '0.75rem',
  marginBottom: '0.25rem'
}

const mobileWidgetValue = {
  color: 'white',
  fontSize: '1rem',
  fontWeight: '600'
}

export default AdminDashboard