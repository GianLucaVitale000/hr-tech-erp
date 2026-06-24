import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await api.post('/logout')
    logout()
    navigate('/login')
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: '0 0 2rem 0' }}>Dashboard di Amministrazione</h1>
          <p>Benvenuto, <strong>{user?.name}</strong></p>
          <p>Ruolo: <strong>{user?.role}</strong></p>
        </div>
        <button onClick={handleLogout} style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#dc2626',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
          Logout
        </button>
      </div>

      <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '2rem' }}>
        <nav style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => navigate('/admin/utenti')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '4px 4px 0 0',
              cursor: 'pointer',
              fontWeight: '500',
              borderBottom: '3px solid transparent'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#e5e7eb'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#f3f4f6'}
          >
            Gestione Utenti
          </button>
          <button
            onClick={() => navigate('/admin/contratti')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '4px 4px 0 0',
              cursor: 'pointer',
              fontWeight: '500',
              borderBottom: '3px solid transparent'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#e5e7eb'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#f3f4f6'}
          >
            Gestione CCNL
          </button>
          <button
            onClick={() => navigate('/admin/dipendenti')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '4px 4px 0 0',
              cursor: 'pointer',
              fontWeight: '500',
              borderBottom: '3px solid transparent'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#e5e7eb'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#f3f4f6'}
          >
            Anagrafica Dipendenti
          </button>
          <button
            onClick={() => navigate('/admin/approvazioni')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '4px 4px 0 0',
              cursor: 'pointer',
              fontWeight: '500',
              borderBottom: '3px solid transparent'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#e5e7eb'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#f3f4f6'}
          >
            Approvazione Fogli Ore
          </button>
        </nav>
      </div>

      <p style={{ color: 'white', fontSize: '1.125rem' }}>
        Benvenuto nella Dashboard di Amministrazione. Seleziona una sezione dal menu sopra per iniziare a gestire contratti, dipendenti o approvazioni.
      </p>
    </div>
  )
}

export default AdminDashboard