import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { useLocation } from 'react-router-dom'
import Logo from './Logo'

/**
 * AdminNavbar - Navbar desktop fissa per l'area admin
 * A sinistra: Home, al centro: voci menu, a destra: utente + logout
 */
function AdminNavbar() {
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

  // Determina se siamo nella pagina Dashboard
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

      {/* Destra - Utente + Logout */}
      <div className="navbar-right">
        <div className="user-info">
          <span className="user-name">Benvenuto, {user?.name || 'Utente'}</span>
          <div className="avatar" title={user?.name || 'Utente'}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <button
            onClick={handleLogout}
            className="admin-navbar-logout"
          >Logout
          </button>
        </div>
      </div>
    </nav> 
  )
}

export default AdminNavbar