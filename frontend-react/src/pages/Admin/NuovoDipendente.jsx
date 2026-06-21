import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createDipendente, getContratti } from '../../services/dipendentiService'

function NuovoDipendente() {
  const [contratti, setContratti] = useState([])
  const [form, setForm] = useState({
    user_id: '',
    contratto_id: '',
    codice_fiscale: '',
    iban: '',
    livello: '',
    mansione: '',
    data_assunzione: ''
  })
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    getContratti().then((res) => setContratti(res.data))
  }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      await createDipendente(form)
      navigate('/admin/dipendenti')
    } catch {
      setError('Errore durante il salvataggio. Controlla i dati inseriti.')
    }
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '500px' }}>
      <h1>Nuovo Dipendente</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label>ID Utente (User ID)</label>
          <input
            type="number"
            name="user_id"
            value={form.user_id}
            onChange={handleChange}
            required
            style={{ display: 'block', width: '100%', padding: '0.5rem' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Contratto</label>
          <select
            name="contratto_id"
            value={form.contratto_id}
            onChange={handleChange}
            style={{ display: 'block', width: '100%', padding: '0.5rem' }}
          >
            <option value="">-- Nessuno --</option>
            {contratti.map((c) => (
              <option key={c.id} value={c.id}>{c.nome_contratto}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Codice Fiscale</label>
          <input
            type="text"
            name="codice_fiscale"
            value={form.codice_fiscale}
            onChange={handleChange}
            style={{ display: 'block', width: '100%', padding: '0.5rem' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>IBAN</label>
          <input
            type="text"
            name="iban"
            value={form.iban}
            onChange={handleChange}
            style={{ display: 'block', width: '100%', padding: '0.5rem' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Livello</label>
          <input
            type="text"
            name="livello"
            value={form.livello}
            onChange={handleChange}
            style={{ display: 'block', width: '100%', padding: '0.5rem' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Mansione</label>
          <input
            type="text"
            name="mansione"
            value={form.mansione}
            onChange={handleChange}
            style={{ display: 'block', width: '100%', padding: '0.5rem' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label>Data Assunzione</label>
          <input
            type="date"
            name="data_assunzione"
            value={form.data_assunzione}
            onChange={handleChange}
            style={{ display: 'block', width: '100%', padding: '0.5rem' }}
          />
        </div>

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
          Salva
        </button>
      </form>
    </div>
  )
}

export default NuovoDipendente
