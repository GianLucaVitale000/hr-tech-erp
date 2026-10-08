import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { getUser, updateUser, uploadUserAvatar } from '../../services/dipendentiService'
import Avatar from '../../components/Avatar'

function EditUtente() {
  const { id } = useParams()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role: 'dipendente',
    avatar: null,
    avatar_url: null
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [avatarPreview, setAvatarPreview] = useState(null)
  const { user: authenticatedUser, login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      getUser(id).catch(() => null)
    ])
      .then(([userRes]) => {
        if (!userRes || !userRes.data) {
          setError('Utente non trovato')
          return
        }
        const u = userRes.data
        setForm({
          name: u.name || '',
          email: u.email || '',
          password: '',
          password_confirmation: '',
          role: u.roles?.length > 0 ? u.roles[0].name : 'dipendente',
          avatar_url: u.avatar_url || null
        })
      })
      .catch(() => setError('Utente non trovato'))
      .finally(() => setLoading(false))
  }, [id])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'avatar') {
      const file = e.target.files?.[0] || null
      setForm({ ...form, avatar: file })
      setAvatarPreview(file ? URL.createObjectURL(file) : null)
      return
    }
    setForm({ ...form, [name]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      if (form.avatar) {
        await uploadUserAvatar(id, form.avatar)
      }

      const userData = { ...form }
      if (form.password) {
        userData.password = form.password
        userData.password_confirmation = form.password_confirmation
      } else {
        delete userData.password
        delete userData.password_confirmation
      }
      delete userData.avatar
      delete userData.avatar_url

      const response = await updateUser(id, userData)
      if (String(authenticatedUser?.id) === String(id) && response.data?.user) {
        login({
          ...authenticatedUser,
          ...response.data.user,
          role: response.data.user.roles?.[0]?.name || authenticatedUser.role
        })
      }
      navigate('/admin/utenti')
    } catch (err) {
      const message = err.response?.data?.message || 'Errore durante l\'aggiornamento'
      setError(message)
    }
  }

  if (loading) {
    return (
      <div className="edit-utente-loading-container">
        <p>Caricamento...</p>
      </div>
    )
  }

  return (
    <div className="edit-utente-container">
      <div className="edit-utente-header">
        <h1 className="edit-utente-title">Modifica Utente</h1>
      </div>

      {error && <p className="edit-utente-error">{error}</p>}

      <form onSubmit={handleSubmit}>
        <div className="edit-utente-field">
          <label className="edit-utente-label">
            Nome e Cognome *
          </label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="Es: Mario Rossi"
            className="edit-utente-input"
          />
        </div>

        <div className="edit-utente-field">
          <label className="edit-utente-label">
            Foto profilo
          </label>
          <Avatar
            name={form.name}
            url={avatarPreview || form.avatar_url}
            className="utente-avatar-preview-frame"
          />
          <input
            type="file"
            name="avatar"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleChange}
            className="edit-utente-input"
          />
          <p className="edit-utente-hint">JPG, PNG, GIF o WEBP, massimo 2 MB</p>
        </div>

        <div className="edit-utente-field">
          <label className="edit-utente-label">
            Email *
          </label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            placeholder="Es: mario.rossi@azienda.it"
            className="edit-utente-input"
          />
        </div>

        <div className="edit-utente-field">
          <label className="edit-utente-label">
            Nuova Password
          </label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            minLength="8"
            placeholder="Lascia vuoto per non cambiare"
            className="edit-utente-input"
          />
          <p className="edit-utente-hint">
            Minimo 8 caratteri
          </p>
        </div>

        <div className="edit-utente-field">
          <label className="edit-utente-label">
            Conferma Nuova Password
          </label>
          <input
            type="password"
            name="password_confirmation"
            value={form.password_confirmation}
            onChange={handleChange}
            placeholder="Lascia vuoto per non cambiare"
            className="edit-utente-input"
          />
        </div>

        <div className="edit-utente-field-ruolo">
          <label className="edit-utente-label">
            Ruolo *
          </label>
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            required
            className="edit-utente-select"
          >
            <option value="dipendente">Dipendente</option>
            <option value="admin">Amministratore</option>
          </select>
        </div>

        <div className="edit-utente-buttons">
          <button
            type="button"
            onClick={() => navigate('/admin/utenti')}
            className="edit-utente-button edit-utente-button-cancel"
          >
            Annulla
          </button>
          <button
            type="submit"
            className="edit-utente-button edit-utente-button-submit"
          >
            Aggiorna Utente
          </button>
        </div>
      </form>
    </div>
  )
}

export default EditUtente