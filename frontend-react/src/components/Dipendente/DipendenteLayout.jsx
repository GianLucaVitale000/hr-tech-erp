import { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import DipendenteNavbar from './DipendenteNavbar'
import DipendenteFooter from './DipendenteFooter'
import Logo from '../Admin/Logo'
import QrCodeInfoModal from './QrCodeInfoModal'

/**
 * DipendenteLayout - Layout wrapper per l'area dipendente
 * Mostra la navbar desktop e il footer fissi
 * Il contenuto della pagina viene renderizzato tramite <Outlet />
 * Su mobile mostra un hamburger button che apre un aside laterale
 */
function DipendenteLayout() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showQrInfoModal, setShowQrInfoModal] = useState(false)

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
  // ------------------------------------------------------

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

  return (
    <>
      {/* Passiamo lo stato e la funzione di toggle alla navbar desktop */}
      <DipendenteNavbar 
        isDarkMode={isDarkMode} 
        onToggleChange={handleToggleChange} 
      />

      {/* Mobile hamburger button */}
      {isMobile && !sidebarOpen && (
        <button
          className="sidebar-hamburger"
          onClick={() => setSidebarOpen(true)}
        >
          ☰
        </button>
      )}


      {/* Mobile sidebar */}
      {isMobile && sidebarOpen && (
        <div
          className="sidebar-overlay"
        >
          <div
            className="sidebar-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="sidebar-close"
              onClick={() => setSidebarOpen(false)}
            >
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
                <li>
                  <button
                    onClick={() => { setSidebarOpen(false); setShowQrInfoModal(true); }}
                  >
                    Come usi il QR Code?
                  </button>
                </li>
                
                <hr />
                {/* 🔹 TOGGLE SWITCH INTEGRATO NEL MENU MOBILE (ASIDE) */}
                <li className="sidebar-toggle">
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

      {/* 🔹 Modale QR Code Info (mobile) */}
      {showQrInfoModal && (
        <QrCodeInfoModal
          onClose={() => setShowQrInfoModal(false)}
        />
      )}

      <div className="dipendente-content">
        <Outlet />
      </div>

      <DipendenteFooter />
    </>
  )
}

export default DipendenteLayout
