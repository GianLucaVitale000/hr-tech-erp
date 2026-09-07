import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import Logo from './Admin/Logo'
import QrCodeInfoModal from './QrCodeInfoModal'

/**
 * DipendenteNavbar - Navbar desktop fissa per l'area dipendente
 * A sinistra: Logo/Home, al centro: voci menu (Dashboard, Foglio Presenze, QR Code), a destra: utente + logout
 */
function DipendenteNavbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showQrInfoModal, setShowQrInfoModal] = useState(false)

  const handleLogout = () => {
    logout()
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

        {/* Destra - Utente + Logout */}
        <div className="user-info">
          <span className="user-name">Benvenuto, {user?.name || 'Utente'}</span>
          <div className="avatar" title={user?.name || 'Utente'}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500
            }}
          >
            Logout
          </button>
        </div>
      </nav>

      {/* 🔹 Modale QR Code Info */}
      {showQrInfoModal && (
        <QrCodeInfoModal
          onClose={() => setShowQrInfoModal(false)}
        />
      )}
    </>
  )
}

export default DipendenteNavbar
