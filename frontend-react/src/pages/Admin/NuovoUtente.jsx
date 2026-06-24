import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createUser, getContratti } from '../../services/dipendentiService'

function NuovoUtente() {
  const [contratti, setContratti] = useState([])
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role: 'dipendente',
    // Campi opzionali per dipendente
    create_dipendente: false,
    contratto_id: '',
    codice_fiscale: '',
    livello: '',
    mansione: '',
    percentuale_part_time: 100,
    giorni_lavorativi_settimanali: 5,
    data_assunzione: ''
  })
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    getContratti().then((res) => setContratti(res.data))
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const userData = {
        name: form.name,
        email: form.email,
        password: form.password,
        password_confirmation: form.password_confirmation,
        role: form.role,
        create_dipendente: form.create_dipendente
      }
      
      // Se l'utente vuole anche creare il dipendente, aggiungi i campi dipendente
      if (form.create_dipendente) {
        userData.contratto_id = form.contratto_id || null
        userData.codice_fiscale = form.codice_fiscale || null
        userData.livello = form.livello || null
        userData.mansione = form.mansione || null
        userData.data_assunzione = form.data_assunzione || null
        userData.percentuale_part_time = form.percentuale_part_time || 100
        userData.giorni_lavorativi_settimanali = form.giorni_lavorativi_settimanali || 5
      }
      
      await createUser(userData)
      navigate('/admin/utenti')
    } catch (err) {
      const message = err.response?.data?.message || 'Errore durante il salvataggio'
      setError(message)
    }
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
        <h1 style={{ margin: 0 }}>Nuovo Utente</h1>
      </div>

      {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Nome *
          </label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="Es: Mario Rossi"
            style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Email *
          </label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            placeholder="Es: mario.rossi@azienda.it"
            style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Password *
          </label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            minLength="8"
            placeholder="Minimo 8 caratteri"
            style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Conferma Password *
          </label>
          <input
            type="password"
            name="password_confirmation"
            value={form.password_confirmation}
            onChange={handleChange}
            required
            placeholder="Reinserisci password"
            style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Ruolo *
          </label>
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            required
            style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
          >
            <option value="dipendente">Dipendente</option>
            <option value="admin">Amministratore</option>
          </select>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              name="create_dipendente"
              checked={form.create_dipendente}
              onChange={handleChange}
            />
            <span>Crea anche anagrafica dipendente</span>
          </label>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
            Seleziona per creare anche il record nella tabella dipendenti
          </p>
        </div>

        {form.create_dipendente && (
          <>
            <h3 style={{ marginBottom: '1.5rem', color: '#4b5563', fontSize: '1.125rem' }}>
              Dati Anagrafici Dipendente
            </h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <label>Contratto</label>
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

            <div style={{ marginBottom: '1rem' }}>
              <label>Codice Fiscale</label>
              <input
                type="text"
                name="codice_fiscale"
                value={form.codice_fiscale}
                onChange={handleChange}
                placeholder="Es: RSSMRA90A01H501Z"
                style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label>Mansione</label>
              <input
                type="text"
                name="mansione"
                value={form.mansione}
                onChange={handleChange}
                placeholder="Es: Addetto produzione"
                style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label>Livello</label>
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
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>
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
                style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
              />
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                100 = tempo pieno
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>
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

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>
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
          </>
        )}

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            type="button"
            onClick={() => navigate('/admin/utenti')}
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
            Crea Utente
          </button>
        </div>
      </form>
    </div>
  )
}

export default NuovoUtente
