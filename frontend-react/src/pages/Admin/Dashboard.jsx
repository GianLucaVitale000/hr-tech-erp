import { useState, useEffect } from 'react'
import { useAuth } from '../../context/useAuth'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [dipendenti, setDipendenti] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [meseSelezionato, setMeseSelezionato] = useState(new Date().getMonth() + 1)
  const [annoSelezionato, setAnnoSelezionato] = useState(new Date().getFullYear())
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
    const chartRadius = 80
    const labelRadius = 90
    const svgSize = 280
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

  const handleLogout = async () => {
    await api.post('/logout')
    logout()
    navigate('/login')
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: '0 0 1rem 0', lineHeight: '1.2' }}>Dashboard di Amministrazione</h1>
          <p style={{ margin: '0 0 0.5rem 0' }}>Benvenuto, <strong>{user?.name}</strong></p>
          <p style={{ margin: 0 }}>Ruolo: <strong>{user?.role}</strong></p>
        </div>
        {!isMobile && (
          <button onClick={handleLogout} style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Logout
          </button>
        )}
      </div>

      {isMobile && (
        <>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              position: 'fixed',
              top: '1rem',
              right: '1rem',
              zIndex: 1001,
              padding: '0.5rem',
              backgroundColor: '#374151',
              color: '#f3f4f6',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1.5rem',
              fontWeight: 'bold'
            }}
          >
            ☰
          </button>
          
          {sidebarOpen && (
            <div
              onClick={() => setSidebarOpen(false)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                zIndex: 1000
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '70%',
                  maxWidth: '300px',
                  height: '100%',
                  backgroundColor: '#374151',
                  zIndex: 1001,
                  padding: '2rem 1rem',
                  boxShadow: '2px 0 8px rgba(0,0,0,0.1)'
                }}
              >
                <button
                  onClick={() => setSidebarOpen(false)}
                  style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: '#f3f4f6'
                  }}
                >
                  ×
                </button>
                
                <nav style={{ marginTop: '3rem', height: 'calc(100% - 4rem)', display: 'flex', flexDirection: 'column' }}>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
                    <li style={{ marginBottom: '1rem' }}>
                      <button
                        onClick={() => { navigate('/admin/utenti'); setSidebarOpen(false); }}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'none',
                          border: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '1rem',
                          color: '#f3f4f6',
                          lineHeight: '1.2'
                        }}
                      >
                        Gestione Utenti
                      </button>
                    </li>
                    <li style={{ marginBottom: '1rem' }}>
                      <button
                        onClick={() => { navigate('/admin/dipendenti'); setSidebarOpen(false); }}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'none',
                          border: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '1rem',
                          color: '#f3f4f6',
                          lineHeight: '1.2'
                        }}
                      >
                        Anagrafica Dipendenti
                      </button>
                    </li>
                    <li style={{ marginBottom: '1rem' }}>
                      <button
                        onClick={() => { navigate('/admin/contratti'); setSidebarOpen(false); }}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'none',
                          border: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '1rem',
                          color: '#f3f4f6',
                          lineHeight: '1.2'
                        }}
                      >
                        Gestione CCNL
                      </button>
                    </li>
                    <li style={{ marginBottom: '1rem' }}>
                      <button
                        onClick={() => { navigate('/admin/approvazioni'); setSidebarOpen(false); }}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'none',
                          border: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '1rem',
                          color: '#f3f4f6',
                          lineHeight: '1.2'
                        }}
                      >
                        Approvazione Fogli Ore
                      </button>
                    </li>
                    <li style={{ marginBottom: '1rem' }}>
                      <button
                        onClick={() => { navigate('/admin/analisi-hr'); setSidebarOpen(false); }}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'none',
                          border: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '1rem',
                          color: '#f3f4f6',
                          lineHeight: '1.2'
                        }}
                      >
                        Analisi HR
                      </button>
                    </li>
                  </ul>
                  <button
                    onClick={handleLogout}
                    style={{
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      padding: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      color: 'white',
                      fontSize: '1rem',
                      marginLeft: 'auto',
                      marginTop: 'auto',
                      marginBottom: '2rem'
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          )}
        </>
      )}

      <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '2rem' }}>
        {!isMobile && (
          <nav style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => navigate('/admin/utenti')}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '4px 4px 0 0',
                cursor: 'pointer',
                fontWeight: '500',
                borderBottom: '3px solid transparent'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#374151';
                e.currentTarget.style.color = 'white';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.color = '#374151';
              }}
            >
              Gestione Utenti
            </button>
            <button
              onClick={() => navigate('/admin/dipendenti')}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '4px 4px 0 0',
                cursor: 'pointer',
                fontWeight: '500',
                borderBottom: '3px solid transparent'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#374151';
                e.currentTarget.style.color = 'white';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.color = '#374151';
              }}
            >
              Anagrafica Dipendenti
            </button>
            <button
              onClick={() => navigate('/admin/contratti')}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '4px 4px 0 0',
                cursor: 'pointer',
                fontWeight: '500',
                borderBottom: '3px solid transparent'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#374151';
                e.currentTarget.style.color = 'white';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.color = '#374151';
              }}
            >
              Gestione CCNL
            </button>
            <button
              onClick={() => navigate('/admin/approvazioni')}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '4px 4px 0 0',
                cursor: 'pointer',
                fontWeight: '500',
                borderBottom: '3px solid transparent'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#374151';
                e.currentTarget.style.color = 'white';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.color = '#374151';
              }}
            >
              Approvazione Fogli Ore
            </button>
            <button
              onClick={() => navigate('/admin/analisi-hr')}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '4px 4px 0 0',
                cursor: 'pointer',
                fontWeight: '500',
                borderBottom: '3px solid transparent'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#374151';
                e.currentTarget.style.color = 'white';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.color = '#374151';
              }}
            >
              Analisi HR
            </button>
          </nav>
        )}
      </div>

      <p style={{ color: 'white', fontSize: '0.85rem', marginBottom: '2rem' }}>
        {isMobile ? 'Apri il menu laterale premendo ☰' : 'Seleziona una sezione dal menu sopra'} per gestire contratti, dipendenti, approvare i fogli presenze o visualizzare le analisi HR.
      </p>

      {loading ? (
        <p style={{ color: 'white' }}>Caricamento dati dipendenti...</p>
      ) : error ? (
        <p style={{ color: '#ef4444' }}>{error}</p>
      ) : (
        <div style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ color: 'white', margin: 0, fontSize: '1.25rem' }}>
              Riepilogo Dipendenti
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select
                value={meseSelezionato}
                onChange={(e) => setMeseSelezionato(parseInt(e.target.value))}
                style={{ padding: '0.5rem', borderRadius: '4px', backgroundColor: 'white', color: 'black' }}
              >
                {NOMI_MESI.map((nome, i) => (
                  <option key={i + 1} value={i + 1}>{nome}</option>
                ))}
              </select>
              <select
                value={annoSelezionato}
                onChange={(e) => setAnnoSelezionato(parseInt(e.target.value))}
                style={{ padding: '0.5rem', borderRadius: '4px', backgroundColor: 'white', color: 'black' }}
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const y = new Date().getFullYear() - 2 + i
                  return <option key={y} value={y}>{y}</option>
                })}
              </select>
            </div>
          </div>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Dati riferiti a {NOMI_MESI[meseSelezionato - 1]} {annoSelezionato}
          </p>
          
          {datiCCNL.length > 0 ? (
            <>
              {isMobile ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '1rem',
                  marginTop: '1rem'
                }}>
                  {datiCCNL.map((ccnl) => (
                    <div key={ccnl.sigla} style={mobileWidgetStyle}>
                      <h3 style={mobileWidgetTitleStyle}>{ccnl.sigla}</h3>
                      <div style={mobileWidgetGrid}>
                        <div style={mobileWidgetItem}>
                          <span style={mobileWidgetLabel}>TP</span>
                          <div style={mobileWidgetValue}>{ccnl.tempoPieno}</div>
                        </div>
                        <div style={mobileWidgetItem}>
                          <span style={mobileWidgetLabel}>PT</span>
                          <div style={mobileWidgetValue}>{ccnl.tempoParziale}</div>
                        </div>
                        <div style={mobileWidgetItem}>
                          <span style={mobileWidgetLabel}>Det.</span>
                          <div style={mobileWidgetValue}>{ccnl.tempoDeterminato}</div>
                        </div>
                        <div style={mobileWidgetItem}>
                          <span style={mobileWidgetLabel}>Indet.</span>
                          <div style={mobileWidgetValue}>{ccnl.tempoIndeterminato}</div>
                        </div>
                        <div style={mobileWidgetItem}>
                          <span style={mobileWidgetLabel}>5g</span>
                          <div style={mobileWidgetValue}>{ccnl.giorni5}</div>
                        </div>
                        <div style={mobileWidgetItem}>
                          <span style={mobileWidgetLabel}>6g</span>
                          <div style={mobileWidgetValue}>{ccnl.giorni6}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div style={{...mobileWidgetStyle, gridColumn: '1 / -1'}}>
                    <h3 style={mobileWidgetTitleStyle}>TOTALE = {datiCCNL.reduce((sum, c) => sum + c.totale, 0)}</h3>
                    <div style={{...mobileWidgetGrid, gridTemplateColumns: 'repeat(3, 1fr)'}}>
                      <div style={mobileWidgetItem}>
                        <span style={mobileWidgetLabel}>TP</span>
                        <div style={mobileWidgetValue}>{datiCCNL.reduce((sum, c) => sum + c.tempoPieno, 0)}</div>
                      </div>
                      <div style={mobileWidgetItem}>
                        <span style={mobileWidgetLabel}>PT</span>
                        <div style={mobileWidgetValue}>{datiCCNL.reduce((sum, c) => sum + c.tempoParziale, 0)}</div>
                      </div>
                      <div style={mobileWidgetItem}>
                        <span style={mobileWidgetLabel}>Det.</span>
                        <div style={mobileWidgetValue}>{datiCCNL.reduce((sum, c) => sum + c.tempoDeterminato, 0)}</div>
                      </div>
                      <div style={mobileWidgetItem}>
                        <span style={mobileWidgetLabel}>Indet.</span>
                        <div style={mobileWidgetValue}>{datiCCNL.reduce((sum, c) => sum + c.tempoIndeterminato, 0)}</div>
                      </div>
                      <div style={mobileWidgetItem}>
                        <span style={mobileWidgetLabel}>5g</span>
                        <div style={mobileWidgetValue}>{datiCCNL.reduce((sum, c) => sum + c.giorni5, 0)}</div>
                      </div>
                      <div style={mobileWidgetItem}>
                        <span style={mobileWidgetLabel}>6g</span>
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
                        <th style={tableHeaderStyle}>Tempo Pieno</th>
                        <th style={tableHeaderStyle}>Tempo Parziale</th>
                        <th style={tableHeaderStyle}>Tempo Det.</th>
                        <th style={tableHeaderStyle}>Tempo Indet.</th>
                        <th style={tableHeaderStyle}>5 gg.</th>
                        <th style={tableHeaderStyle}>6 gg.</th>
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
  padding: '0.75rem 1rem',
  textAlign: 'center',
  fontWeight: '600',
  color: '#374151',
  fontSize: '0.875rem',
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