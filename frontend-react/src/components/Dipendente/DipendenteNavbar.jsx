import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import Logo from '../Admin/Logo'
import Avatar from '../Avatar'
import QrCodeInfoModal from './QrCodeInfoModal'
import ComunicazioniModal from './ComunicazioniModal'
import { getComunicazioniPresenza } from '../../services/presenzeService'

/**
 * DipendenteNavbar - Navbar desktop fissa per l'area dipendente
 * A sinistra: Logo/Home, al centro: voci menu (Dashboard, Foglio Presenze, QR Code), a destra: utente + logout
 */
function DipendenteNavbar({ isDarkMode, onToggleChange }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showQrInfoModal, setShowQrInfoModal] = useState(false)
  const [showComunicazioniModal, setShowComunicazioniModal] = useState(false)
  const [comunicazioniNonLette, setComunicazioniNonLette] = useState(0)

  useEffect(() => {
    getComunicazioniPresenza()
      .then((response) => {
        setComunicazioniNonLette(response.data.filter((item) => !item.letto_at).length)
      })
      .catch(() => setComunicazioniNonLette(0))
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // Determina quale link è attivo in base alla location attuale
  const isActive = (path) => {
    if (path === '/dipendente') {
      return location.pathname === '/dipendente'
    }
    return location.pathname.startsWith(path)
  }

  // Determina se siamo nella pagina Dashboard
  const isDashboard = location.pathname === '/dipendente'

  return (
    <>
      <nav className="dipendente-navbar">
        {/* Logo / Home */}
        <Link to="/dipendente" className="logo">
          <Logo className="logo-icon" />
          HR-Tech ERP
        </Link>

        {/* Centro - Voci Menu */}
        <ul className="nav-links">
          {/* Dashboard è nascosta quando si è già sulla Dashboard per evitare ridondanza con il logo */}
          {!isDashboard && (
            <li>
              <Link to="/dipendente" className={isActive('/dipendente') ? 'active' : ''}>
                Dashboard
              </Link>
            </li>
          )}
          <li>
            <button
              type="button"
              className="dipendente-notifications-button"
              onClick={() => setShowComunicazioniModal(true)}
            >
              Comunicazioni
              {comunicazioniNonLette > 0 && (
                <span className="dipendente-notifications-badge">{comunicazioniNonLette}</span>
              )}
            </button>
          </li>
          <li>
            <Link to="/dipendente/timesheet" className={isActive('/dipendente/timesheet') ? 'active' : ''}>
              Foglio Presenze
            </Link>
          </li>
          <li>
            <button
              onClick={() => setShowQrInfoModal(true)}
              style={{
                background: 'none',
                border: '1px solid var(--text)',
                cursor: 'pointer',
                color: 'var(--text)',
                fontSize: '0.875rem',
                padding: '4px 8px',
                textDecoration: 'none',
                transition: 'color 0.3s, border-color 0.3s',
                position: 'relative',
              }}
              onMouseOver={(e) => { e.target.style.color = '#39ff14'; e.target.style.borderColor = '#39ff14' }}
              onMouseOut={(e) => { e.target.style.color = 'var(--text)'; e.target.style.borderColor = 'var(--text)' }}
            >
              Come usi il QR Code?
            </button>
          </li>
        </ul>

        {/* Destra - Utente + Toggle + Logout */}
        <div className="user-info">
          <span className="user-name">Benvenuto, {user?.name || 'Utente'}</span>
          <Avatar name={user?.name} url={user?.avatar_url} className="avatar" />
          {/* 🔹 TOGGLE SWITCH DESKTOP */}
          <label className="theme-switch" htmlFor="checkbox-navbar">
            <input 
              type="checkbox" 
              id="checkbox-navbar" 
              checked={isDarkMode}
              onChange={onToggleChange}
            />
            <div className="slider round">
              <i className="fas fa-sun"></i>
              <i className="fas fa-moon"></i>
            </div>
          </label>
            <button
              onClick={handleLogout}
              className="dipendente-navbar-logout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
              </svg>
            </button>
        </div>
      </nav>

      {/* 🔹 Modale QR Code Info */}
      {showQrInfoModal && (
        <QrCodeInfoModal
          onClose={() => setShowQrInfoModal(false)}
        />
      )}
      {showComunicazioniModal && (
        <ComunicazioniModal
          onClose={() => {
            setShowComunicazioniModal(false)
            setComunicazioniNonLette(0)
          }}
        />
      )}
    </>
  )
}

export default DipendenteNavbar
