import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import Logo from '../../components/Admin/Logo'
import { getMioProfilo } from '../../services/dipendentiService'

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const [yyyy, mm, dd] = dateStr.split('-')
  return `${dd}-${mm}-${yyyy}`
}

function DipendenteDashboard() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { user } = useAuth()
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profilo, setProfilo] = useState(null)
  const [loading, setLoading] = useState(true)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Rileva se è mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Carica il profilo del dipendente loggato
  useEffect(() => {
    getMioProfilo()
      .then((res) => setProfilo(res.data))
      .catch((err) => console.error('Errore caricamento profilo:', err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1 className="page-title" style={{ margin: '0 0 2rem 0' }}>Dashboard Dipendente</h1>

      <style>{`
        .page-title {
          margin: 0;
          font-size: 1.5rem;
          line-height: 1.4;
        }
        @media (max-width: 768px) {
          .page-title {
            font-size: 1.25rem;
            line-height: 1.5;
          }
        }
      `}</style>

      {/* Riepilogo anagrafica */}
      {loading ? (
        <p style={{ color: 'var(--text-h)' }}>Caricamento dati anagrafici...</p>
      ) : profilo ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            textAlign: 'left',
            gap: '0.75rem',
            marginBottom: '2rem',
          }}
        >
          {user?.name && (
            <div>
              <strong>Nome:</strong> {user.name}
            </div>
          )}
          {profilo.codice_fiscale && (
            <div>
              <strong>Codice Fiscale:</strong> {profilo.codice_fiscale}
            </div>
          )}
          {profilo.tipo_contratto && (
            <div>
              <strong>Tipo Contratto:</strong>{' '}
              {profilo.tipo_contratto === 'indeterminato'
                ? 'Indeterminato'
                : 'Determinato'}
            </div>
          )}
          {formatDate(profilo.data_scadenza_contratto) && (
            <div>
              <strong>Scadenza Contratto:</strong> {formatDate(profilo.data_scadenza_contratto)}
            </div>
          )}
          {profilo.percentuale_part_time !== undefined && profilo.percentuale_part_time !== null && (
            <div>
              <strong>Regime Orario:</strong> {Number(profilo.percentuale_part_time) === 100 ? 'Tempo Pieno' : `${profilo.percentuale_part_time}%`}
            </div>
          )}
          {profilo.giorni_lavorativi_settimanali !== undefined && profilo.giorni_lavorativi_settimanali !== null && (
            <div>
              <strong>Giorni Lavorativi Settimanali:</strong> {profilo.giorni_lavorativi_settimanali}
            </div>
          )}
          {profilo.ore_settimanali !== undefined && profilo.ore_settimanali !== null && (
            <div>
              <strong>Ore Settimanali:</strong> {profilo.ore_settimanali}
            </div>
          )}
          {formatDate(profilo.data_assunzione) && (
            <div>
              <strong>Data Assunzione:</strong> {formatDate(profilo.data_assunzione)}
            </div>
          )}
          {profilo.contratto?.codice_cnel && (
            <div>
              <strong>Codice CCNL:</strong> {profilo.contratto.codice_cnel}
            </div>
          )}
          {profilo.contratto?.nome_contratto && (
            <div>
              <strong>Descrizione:</strong> {profilo.contratto.nome_contratto}
            </div>
          )}
          {profilo.mansione && (
            <div>
              <strong>Mansione:</strong> {profilo.mansione}
            </div>
          )}
          {profilo.livello && (
            <div>
              <strong>Livello:</strong> {profilo.livello}
            </div>
          )}
        </div>
      ) : (
        <p style={{ color: 'var(--text-h)' }}>Nessun dato anagrafico disponibile.</p>
      )}

      {/* Mobile hamburger button */}
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

                {/* Logo */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '3.5rem',
                  marginBottom: '1.5rem',
                  padding: '0 0.5rem'
                }}>
                  <Logo style={{ height: '32px', width: 'auto', color: 'var(--accent)' }} />
                  <span style={{ color: 'var(--accent)', fontSize: '1.25rem', fontWeight: 600 }}>HR-Tech ERP</span>
                </div>

                <hr />
                <nav style={{ marginTop: '1rem', height: 'calc(100% - 4rem)', display: 'flex', flexDirection: 'column' }}>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
                    <li style={{ marginBottom: '1rem' }}>
                      <button
                        onClick={() => { navigate('/dipendente'); setSidebarOpen(false); }}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'none',
                          border: 'none',
                          textAlign: 'right',
                          cursor: 'pointer',
                          fontSize: '1rem',
                          color: '#f3f4f6',
                          lineHeight: '1.2'
                        }}
                      >
                        Dashboard
                      </button>
                    </li>
                    <li style={{ marginBottom: '1rem' }}>
                      <button
                        onClick={() => { navigate('/dipendente/timesheet'); setSidebarOpen(false); }}
                        style={{ width: '100%', padding: '0.75rem', background: 'none', border: 'none', textAlign: 'right', cursor: 'pointer', fontSize: '1rem', color: '#f3f4f6', lineHeight: '1.2' }}
                      >
                        Foglio Presenze
                      </button>
                    </li>
                    <hr style={{ marginTop: '2rem' }} />
                    <li style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={handleLogout}
                        style={{
                          padding: '0.75rem',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '1rem',
                          color: '#dc2626',
                          lineHeight: '1.2',
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                        </svg>
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default DipendenteDashboard
