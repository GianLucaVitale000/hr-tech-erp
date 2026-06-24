import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getDipendente, updateDipendente, getContratti, getUsers } from '../../services/dipendentiService'

function EditDipendente() {
  const { id } = useParams()
  const [contratti, setContratti] = useState([])
  const [users, setUsers] = useState([])
  const [selectedUserEmail, setSelectedUserEmail] = useState('')
  const [form, setForm] = useState({
    user_id: '',
    contratto_id: '',
    codice_fiscale: '',
    livello: '',
    mansione: '',
    data_assunzione: '',
    percentuale_part_time: 100,
    giorni_lavorativi_settimanali: 5
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      getDipendente(id),
      getContratti(),
      getUsers()
    ])
      .then(([dipRes, contrattiRes, usersRes]) => {
        const d = dipRes.data
        
        setForm({
          user_id: d.user_id || '',
          contratto_id: d.contratto_id || '',
          codice_fiscale: d.codice_fiscale || '',
          livello: d.livello || '',
          mansione: d.mansione || '',
          data_assunzione: d.data_assunzione || '',
          percentuale_part_time: d.percentuale_part_time || 100,
          giorni_lavorativi_settimanali: d.giorni_lavorativi_settimanali || 5
        })
        setContratti(contrattiRes.data)
        setUsers(usersRes.data)
        // Ottieni l'email direttamente dalla relazione user (più affidabile)
        setSelectedUserEmail(d.user?.email || '')
      })
      .catch(() => setError('Dipendente non trovato'))
      .finally(() => setLoading(false))
  }, [id])

  const handleChange = (e) => {
    const { name, value } = e.target
    
    if (name === 'user_id') {
      const selectedUser = users.find(u => u.id == value)
      setSelectedUserEmail(selectedUser ? selectedUser.email : '')
    }
    
    setForm({ ...form, [name]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      await updateDipendente(id, form)
      navigate('/admin/dipendenti')
    } catch (err) {
      const message = err.response?.data?.message || 'Errore durante l\'aggiornamento'
      setError(message)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
        <p>Caricamento...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '600px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => navigate('/admin')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: '1rem'
          }}
        >
          ← Dashboard
        </button>
        <h1 style={{ margin: 0 }}>Modifica Dipendente</h1>
      </div>

      {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Nome *
          </label>
          <select
            name="user_id"
            value={form.user_id}
            onChange={handleChange}
            required
            style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
          >
            <option value="">-- Seleziona dipendente --</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Email *
          </label>
          <input
            type="email"
            value={selectedUserEmail}
            readOnly
            style={{ 
              display: 'block', 
              width: '100%', 
              padding: '0.5rem', 
              border: '1px solid #d1d5db', 
              borderRadius: '4px'
            }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Codice Fiscale
          </label>
          <input
            type="text"
            name="codice_fiscale"
            value={form.codice_fiscale}
            onChange={handleChange}
            placeholder="Es: RSSMRA90A01H501Z"
            style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Mansione
          </label>
          <input
            type="text"
            name="mansione"
            value={form.mansione}
            onChange={handleChange}
            placeholder="Es: Addetto produzione"
            style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Livello
          </label>
          <input
            type="text"
            name="livello"
            value={form.livello}
            onChange={handleChange}
            placeholder="Es: Operaio"
            style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Contratto
          </label>
          <select
            name="contratto_id"
            value={form.contratto_id}
            onChange={handleChange}
            style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
          >
            <option value="">-- Seleziona contratto --</option>
            {contratti.map((c) => (
              <option key={c.id} value={c.id}>{c.nome_contratto}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            % Part-Time *
          </label>
          <input
            type="number"
            name="percentuale_part_time"
            value={form.percentuale_part_time}
            onChange={handleChange}
            required
            min="0"
            max="100"
            step="1"
            placeholder="100"
            style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Giorni Lavorativi Settimanali *
          </label>
          <select
            name="giorni_lavorativi_settimanali"
            value={form.giorni_lavorativi_settimanali}
            onChange={handleChange}
            required
            style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
          >
            <option value="4">4 giorni</option>
            <option value="5">5 giorni (lun-ven)</option>
            <option value="6">6 giorni (lun-sab)</option>
          </select>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Data Assunzione
          </label>
          <input
            type="date"
            name="data_assunzione"
            value={form.data_assunzione}
            onChange={handleChange}
            placeholder="Seleziona data"
            style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            type="button"
            onClick={() => navigate('/admin/dipendenti')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Annulla
          </button>
          <button
            type="submit"
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Aggiorna Dipendente
          </button>
        </div>
      </form>
    </div>
  )
}

export default EditDipendente
