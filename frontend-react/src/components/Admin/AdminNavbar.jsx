import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import Logo from './Logo'

/**
 * AdminNavbar - Navbar desktop fissa per l'area admin
 * A sinistra: Home, al centro: voci menu, a destra: utente + toggle + logout
 */
function AdminNavbar({ isDarkMode, onToggleChange }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Determina quale link è attivo in base alla location attuale
  const isActive = (path) => {
    if (path === '/admin') {
      return location.pathname === '/admin'
    }
    return location.pathname.startsWith(path)
  }

  // Determiniamo se siamo nella pagina Dashboard
  const isDashboard = location.pathname === '/admin'

  return (
    <nav className="admin-navbar">
      {/* Logo / Home */}
      <div className="navbar-left">
        <Link to="/admin" className="logo">
          <Logo className="logo-icon" />
          HR-Tech ERP
        </Link>
      </div>

      {/* Centro - Voci Menu */}
      <div className="navbar-center">
        <ul className="nav-links">
          {/* Dashboard è nascosta quando si è già sulla Dashboard per evitare ridondanza con il logo */}
          {!isDashboard && (
            <li>
              <Link to="/admin" className={isActive('/admin') ? 'active' : ''}>
                Dashboard
              </Link>
            </li>
          )}
          <li>
            <Link to="/admin/utenti" className={isActive('/admin/utenti') ? 'active' : ''}>
              Gestione Utenti
            </Link>
          </li>
          <li>
            <Link to="/admin/dipendenti" className={isActive('/admin/dipendenti') ? 'active' : ''}>
              Anagrafica Dipendenti
            </Link>
          </li>
          <li>
            <Link to="/admin/contratti" className={isActive('/admin/contratti') ? 'active' : ''}>
              Gestione CCNL
            </Link>
          </li>
          <li>
            <Link to="/admin/approvazioni" className={isActive('/admin/approvazioni') ? 'active' : ''}>
              Approvazione Fogli Ore
            </Link>
          </li>
          <li>
            <Link to="/admin/analisi-hr" className={isActive('/admin/analisi-hr') ? 'active' : ''}>
              Analisi HR
            </Link>
          </li>
        </ul>
      </div>

      {/* Destra - Utente + Toggle + Logout */}
      <div className="navbar-right">
        <div className="user-info">
          <span className="user-name">Benvenuto, {user?.name || 'Utente'}</span>
          <div className="avatar" title={user?.name || 'Utente'}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
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
            className="admin-navbar-logout"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
          </button>
        </div>
      </div>
    </nav>
  )
}

export default AdminNavbar
