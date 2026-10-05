import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import AdminNavbar from './AdminNavbar'
import AdminFooter from './AdminFooter'
import Logo from './Logo'
import { useAuth } from '../../context/useAuth'

/**
 * AdminLayout - Layout wrapper per l'area admin
 * Mostra la navbar desktop e il footer fissi
 * Il contenuto della pagina viene renderizzato tramite <Outlet />
 * Su mobile mostra un hamburger button che apre un aside laterale con navigazione
 */
function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // --- STATO E LOGICA DEL THEME TOGGLE (CENTRALIZZATA) ---
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      return savedTheme === 'dark'
    }
    return document.documentElement.getAttribute('data-theme') === 'dark'
  })

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.setAttribute('data-theme', 'light')
      localStorage.setItem('theme', 'light')
    }
  }, [isDarkMode])

  const handleToggleChange = (e) => {
    setIsDarkMode(e.target.checked)
  }
  // ---------------------------------------------------------

  const handleLogout = async () => {
    await logout()
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

  return (
    <>
      {/* Passiamo lo stato e la funzione di toggle alla navbar desktop */}
      <AdminNavbar 
        isDarkMode={isDarkMode} 
        onToggleChange={handleToggleChange} 
      />

      {/* Mobile hamburger button */}
      {isMobile && !sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="admin-mobile-hamburger"
        >
          ☰
        </button>
      )}

      {/* Mobile sidebar */}
      {isMobile && sidebarOpen && (
        <div
          className="admin-sidebar-overlay"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="admin-sidebar-panel"
          >
            <button
              onClick={() => setSidebarOpen(false)}
              className="admin-sidebar-close"
            >
              ×
            </button>

            {/* Logo */}
            <div className="admin-sidebar-logo">
              <Logo className="admin-sidebar-logo-icon" />
              <span className="admin-sidebar-brand">HR-Tech ERP</span>
            </div>

            <hr className="admin-sidebar-divider" />

            <nav className="admin-sidebar-nav">
              <ul className="admin-sidebar-nav-list">
                {/* Voce Dashboard: compare solo se NON siamo già sulla dashboard */}
                {location.pathname !== '/admin' && (
                  <li className="admin-sidebar-nav-item">
                    <button
                      onClick={() => { navigate('/admin'); setSidebarOpen(false); }}
                      className="admin-sidebar-nav-button"
                    >
                      Dashboard
                    </button>
                  </li>
                )}
                <li className="admin-sidebar-nav-item">
                  <button
                    onClick={() => { navigate('/admin/utenti'); setSidebarOpen(false); }}
                    className="admin-sidebar-nav-button"
                  >
                    Gestione Utenti
                  </button>
                </li>
                <li className="admin-sidebar-nav-item">
                  <button
                    onClick={() => { navigate('/admin/dipendenti'); setSidebarOpen(false); }}
                    className="admin-sidebar-nav-button"
                  >
                    Anagrafica Dipendenti
                  </button>
                </li>
                <li className="admin-sidebar-nav-item">
                  <button
                    onClick={() => { navigate('/admin/contratti'); setSidebarOpen(false); }}
                    className="admin-sidebar-nav-button"
                  >
                    Gestione CCNL
                  </button>
                </li>
                <li className="admin-sidebar-nav-item">
                  <button
                    onClick={() => { navigate('/admin/approvazioni'); setSidebarOpen(false); }}
                    className="admin-sidebar-nav-button"
                  >
                    Approvazione Fogli Ore
                  </button>
                </li>
                <li className="admin-sidebar-nav-item">
                  <button
                    onClick={() => { navigate('/admin/analisi-hr'); setSidebarOpen(false); }}
                    className="admin-sidebar-nav-button"
                  >
                    Analisi HR
                  </button>
                  <hr className="admin-sidebar-divider" />
                </li>
                {/* 🔹 TOGGLE SWITCH INTEGRATO NEL MENU MOBILE (ASIDE) */}
                <li className="admin-sidebar-toggle">
                  <label className="theme-switch" htmlFor="checkbox-mobile">
                    <input
                      type="checkbox"
                      id="checkbox-mobile"
                      checked={isDarkMode}
                      onChange={handleToggleChange}
                    />
                    <div className="slider round">
                      <i className="fas fa-sun"></i>
                      <i className="fas fa-moon"></i>
                    </div>
                  </label>
                </li>
                <li className="admin-sidebar-logout">
                  <button
                    onClick={handleLogout}
                    className="admin-sidebar-logout-button"
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

      <div className="admin-content">
        <Outlet />
      </div>

      <AdminFooter />
    </>
  )
}

export default AdminLayout
