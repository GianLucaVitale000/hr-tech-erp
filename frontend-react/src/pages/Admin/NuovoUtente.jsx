import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createUser, getContratti } from '../../services/dipendentiService'

function NuovoUtente() {
  const [contratti, setContratti] = useState([])
  const [contrattiFilter, setContrattiFilter] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role: 'dipendente',
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
    <div className="nuovo-utente-container">
      <div className="nuovo-utente-header">
        <h1 className="nuovo-utente-title">Nuovo Utente</h1>
      </div>

      {error && <p className="nuovo-utente-error">{error}</p>}

      <form onSubmit={handleSubmit}>
        <div className="nuovo-utente-field">
          <label className="nuovo-utente-label">
            Nome *
          </label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="Es: Mario Rossi"
            className="nuovo-utente-input"
          />
        </div>

        <div className="nuovo-utente-field">
          <label className="nuovo-utente-label">
            Email *
          </label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            placeholder="Es: mario.rossi@azienda.it"
            className="nuovo-utente-input"
          />
        </div>

        <div className="nuovo-utente-field">
          <label className="nuovo-utente-label">
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
            className="nuovo-utente-input"
          />
        </div>

        <div className="nuovo-utente-field">
          <label className="nuovo-utente-label">
            Conferma Password *
          </label>
          <input
            type="password"
            name="password_confirmation"
            value={form.password_confirmation}
            onChange={handleChange}
            required
            placeholder="Reinserisci password"
            className="nuovo-utente-input"
          />
        </div>

        <div className="nuovo-utente-field">
          <label className="nuovo-utente-label">
            Ruolo *
          </label>
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            required
            className="nuovo-utente-input"
          >
            <option value="dipendente">Dipendente</option>
            <option value="admin">Amministratore</option>
          </select>
        </div>

        <div className="nuovo-utente-field-checkbox">
          <label className="nuovo-utente-checkbox-container">
            <input
              type="checkbox"
              name="create_dipendente"
              checked={form.create_dipendente}
              onChange={handleChange}
            />
            <span>Crea anche anagrafica dipendente</span>
          </label>
          <p className="nuovo-utente-hint">
            Seleziona per creare anche il record nella tabella dipendenti
          </p>
        </div>

        {form.create_dipendente && (
          <>
            <h3 className="nuovo-utente-section-title">
              Dati Anagrafici Dipendente
            </h3>

            <div className="nuovo-utente-field">
              <label className="nuovo-utente-label-simple">Contratto</label>
              <input
                type="text"
                placeholder="Cerca per codice CNEL o nome..."
                value={contrattiFilter}
                onChange={(e) => setContrattiFilter(e.target.value)}
                className="nuovo-utente-input"
                style={{ marginBottom: '0.5rem' }}
              />
              <select
                name="contratto_id"
                value={form.contratto_id}
                onChange={handleChange}
                className="nuovo-utente-input"
                size={Math.min(10, contratti.filter(c =>
                  c.nome_contratto.toLowerCase().includes(contrattiFilter.toLowerCase()) ||
                  c.codice_cnel?.toLowerCase().includes(contrattiFilter.toLowerCase())
                ).length + 1)}
              >
                <option value="">-- Seleziona contratto --</option>
                {contratti
                  .filter(c =>
                    contrattiFilter === '' ||
                    c.nome_contratto.toLowerCase().includes(contrattiFilter.toLowerCase()) ||
                    (c.codice_cnel && c.codice_cnel.toLowerCase().includes(contrattiFilter.toLowerCase()))
                  )
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.codice_cnel || 'N/D'}] {c.nome_contratto}
                    </option>
                ))}
              </select>
            </div>

            <div className="nuovo-utente-field">
              <label className="nuovo-utente-label-simple">Codice Fiscale</label>
              <input
                type="text"
                name="codice_fiscale"
                value={form.codice_fiscale}
                onChange={handleChange}
                placeholder="Es: RSSMRA90A01H501Z"
                className="nuovo-utente-input"
              />
            </div>

            <div className="nuovo-utente-field">
              <label className="nuovo-utente-label-simple">Mansione</label>
              <input
                type="text"
                name="mansione"
                value={form.mansione}
                onChange={handleChange}
                placeholder="Es: Addetto produzione"
                className="nuovo-utente-input"
              />
            </div>

            <div className="nuovo-utente-field">
              <label className="nuovo-utente-label-simple">Livello</label>
              <input
                type="text"
                name="livello"
                value={form.livello}
                onChange={handleChange}
                placeholder="Es: Operaio"
                className="nuovo-utente-input"
              />
            </div>

            <div className="nuovo-utente-field">
              <label className="nuovo-utente-label">
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
                className="nuovo-utente-input"
              />
              <p className="nuovo-utente-hint">
                100 = tempo pieno
              </p>
            </div>

            <div className="nuovo-utente-field">
              <label className="nuovo-utente-label">
                Giorni Lavorativi Settimanali *
              </label>
              <select
                name="giorni_lavorativi_settimanali"
                value={form.giorni_lavorativi_settimanali}
                onChange={handleChange}
                required
                className="nuovo-utente-input"
              >
                <option value="4">4 giorni</option>
                <option value="5">5 giorni (lun-ven)</option>
                <option value="6">6 giorni (lun-sab)</option>
              </select>
            </div>

            <div className="nuovo-utente-field">
              <label className="nuovo-utente-label">
                Data Assunzione
              </label>
              <input
                type="date"
                name="data_assunzione"
                value={form.data_assunzione}
                onChange={handleChange}
                placeholder="Seleziona data"
                className="nuovo-utente-input"
              />
            </div>
          </>
        )}

        <div className="nuovo-utente-buttons">
          <button
            type="button"
            onClick={() => navigate('/admin/utenti')}
            className="nuovo-utente-button nuovo-utente-button-cancel"
          >
            Annulla
          </button>
          <button
            type="submit"
            className="nuovo-utente-button nuovo-utente-button-submit"
          >
            Crea Utente
          </button>
        </div>
      </form>
    </div>
  )
}

export default NuovoUtente