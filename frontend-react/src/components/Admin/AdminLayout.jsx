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
      <AdminNavbar />

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

            <hr/>

            <nav style={{ marginTop: '1rem', height: 'calc(100% - 4rem)', display: 'flex', flexDirection: 'column' }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
                {/* Voce Dashboard: compare solo se NON siamo già sulla dashboard */}
                {location.pathname !== '/admin' && (
                  <li style={{ marginBottom: '1rem' }}>
                    <button
                      onClick={() => { navigate('/admin'); setSidebarOpen(false); }}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        color: '#f3f4f6',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '0.75rem',
                        lineHeight: '1.2'
                      }}
                    >
                      Dashboard
                    </button>
                  </li>
                )}
                <li style={{ marginBottom: '1rem' }}>
                  <button
                    onClick={() => { navigate('/admin/utenti'); setSidebarOpen(false); }}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      color: '#f3f4f6',
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: '0.75rem',
                      lineHeight: '1.2'
                    }}
                  >
                    Gestione Utenti
                  </button>
                </li>
                <li style={{ marginBottom: '1rem' }}>
                  <button
                    onClick={() => { navigate('/admin/dipendenti'); setSidebarOpen(false); }}
                    style={{ width: '100%', padding: '0.75rem', background: 'none', border: 'none', textAlign: 'right', cursor: 'pointer', fontSize: '1rem', color: '#f3f4f6', lineHeight: '1.2' }}
                  >
                    Anagrafica Dipendenti
                  </button>
                </li>
                <li style={{ marginBottom: '1rem' }}>
                  <button
                    onClick={() => { navigate('/admin/contratti'); setSidebarOpen(false); }}
                    style={{ width: '100%', padding: '0.75rem', background: 'none', border: 'none', textAlign: 'right', cursor: 'pointer', fontSize: '1rem', color: '#f3f4f6', lineHeight: '1.2' }}
                  >
                    Gestione CCNL
                  </button>
                </li>
                <li style={{ marginBottom: '1rem' }}>
                  <button
                    onClick={() => { navigate('/admin/approvazioni'); setSidebarOpen(false); }}
                    style={{ width: '100%', padding: '0.75rem', background: 'none', border: 'none', textAlign: 'right', cursor: 'pointer', fontSize: '1rem', color: '#f3f4f6', lineHeight: '1.2' }}
                  >
                    Approvazione Fogli Ore
                  </button>
                </li>
                <li style={{ marginBottom: '1rem' }}>
                  <button
                    onClick={() => { navigate('/admin/analisi-hr'); setSidebarOpen(false); }}
                    style={{ width: '100%', padding: '0.75rem', background: 'none', border: 'none', textAlign: 'right', cursor: 'pointer', fontSize: '1rem', color: '#f3f4f6', lineHeight: '1.2'}}
                  >
                    Analisi HR
                  </button>
                  <hr style={{ marginTop: '2rem' }} />
                </li>
                <li style={{
                  marginTop: '1rem',
                  display: 'flex',
                  justifyContent: 'flex-end'
                }}>
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

      <div className="admin-content">
        <Outlet />
      </div>

      <AdminFooter />
    </>
  )
}

export default AdminLayout
