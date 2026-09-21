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
    iban: '',
    livello: '',
    mansione: '',
    sesso: '',
    tipo_contratto: 'indeterminato',
    data_scadenza_contratto: '',
    percentuale_part_time: 100,
    giorni_lavorativi_settimanali: 5,
    R1: 6,
    R2: 7,
    rateo_mensile_ferie: null,
    rateo_mensile_permessi_rol: null,
    rateo_mensile_ex_festivita: null,
    data_assunzione: ''
  })
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    getContratti().then((res) => setContratti(res.data))
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    if (name === 'tipo_contratto') {
      setForm({
        ...form,
        [name]: value,
        data_scadenza_contratto: value === 'indeterminato' ? '' : form.data_scadenza_contratto
      })
    } else {
      const fieldValue = ['rateo_mensile_ferie', 'rateo_mensile_permessi_rol', 'rateo_mensile_ex_festivita'].includes(name)
        ? value.replace(',', '.')
        : (type === 'checkbox' ? checked : value)
      setForm({ ...form, [name]: fieldValue })
    }
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
        userData.iban = form.iban || null
        userData.livello = form.livello || null
        userData.mansione = form.mansione || null
        userData.sesso = form.sesso || null
        userData.tipo_contratto = form.tipo_contratto || 'indeterminato'
        userData.data_scadenza_contratto = form.tipo_contratto === 'determinato' ? form.data_scadenza_contratto : null
        userData.data_assunzione = form.data_assunzione || null
        userData.percentuale_part_time = form.percentuale_part_time || 100
        userData.giorni_lavorativi_settimanali = form.giorni_lavorativi_settimanali || 5
        userData.R1 = form.R1 || 6
        userData.R2 = form.R2 || 7
        userData.rateo_mensile_ferie = form.rateo_mensile_ferie !== null && form.rateo_mensile_ferie !== '' ? form.rateo_mensile_ferie : null
        userData.rateo_mensile_permessi_rol = form.rateo_mensile_permessi_rol !== null && form.rateo_mensile_permessi_rol !== '' ? form.rateo_mensile_permessi_rol : null
        userData.rateo_mensile_ex_festivita = form.rateo_mensile_ex_festivita !== null && form.rateo_mensile_ex_festivita !== '' ? form.rateo_mensile_ex_festivita : null
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
            Seleziona per compilare anche il resto dei dati per l'anagrafica dipendenti
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
              <label className="nuovo-utente-label-simple">IBAN</label>
              <input
                type="text"
                name="iban"
                value={form.iban}
                onChange={handleChange}
                placeholder="Es: IT60X0542811101000000123456"
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
              <label className="nuovo-utente-label-simple">Sesso</label>
              <select
                name="sesso"
                value={form.sesso}
                onChange={handleChange}
                className="nuovo-utente-input"
              >
                <option value="">-- Seleziona sesso --</option>
                <option value="M">Maschio</option>
                <option value="F">Femmina</option>
              </select>
            </div>

            <div className="nuovo-utente-field">
              <label className="nuovo-utente-label">
                Tipo Contratto *
              </label>
              <div className="nuovo-utente-radio-group">
                <label className="nuovo-utente-radio-label">
                  <input
                    type="radio"
                    name="tipo_contratto"
                    value="indeterminato"
                    checked={form.tipo_contratto === 'indeterminato'}
                    onChange={handleChange}
                    required
                    className="nuovo-utente-radio-input"
                  />
                  Indeterminato
                </label>
                <label className="nuovo-utente-radio-label">
                  <input
                    type="radio"
                    name="tipo_contratto"
                    value="determinato"
                    checked={form.tipo_contratto === 'determinato'}
                    onChange={handleChange}
                    required
                    className="nuovo-utente-radio-input"
                  />
                  Determinato
                </label>
              </div>
            </div>

            <div className="nuovo-utente-field">
              <label className="nuovo-utente-label">
                {form.tipo_contratto === 'determinato' ? 'Data Scadenza Contratto *' : 'Cessazione'}
              </label>
              <input
                type="date"
                name="data_scadenza_contratto"
                value={form.data_scadenza_contratto}
                onChange={handleChange}
                required={form.tipo_contratto === 'determinato'}
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
                <option value="1">1 giorni</option>
                <option value="2">2 giorni</option>
                <option value="3">3 giorni</option>
                <option value="4">4 giorni</option>
                <option value="5">5 giorni</option>
                <option value="6">6 giorni</option>
              </select>
            </div>

            {Number(form.percentuale_part_time ?? 100) >= 100 && (
              <div className="nuovo-utente-riposi-inline">
                <div className="nuovo-utente-field">
                  {(Number(form.giorni_lavorativi_settimanali) === 5 || Number(form.giorni_lavorativi_settimanali) === 6) && (
                    <div className="nuovo-utente-riposo-item">
                      <label className="nuovo-utente-label">
                        R1*
                      </label>
                      <select name="R1"
                              id="R1"
                              value={form.R1}
                              onChange={(e) => setForm({ ...form, R1: e.target.value })}
                              className="nuovo-utente-input">
                        <option value="1">lunedì</option>
                        <option value="2">martedì</option>
                        <option value="3">mercoledì</option>
                        <option value="4">giovedì</option>
                        <option value="5">venerdì</option>
                        <option value="6">sabato</option>
                        <option value="7">domenica</option>
                      </select>
                    </div>
                  )}

                  {Number(form.giorni_lavorativi_settimanali) === 5 && (
                    <div className="nuovo-utente-riposo-item">
                      <label className="nuovo-utente-label">
                        R2*
                      </label>
                      <select name="R2"
                              id="R2"
                              value={form.R2}
                              onChange={(e) => setForm({ ...form, R2: e.target.value })}
                              className="nuovo-utente-input">
                        <option value="1">lunedì</option>
                        <option value="2">martedì</option>
                        <option value="3">mercoledì</option>
                        <option value="4">giovedì</option>
                        <option value="5">venerdì</option>
                        <option value="6">sabato</option>
                        <option value="7">domenica</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Ratei mensili per calcolo ferie e permessi */}
            <div className="nuovo-utente-field">
              <label className="nuovo-utente-label-ratei">
                Ratei ferie e permessi (full time)
              </label>
              <div className="nuovo-utente-ratei-grid">
                {[
                  ['rateo_mensile_ferie', 'Ferie', 'Es: 2.12345'],
                  ['rateo_mensile_permessi_rol', 'Perm./ROL', 'Es: 2.12345'],
                  ['rateo_mensile_ex_festivita', 'Ex-festività', 'Es: 2.12345']
                ].map(([name, label, placeholder]) => (
                  <div key={name}>
                    <label className="nuovo-utente-ratei-label">
                      {label}
                    </label>
                    <input
                      type="number"
                      name={name}
                      value={form[name] === null ? '' : form[name]}
                      onChange={handleChange}
                      step="0.00001"
                      min="0"
                      max="999.99999"
                      inputMode="decimal"
                      placeholder={placeholder}
                      className="nuovo-utente-ratei-input"
                    />
                  </div>
                ))}
              </div>
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