import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUsers, deleteUser } from '../../services/dipendentiService'

function Utenti() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const navigate = useNavigate()

  // Rileva se è mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const fetchUsers = () => {
    getUsers()
      .then((res) => setUsers(res.data))
      .catch(() => setError('Errore nel caricamento utenti'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleDelete = async (id) => {
    if (window.confirm('Sei sicuro di voler eliminare questo utente?')) {
      try {
        await deleteUser(id)
        fetchUsers()
      } catch {
        setError('Errore durante l\'eliminazione')
      }
    }
  }

  const getRoleName = (user) => {
    return user.roles?.map(r => r.name).join(', ') || 'Nessun ruolo'
  }

  return (
    <div style={{ padding: '2.5rem', fontFamily: 'sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, lineHeight: '1.2' }}>Gestione Utenti</h1>
          <button
            onClick={() => navigate('/admin/utenti/nuovo')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            + Nuovo Utente
          </button>
        </div>
      </div>

      {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}

      {loading ? (
        <p>Caricamento...</p>
      ) : users.length === 0 ? (
        <p style={{ color: '#6b7280' }}>Nessun utente trovato. Crea il primo utente.</p>
      ) : isMobile ? (
        // Layout mobile: cards incolonnate
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {users.map((u) => (
            <div
              key={u.id}
              style={{
                backgroundColor: '#374151',
                borderRadius: '8px',
                padding: '1rem',
                border: '1px solid #4b5563'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0', borderBottom: '1px solid #4b5563' }}>
                  <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Nome:</span>
                  <span style={{ color: 'white', fontSize: '0.95rem', fontWeight: '500' }}>{u.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0', borderBottom: '1px solid #4b5563' }}>
                  <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Email:</span>
                  <span style={{ color: 'white', fontSize: '0.95rem', fontWeight: '500' }}>{u.email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0', borderBottom: '1px solid #4b5563' }}>
                  <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Ruolo:</span>
                  <span style={{ color: 'white', fontSize: '0.95rem', fontWeight: '500' }}>{getRoleName(u)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0' }}>
                  <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Dipendente:</span>
                  <span style={{ color: 'white', fontSize: '0.95rem', fontWeight: '500' }}>
                    {u.dipendente?.id ? '✅ Sì' : '❌ No'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                <button
                  onClick={() => navigate(`/admin/utenti/${u.id}/edit`)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    flex: '1'
                  }}
                >
                  Modifica
                </button>
                <button
                  onClick={() => handleDelete(u.id)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    flex: '1'
                  }}
                >
                  Elimina
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Layout desktop: tabella
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', textAlign: 'center' }}>
                <th style={{ padding: '0.75rem' }}>Nome</th>
                <th style={{ padding: '0.75rem' }}>Email</th>
                <th style={{ padding: '0.75rem' }}>Ruolo</th>
                <th style={{ padding: '0.75rem' }}>Dipendente</th>
                <th style={{ padding: '0.75rem' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.75rem' }}>{u.name}</td>
                  <td style={{ padding: '0.75rem' }}>{u.email}</td>
                  <td style={{ padding: '0.75rem' }}>{getRoleName(u)}</td>
                  <td style={{ padding: '0.75rem' }}>
                    {u.dipendente?.id ? '✅ Sì' : '❌ No'}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <button
                      onClick={() => navigate(`/admin/utenti/${u.id}/edit`)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginRight: '0.5rem',
                        fontSize: '0.875rem'
                      }}
                    >
                      Modifica
                    </button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      Elimina
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default Utenti
