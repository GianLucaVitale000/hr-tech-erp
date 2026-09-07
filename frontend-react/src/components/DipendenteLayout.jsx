import { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import DipendenteNavbar from './DipendenteNavbar'
import DipendenteFooter from './DipendenteFooter'
import Logo from './Admin/Logo'
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
      <DipendenteNavbar />

      {/* Mobile hamburger button */}
      {isMobile && (
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
      )}

      {/* Mobile sidebar */}
      {isMobile && sidebarOpen && (
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
                <li style={{ marginBottom: '1rem' }}>
                  <button
                    onClick={() => { setSidebarOpen(false); setShowQrInfoModal(true); }}
                    style={{ width: '100%', padding: '0.75rem', background: 'none', border: 'none', textAlign: 'right', cursor: 'pointer', fontSize: '1rem', color: '#f3f4f6', lineHeight: '1.2' }}
                  >
                    Come usi il QR Code?
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
