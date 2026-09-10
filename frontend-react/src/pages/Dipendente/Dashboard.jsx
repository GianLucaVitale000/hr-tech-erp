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
    <div className="dashboard-container">
      <h1 className="page-title">Dashboard Dipendente</h1>

      {/* Riepilogo anagrafica */}
      {loading ? (
        <p className="text-primary">Caricamento dati anagrafici...</p>
      ) : profilo ? (
        <div className="profile-card">
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
              <strong>Giorni Settimanali:</strong> {profilo.giorni_lavorativi_settimanali}
            </div>
          )}
          {profilo.ore_giornaliere && (
            <div>
              <strong>Ore Giornaliere:</strong> {profilo.ore_giornaliere}
            </div>
          )}
        </div>
      ) : (
        <p className="text-primary">Nessun dato anagrafico disponibile.</p>
      )}

      {/* Sidebar Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}>
          <div className="sidebar-panel" onClick={(e) => e.stopPropagation()}>
            <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
              ×
            </button>

            {/* Logo */}
            <div className="sidebar-logo">
              <Logo className="sidebar-logo-icon" />
              <span className="sidebar-brand">HR-Tech ERP</span>
            </div>

            <hr />
            <nav className="sidebar-nav">
              <ul>
                <li>
                  <button
                    onClick={() => { navigate('/dipendente'); setSidebarOpen(false); }}
                  >
                    Dashboard
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => { navigate('/dipendente/timesheet'); setSidebarOpen(false); }}
                  >
                    Foglio Presenze
                  </button>
                </li>
                <hr />
                <li className="sidebar-logout">
                  <button onClick={handleLogout}>
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
    </div>
  )
}

export default DipendenteDashboard
