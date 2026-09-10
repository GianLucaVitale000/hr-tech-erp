import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { createDipendente, getContratti, getUsers } from '../../services/dipendentiService'

// Helper per formattare giorni in anni, mesi, giorni
const formatGiorni = (giorni) => {
  if (!giorni || giorni === 0) return "0 giorni"

  const anni = Math.floor(giorni / 365)
  const restoDopoAnni = giorni % 365
  const mesi = Math.floor(restoDopoAnni / 30)
  const giorniRimasenti = restoDopoAnni % 30

  const parti = []
  if (anni > 0) parti.push(`${anni} ${anni === 1 ? 'anno' : 'anni'}`)
  if (mesi > 0) parti.push(`${mesi} ${mesi === 1 ? 'mese' : 'mesi'}`)
  if (giorniRimasenti > 0) parti.push(`${giorniRimasenti} ${giorniRimasenti === 1 ? 'giorno' : 'giorni'}`)

  return parti.join(', ')
}

function NuovoDipendente() {
  const [contratti, setContratti] = useState([])
  const [users, setUsers] = useState([])
  const [selectedUserEmail, setSelectedUserEmail] = useState('')
  const [contrattiFilter, setContrattiFilter] = useState('')
  const [form, setForm] = useState({
    user_id: '',
    contratto_id: '',
    codice_fiscale: '',
    iban: '',
    livello: '',
    mansione: '',
    data_assunzione: '',
    sesso: '',
    tipo_contratto: 'indeterminato',
    data_scadenza_contratto: '',
    percentuale_part_time: 100,
    giorni_lavorativi_settimanali: 5,
    rateo_mensile_ferie: null,
    rateo_mensile_permessi_rol: null,
    rateo_mensile_ex_festivita: null
  })
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // Calcola giorni dall'assunzione alla data odierna
  const giorniDallAssunzione = useMemo(() => {
    if (!form.data_assunzione) return 0
    const assunzioneDate = new Date(form.data_assunzione)
    const today = new Date()
    const diffTime = Math.abs(today - assunzioneDate)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }, [form.data_assunzione])

  useEffect(() => {
    Promise.all([
      getContratti(),
      getUsers()
    ]).then(([contrattiRes, usersRes]) => {
      setContratti(contrattiRes.data)
      setUsers(usersRes.data)
    })
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target

    if (name === 'user_id') {
      const selectedUser = users.find(u => u.id == value)
      setSelectedUserEmail(selectedUser ? selectedUser.email : '')
    }

    if (name === 'tipo_contratto') {
      setForm({
        ...form,
        [name]: value,
        data_scadenza_contratto: value === 'indeterminato' ? '' : form.data_scadenza_contratto
      })
    } else {
      // Per i campi ratei, sostituisci la virgola con il punto
      const fieldValue = ['rateo_mensile_ferie', 'rateo_mensile_permessi_rol', 'rateo_mensile_ex_festivita'].includes(name)
        ? value.replace(',', '.')
        : value
      setForm({ ...form, [name]: fieldValue })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const response = await createDipendente(form)
      const newDipendenteId = response.data.id

      // Se è part-time, reindirizza direttamente alla modifica per configurare gli orari
      if ((form.percentuale_part_time ?? 100) < 100) {
        navigate(`/admin/dipendenti/${newDipendenteId}/edit`)
      } else {
        navigate('/admin/dipendenti')
      }
    } catch {
      setError('Errore durante il salvataggio. Controlla i dati inseriti.')
    }
  }

  return (
    <div className="nuovo-dipendente-container">
      <div className="nuovo-dipendente-header">
        <h1 className="nuovo-dipendente-title">Nuovo Dipendente</h1>
      </div>

      {error && <p className="nuovo-dipendente-error">{error}</p>}

      <form onSubmit={handleSubmit}>
        <div className="nuovo-dipendente-field">
          <label className="nuovo-dipendente-label">
            Nome *
          </label>
          <select
            name="user_id"
            value={form.user_id}
            onChange={handleChange}
            required
            className="nuovo-dipendente-input"
          >
            <option value="">-- Seleziona dipendente --</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        <div className="nuovo-dipendente-field">
          <label className="nuovo-dipendente-label">
            Email *
          </label>
          <input
            type="email"
            value={selectedUserEmail}
            readOnly
            className="nuovo-dipendente-input"
          />
        </div>

        <div className="nuovo-dipendente-field">
          <label className="nuovo-dipendente-label">
            Codice Fiscale
          </label>
          <input
            type="text"
            name="codice_fiscale"
            value={form.codice_fiscale}
            onChange={handleChange}
            placeholder="Es: RSSMRA90A01H501Z"
            className="nuovo-dipendente-input"
          />
        </div>

        <div className="nuovo-dipendente-field">
          <label className="nuovo-dipendente-label">
            IBAN
          </label>
          <input
            type="text"
            name="iban"
            value={form.iban}
            onChange={handleChange}
            placeholder="Es: IT60X0542811101000000123456"
            className="nuovo-dipendente-input"
          />
        </div>

        <div className="nuovo-dipendente-field">
          <label className="nuovo-dipendente-label">
            Mansione
          </label>
          <input
            type="text"
            name="mansione"
            value={form.mansione}
            onChange={handleChange}
            placeholder="Es: Addetto produzione"
            className="nuovo-dipendente-input"
          />
        </div>

        <div className="nuovo-dipendente-field">
          <label className="nuovo-dipendente-label">
            Livello
          </label>
          <input
            type="text"
            name="livello"
            value={form.livello}
            onChange={handleChange}
            placeholder="Es: Operaio"
            className="nuovo-dipendente-input"
          />
        </div>

        <div className="nuovo-dipendente-field">
          <label className="nuovo-dipendente-label">
            CCNL applicato
          </label>
          <input
            type="text"
            placeholder="Cerca per codice CNEL o nome..."
            value={contrattiFilter}
            onChange={(e) => setContrattiFilter(e.target.value)}
            className="nuovo-dipendente-input nuovo-dipendente-input-margin"
          />
          <select
            name="contratto_id"
            value={form.contratto_id}
            onChange={handleChange}
            className="nuovo-dipendente-input"
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

        <div className="nuovo-dipendente-field">
          <label className="nuovo-dipendente-label">
            Tipo Contratto *
          </label>
          <div className="nuovo-dipendente-radio-group">
            <label className="nuovo-dipendente-radio-label">
              <input
                type="radio"
                name="tipo_contratto"
                value="indeterminato"
                checked={form.tipo_contratto === 'indeterminato'}
                onChange={handleChange}
                required
                className="nuovo-dipendente-radio-input"
              />
              Indeterminato
            </label>
            <label className="nuovo-dipendente-radio-label">
              <input
                type="radio"
                name="tipo_contratto"
                value="determinato"
                checked={form.tipo_contratto === 'determinato'}
                onChange={handleChange}
                required
                className="nuovo-dipendente-radio-input"
              />
              Determinato
            </label>
          </div>
        </div>

        <div className="nuovo-dipendente-field">
          <label className="nuovo-dipendente-label">
            {form.tipo_contratto === 'determinato' ? 'Data Scadenza Contratto *' : 'Cessazione'}
          </label>
          <input
            type="date"
            name="data_scadenza_contratto"
            value={form.data_scadenza_contratto}
            onChange={handleChange}
            required={form.tipo_contratto === 'determinato'}
            className="nuovo-dipendente-input"
          />
        </div>

        <div className="nuovo-dipendente-field">
          <label className="nuovo-dipendente-label">
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
            className="nuovo-dipendente-input"
          />
          <p className="nuovo-dipendente-hint">
            100 = tempo pieno
          </p>
        </div>

        <div className="nuovo-dipendente-field">
          <label className="nuovo-dipendente-label">
            Giorni Lavorativi Settimanali *
          </label>
          <select
            name="giorni_lavorativi_settimanali"
            value={form.giorni_lavorativi_settimanali}
            onChange={handleChange}
            required
            className="nuovo-dipendente-input"
          >
            <option value="4">4 giorni</option>
            <option value="5">5 giorni (lun-ven)</option>
            <option value="6">6 giorni (lun-sab)</option>
          </select>
        </div>

        {/* Ratei mensili per calcolo ferie e permessi */}
        <div className="nuovo-dipendente-field">
          <label className="nuovo-dipendente-label-ratei">
            Ratei ferie e permessi (full time)
          </label>
          <div className="nuovo-dipendente-ratei-grid">
            {[
              ['rateo_mensile_ferie', 'Ferie', 'Es: 2.12345'],
              ['rateo_mensile_permessi_rol', 'Perm./ROL', 'Es: 2.12345'],
              ['rateo_mensile_ex_festivita', 'Ex-festività', 'Es: 2.12345']
            ].map(([name, label, placeholder]) => (
              <div key={name}>
                <label className="nuovo-dipendente-ratei-label">
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
                  className="nuovo-dipendente-ratei-input"
                />
              </div>
            ))}
          </div>
          <small className="nuovo-dipendente-hint">
            Anzianità ai fini permessi/ROL: <strong>{formatGiorni(giorniDallAssunzione)}</strong>
          </small>
        </div>

        <div className="nuovo-dipendente-field">
          <label className="nuovo-dipendente-label">
            Data Assunzione
          </label>
          <input
            type="date"
            name="data_assunzione"
            value={form.data_assunzione}
            onChange={handleChange}
            className="nuovo-dipendente-input"
          />
        </div>

        <div className="nuovo-dipendente-field">
          <label className="nuovo-dipendente-label">
            Sesso
          </label>
          <select
            name="sesso"
            value={form.sesso}
            onChange={handleChange}
            className="nuovo-dipendente-input"
          >
            <option value="">-- Seleziona sesso --</option>
            <option value="M">Maschio</option>
            <option value="F">Femmina</option>
          </select>
        </div>

        <div className="nuovo-dipendente-buttons">
          <button
            type="button"
            onClick={() => navigate('/admin/dipendenti')}
            className="nuovo-dipendente-button nuovo-dipendente-button-cancel"
          >
            Annulla
          </button>
          <button
            type="submit"
            className="nuovo-dipendente-button nuovo-dipendente-button-submit"
          >
            Salva
          </button>
        </div>
      </form>
    </div>
  )
}

export default NuovoDipendente