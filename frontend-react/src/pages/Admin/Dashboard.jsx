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
    
    // Se è indeterminato senza data di scadenza, è sempre attivo
    if (tipoContratto === 'indeterminato' && !dataScadenza) {
      return true
    }
    
    // Se c'è una data di scadenza (per determinato o cessazione)
    if (dataScadenza) {
      const scadenzaDate = new Date(dataScadenza)
      // L'inizio del mese selezionato
      const inizioMeseSelezionato = new Date(anno, mese - 1, 1)
      
      // È attivo se l'inizio del mese è <= alla data di scadenza
      return inizioMeseSelezionato <= scadenzaDate
    }
    
    // Default: attivo
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

  const handleLogout = async () => {
    await api.post('/logout')
    logout()
    navigate('/login')
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: '0 0 2rem 0' }}>Dashboard di Amministrazione</h1>
          <p>Benvenuto, <strong>{user?.name}</strong></p>
          <p>Ruolo: <strong>{user?.role}</strong></p>
        </div>
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
      </div>

      <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '2rem' }}>
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
        </nav>
      </div>

      <p style={{ color: 'white', fontSize: '1.125rem', marginBottom: '2rem' }}>
        Benvenuto nella Dashboard di Amministrazione. Seleziona una sezione dal menu sopra per gestire contratti, dipendenti o per approvare i fogli presenze.
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
            <div style={{
              overflowX: 'auto',
              borderRadius: '8px',
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: '800px'
              }}>
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
  textTransform: 'uppercase',
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

export default AdminDashboard