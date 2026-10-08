import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUsers, deleteUser } from '../../services/dipendentiService'
import PrivacyAcknowledgmentModal from '../../components/Admin/PrivacyAcknowledgmentModal'

function Utenti() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [privacyUser, setPrivacyUser] = useState(null)
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
    <div className="utenti-container">
      <div className="utenti-header">
        <div className="utenti-header-content">
          <h1 className="utenti-title">Gestione Utenti</h1>
          <button
            onClick={() => navigate('/admin/utenti/nuovo')}
            className="utenti-add-button"
          >
            + Nuovo Utente
          </button>
        </div>
      </div>

      {error && <p className="utenti-error">{error}</p>}

      {loading ? (
        <p>Caricamento...</p>
      ) : users.length === 0 ? (
        <p className="utenti-empty">Nessun utente trovato. Crea il primo utente.</p>
      ) : isMobile ? (
        // Layout mobile: cards incolonnate
        <div className="utenti-mobile-list">
          {users.map((u) => (
            <div key={u.id} className="utenti-card">
              <div className="utenti-card-fields">
                <div className="utenti-card-field">
                  <span className="utenti-card-label">Nome e Cognome:</span>
                  <span className="utenti-card-value">{u.name}</span>
                </div>
                <div className="utenti-card-field">
                  <span className="utenti-card-label">Email:</span>
                  <span className="utenti-card-value">{u.email}</span>
                </div>
                <div className="utenti-card-field">
                  <span className="utenti-card-label">Ruolo:</span>
                  <span className="utenti-card-value">{getRoleName(u)}</span>
                </div>
                {u.dipendente?.id && (
                  <div className="utenti-card-field">
                    <span className="utenti-card-label">Privacy:</span>
                    <span className="utenti-card-value">{u.dipendente.latest_privacy_acknowledgment ? '✅ Acquisita' : '⚠️ Da acquisire'}</span>
                  </div>
                )}
              </div>
              <div className="utenti-card-actions">
                <button
                  onClick={() => navigate(`/admin/utenti/${u.id}/edit`)}
                  className="utenti-card-button utenti-card-button-edit"
                >
                  Modifica
                </button>
                <button
                  onClick={() => handleDelete(u.id)}
                  className="utenti-card-button utenti-card-button-delete"
                >
                  Elimina
                </button>
                {u.dipendente?.id && (
                  <button
                    onClick={() => setPrivacyUser(u)}
                    className="utenti-card-button utenti-card-button-privacy"
                  >
                    Privacy
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Layout desktop: tabella
        <div className="utenti-table-container">
          <table className="utenti-table">
            <thead>
              <tr className="utenti-table-header">
                <th>Nome e Cognome</th>
                <th>Email</th>
                <th>Ruolo</th>
                <th>Privacy</th>
                <th>Foto</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="utenti-table-row">
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{getRoleName(u)}</td>
                  <td>
                    {u.dipendente?.id
                      ? (u.dipendente.latest_privacy_acknowledgment ? '✅ OK' : '⚠️ No')
                      : '—'}
                  </td>
                  <td>
                    {u.avatar_url ? '✅ OK' : '❌ No'}
                  </td>
                  <td>
                    <button
                      onClick={() => navigate(`/admin/utenti/${u.id}/edit`)}
                      className="utenti-table-button utenti-table-button-edit"
                    >
                      Modifica
                    </button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="utenti-table-button utenti-table-button-delete"
                    >
                      Elimina
                    </button>
                    {u.dipendente?.id && (
                      <button
                        onClick={() => setPrivacyUser(u)}
                        className="utenti-table-button utenti-table-button-privacy"
                      >
                        Privacy
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {privacyUser && (
        <PrivacyAcknowledgmentModal
          user={privacyUser}
          onClose={() => setPrivacyUser(null)}
          onSaved={fetchUsers}
        />
      )}
    </div>
  )
}

export default Utenti