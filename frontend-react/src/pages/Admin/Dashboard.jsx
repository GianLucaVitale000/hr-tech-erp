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
      <h1>Dashboard Admin</h1>
      <p>Benvenuto, <strong>{user?.name}</strong></p>
      <p>Ruolo: <strong>{user?.role}</strong></p>

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
        <button
          onClick={() => navigate('/admin/dipendenti')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Anagrafica Dipendenti
        </button>

        <button
          onClick={() => navigate('/admin/approvazioni')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#7c3aed',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Approvazione Fogli Ore
        </button>

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
    </div>
  )
}

export default AdminDashboard