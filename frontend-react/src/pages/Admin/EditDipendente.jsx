import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getDipendente, updateDipendente, getContratti, getUsers } from '../../services/dipendentiService'
import { saveOrariSettimanali } from '../../services/dipendenteOrariSettimanaliService'

// Costanti per i giorni della settimana
const GIORNI_SETTIMANA = [
  { id: 0, name: 'Domenica', short: 'Dom' },
  { id: 1, name: 'Lunedì', short: 'Lun' },
  { id: 2, name: 'Martedì', short: 'Mar' },
  { id: 3, name: 'Mercoledì', short: 'Mer' },
  { id: 4, name: 'Giovedì', short: 'Gio' },
  { id: 5, name: 'Venerdì', short: 'Ven' },
  { id: 6, name: 'Sabato', short: 'Sab' },
]

// Funzione per calcolare le ore da "Dalle" e "Alle" (formato HH:MM)
const calcolaOreDaTempo = (dalle, alle) => {
  if (!dalle || !alle) return 0

  try {
    const [h1, m1] = dalle.split(':').map(Number)
    const [h2, m2] = alle.split(':').map(Number)

    if (h1 === undefined || m1 === undefined || h2 === undefined || m2 === undefined) return 0

    const totaleMinuti = (h2 * 60 + m2) - (h1 * 60 + m1)
    return Math.max(0, totaleMinuti / 60)
  } catch {
    return 0
  }
}

// Helper per convertire data ISO a formato aaaa-mm-gg per input type="date"
const formatDateForInput = (dateString) => {
  if (!dateString) return ''
  try {
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateString
    }
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch {
    return dateString
  }
}

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

function EditDipendente() {
  const { id } = useParams()
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
    data_decorrenza_variazione: '',
    sesso: '',
    tipo_contratto: 'indeterminato',
    data_scadenza_contratto: '',
    percentuale_part_time: 100,
    giorni_lavorativi_settimanali: 5,
    R1: 6,
    R2: 7,
    rateo_mensile_ferie: null,
    rateo_mensile_permessi_rol: null,
    rateo_mensile_ex_festivita: null
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [orariConfigurati, setOrariConfigurati] = useState(false)
  const [savingOrari, setSavingOrari] = useState(false)
  const [orariError, setOrariError] = useState('')

  const [orariSettimanali, setOrariSettimanali] = useState(
    GIORNI_SETTIMANA.map(g => ({
      giorno_settimana: g.id,
      name: g.name,
      turno1: { dalle: '', alle: '' },
      turno2: { dalle: '', alle: '' },
      totaleGiorno: 0
    }))
  )

  const navigate = useNavigate()

  const totaleSettimanale = orariSettimanali.reduce((sum, giorno) => sum + (giorno.totaleGiorno || 0), 0)

  const giorniDallAssunzione = useMemo(() => {
    if (!form.data_assunzione) return 0
    const assunzioneDate = new Date(form.data_assunzione)
    const today = new Date()
    const diffTime = Math.abs(today - assunzioneDate)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }, [form.data_assunzione])

  const { oreSettimanaliFullTime, oreSettimanaliPartTime } = useMemo(() => {
    const contrattoSelezionato = contratti.find(c => String(c.id) === String(form.contratto_id))
    const oreFullTime = contrattoSelezionato?.regole_calcolo?.[0]?.ore_settimanali_teoriche || 40
    const percentuale = form.percentuale_part_time || 100
    const orePartTime = Math.round(oreFullTime * percentuale / 100 * 100) / 100
    return { oreSettimanaliFullTime: oreFullTime, oreSettimanaliPartTime: orePartTime }
  }, [form.contratto_id, form.percentuale_part_time, contratti])

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
          contratto_id: String(d.contratto?.id || d.contratto_id || '').toString(),
          codice_fiscale: d.codice_fiscale || '',
          iban: d.iban || '',
          livello: d.livello || '',
          mansione: d.mansione || '',
          data_assunzione: formatDateForInput(d.data_assunzione) || '',
          data_decorrenza_variazione: '',
          sesso: d.sesso || '',
          tipo_contratto: d.tipo_contratto || 'indeterminato',
          data_scadenza_contratto: formatDateForInput(d.data_scadenza_contratto) || '',
          percentuale_part_time: d.percentuale_part_time || 100,
          giorni_lavorativi_settimanali: d.giorni_lavorativi_settimanali || 5,
          R1: d.R1 || 6,
          R2: d.R2 || 7,
          rateo_mensile_ferie: d.rateo_mensile_ferie ?? null,
          rateo_mensile_permessi_rol: d.rateo_mensile_permessi_rol ?? null,
          rateo_mensile_ex_festivita: d.rateo_mensile_ex_festivita ?? null
        })

        let contrattiCompleti = [...contrattiRes.data]
        if (d.contratto && !contrattiRes.data.some(c => c.id == d.contratto.id)) {
          contrattiCompleti.push(d.contratto)
        }

        const contrattiMap = new Map()
        contrattiCompleti.forEach(c => {
          if (!c.codice_cnel) return
          if (!contrattiMap.has(c.codice_cnel)) {
            contrattiMap.set(c.codice_cnel, c)
          } else {
            const existing = contrattiMap.get(c.codice_cnel)
            const existingDate = existing.data_decorrenza ? new Date(existing.data_decorrenza) : null
            const newDate = c.data_decorrenza ? new Date(c.data_decorrenza) : null

            if (newDate && (!existingDate || newDate > existingDate)) {
              contrattiMap.set(c.codice_cnel, c)
            }
            else if (d.contratto && d.contratto.id == c.id) {
              contrattiMap.set(c.codice_cnel, c)
            }
          }
        })

        setContratti(Array.from(contrattiMap.values()))
        setUsers(usersRes.data)
        setSelectedUserEmail(d.user?.email || '')

        setOrariConfigurati(d.has_orari_settimanali_configurati || (d.orari_settimanali && d.orari_settimanali.some(o => (o.ore_giornaliere_previste || 0) > 0)))

        if (d.orari_settimanali && d.orari_settimanali.length > 0) {
          const orariMap = new Map()
          d.orari_settimanali.forEach(o => {
            orariMap.set(o.giorno_settimana, o)
          })

          setOrariSettimanali(
            GIORNI_SETTIMANA.map(g => {
              const orario = orariMap.get(g.id) || {}
              const totale = parseFloat(orario.ore_giornaliere_previste) || 0
              return {
                giorno_settimana: g.id,
                name: g.name,
                turno1: {
                  dalle: orario.turno1_dalle || '',
                  alle: orario.turno1_alle || ''
                },
                turno2: {
                  dalle: orario.turno2_dalle || '',
                  alle: orario.turno2_alle || ''
                },
                totaleGiorno: totale
              }
            })
          )
        }
      })
      .catch((err) => {
        if (err.response && err.response.status === 401) {
          navigate('/login')
          return
        }
        if (err.response && err.response.status === 404) {
          setError('Dipendente non trovato')
          return
        }
        setError('Errore di connessione. Verifica che il server sia attivo.')
      })
      .finally(() => setLoading(false))
  }, [id, navigate])

  const handleTurnoChange = (giornoIndex, turno, campo, valore) => {
    setOrariSettimanali(prev => {
      const newOrari = [...prev]
      const giorno = { ...newOrari[giornoIndex] }

      giorno[turno][campo] = valore

      const t1Ore = calcolaOreDaTempo(giorno.turno1.dalle, giorno.turno1.alle)
      const t2Ore = calcolaOreDaTempo(giorno.turno2.dalle, giorno.turno2.alle)
      giorno.totaleGiorno = Math.round((t1Ore + t2Ore) * 100) / 100

      newOrari[giornoIndex] = giorno
      return newOrari
    })
    setOrariError('')
  }

  const handleSalvaOrari = async () => {
    if (totaleSettimanale > oreSettimanaliPartTime) {
      setOrariError(`Il totale settimanale (${Math.round(totaleSettimanale * 100) / 100} h) supera il limite consentito (${oreSettimanaliPartTime} h)`)
      return
    }

    if (totaleSettimanale <= 0) {
      setOrariError('Inserire almeno un orario valido per un giorno')
      return
    }

    setSavingOrari(true)
    setOrariError('')

    try {
      const orariDaSalvare = orariSettimanali.map(g => ({
        giorno_settimana: g.giorno_settimana,
        ore_giornaliere_previste: g.totaleGiorno,
        turno1_dalle: g.turno1.dalle || null,
        turno1_alle: g.turno1.alle || null,
        turno2_dalle: g.turno2.dalle || null,
        turno2_alle: g.turno2.alle || null
      }))

      console.log('Salvataggio orari:', orariDaSalvare, 'per dipendente:', id)

      await saveOrariSettimanali(id, orariDaSalvare)

      setOrariConfigurati(true)

    } catch (err) {
      console.error('Errore salvataggio orari:', err)
      setOrariError(err.response?.data?.error || err.message || 'Errore nel salvataggio degli orari')
    } finally {
      setSavingOrari(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target

    if (name === 'user_id') {
      const selectedUser = users.find(u => u.id == value)
      setSelectedUserEmail(selectedUser ? selectedUser.email : '')
    }

    if (name === 'tipo_contratto') {
      setForm(prev => ({
        ...prev,
        [name]: value,
        data_scadenza_contratto: value === 'indeterminato' ? '' : prev.data_scadenza_contratto
      }))
    } else {
      const fieldValue = ['rateo_mensile_ferie', 'rateo_mensile_permessi_rol', 'rateo_mensile_ex_festivita'].includes(name)
        ? value.replace(',', '.')
        : value
      setForm(prev => {
        const newForm = { ...prev, [name]: fieldValue }
        return newForm
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const submitData = {
        ...form,
        contratto_id: form.contratto_id ? Number(form.contratto_id) : null,
        user_id: form.user_id ? Number(form.user_id) : null,
        tipo_contratto: form.tipo_contratto,
        data_scadenza_contratto: form.tipo_contratto === 'determinato' ? form.data_scadenza_contratto : null,
        percentuale_part_time: Number(form.percentuale_part_time) || 100,
        giorni_lavorativi_settimanali: Number(form.giorni_lavorativi_settimanali) || 5,
        data_decorrenza_variazione: form.data_decorrenza_variazione || null
      }

      await updateDipendente(id, submitData)
      navigate('/admin/dipendenti')
    } catch (err) {
      const message = err.response?.data?.message || 'Errore durante l\'aggiornamento'
      setError(message)
    }
  }

  if (loading) {
    return (
      <div className="edit-dipendente-loading-container">
        <p>Caricamento...</p>
      </div>
    )
  }

  // Determina classe per bottone salva orari
  const getSaveButtonClass = () => {
    if (savingOrari) return 'edit-dipendente-orari-save-button edit-dipendente-orari-save-button-saving'
    if (totaleSettimanale > oreSettimanaliPartTime || oreSettimanaliPartTime <= 0) {
      return 'edit-dipendente-orari-save-button edit-dipendente-orari-save-button-invalid'
    }
    return 'edit-dipendente-orari-save-button edit-dipendente-orari-save-button-valid'
  }

  // Determina classe per status orari
  const getStatusClass = () => {
    return orariConfigurati
      ? 'edit-dipendente-orari-status edit-dipendente-orari-status-configured'
      : 'edit-dipendente-orari-status edit-dipendente-orari-status-not-configured'
  }

  // Determina classe per totale footer
  const getFooterValueClass = () => {
    return totaleSettimanale <= oreSettimanaliPartTime
      ? 'edit-dipendente-orari-footer-value edit-dipendente-orari-footer-value-valid'
      : 'edit-dipendente-orari-footer-value edit-dipendente-orari-footer-value-invalid'
  }

  // Determina colore input time
  const getTimeInputClass = (value) => {
    return (value && value !== '00:00')
      ? 'edit-dipendente-orari-time-input edit-dipendente-orari-time-input-valid'
      : 'edit-dipendente-orari-time-input edit-dipendente-orari-time-input-invalid'
  }

  return (
    <div className="edit-dipendente-container">
      <div className="edit-dipendente-header">
        <h1 className="edit-dipendente-title">Modifica Dipendente</h1>
      </div>

      {error && <p className="edit-dipendente-error">{error}</p>}

      <form onSubmit={handleSubmit}>
        <div className="edit-dipendente-field">
          <label className="edit-dipendente-label">
            Nome *
          </label>
          <select
            name="user_id"
            value={form.user_id}
            onChange={handleChange}
            required
            className="edit-dipendente-input"
          >
            <option value="">-- Seleziona dipendente --</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        <div className="edit-dipendente-field">
          <label className="edit-dipendente-label">
            Email *
          </label>
          <input
            type="email"
            value={selectedUserEmail}
            readOnly
            className="edit-dipendente-input"
          />
        </div>

        <div className="edit-dipendente-field">
          <label className="edit-dipendente-label">
            Codice Fiscale
          </label>
          <input
            type="text"
            name="codice_fiscale"
            value={form.codice_fiscale}
            onChange={handleChange}
            placeholder="Es: RSSMRA90A01H501Z"
            className="edit-dipendente-input"
          />
        </div>

        <div className="edit-dipendente-field">
          <label className="edit-dipendente-label">
            IBAN
          </label>
          <input
            type="text"
            name="iban"
            value={form.iban}
            onChange={handleChange}
            placeholder="Es: IT60X0542811101000000123456"
            className="edit-dipendente-input"
          />
        </div>

        <div className="edit-dipendente-field">
          <label className="edit-dipendente-label">
            Data Assunzione
          </label>
          <input
            type="date"
            name="data_assunzione"
            value={form.data_assunzione}
            onChange={handleChange}
            className="edit-dipendente-input"
          />
        </div>

        <div className="edit-dipendente-field">
          <label className="edit-dipendente-label">
            Sesso
          </label>
          <select
            name="sesso"
            value={form.sesso}
            onChange={handleChange}
            className="edit-dipendente-input"
          >
            <option value="">-- Seleziona sesso --</option>
            <option value="M">Maschio</option>
            <option value="F">Femmina</option>
          </select>
        </div>

        <div className="edit-dipendente-field">
          <label className="edit-dipendente-label">
            Mansione
          </label>
          <input
            type="text"
            name="mansione"
            value={form.mansione}
            onChange={handleChange}
            placeholder="Es: Addetto produzione"
            className="edit-dipendente-input"
          />
        </div>

        <div className="edit-dipendente-field">
          <label className="edit-dipendente-label">
            Livello
          </label>
          <input
            type="text"
            name="livello"
            value={form.livello}
            onChange={handleChange}
            placeholder="Es: Operaio"
            className="edit-dipendente-input"
          />
        </div>

        <div className="edit-dipendente-field">
          <label className="edit-dipendente-label">
            CCNL applicato
          </label>
          <input
            type="text"
            placeholder="Cerca per codice CNEL o nome..."
            value={contrattiFilter}
            onChange={(e) => setContrattiFilter(e.target.value)}
            className="edit-dipendente-input edit-dipendente-input-margin"
          />
          <select
            name="contratto_id"
            value={form.contratto_id}
            onChange={handleChange}
            className="edit-dipendente-input"
          >
            <option value="">-- Seleziona contratto --</option>
            {contratti
              .filter(c =>
                contrattiFilter === '' ||
                c.nome_contratto.toLowerCase().includes(contrattiFilter.toLowerCase()) ||
                (c.codice_cnel && c.codice_cnel.toLowerCase().includes(contrattiFilter.toLowerCase()))
              )
              .map((c) => (
                <option key={c.id} value={String(c.id)}>
                  [{c.codice_cnel || 'N/D'}] {c.nome_contratto}
                </option>
              ))}
          </select>
        </div>

        <div className="edit-dipendente-field">
          <label className="edit-dipendente-label">
            Tipo Contratto *
          </label>
          <div className="edit-dipendente-radio-group">
            <label className="edit-dipendente-radio-label">
              <input
                type="radio"
                name="tipo_contratto"
                value="indeterminato"
                checked={form.tipo_contratto === 'indeterminato'}
                onChange={handleChange}
                required
                className="edit-dipendente-radio-input"
              />
              Indeterminato
            </label>
            <label className="edit-dipendente-radio-label">
              <input
                type="radio"
                name="tipo_contratto"
                value="determinato"
                checked={form.tipo_contratto === 'determinato'}
                onChange={handleChange}
                required
                className="edit-dipendente-radio-input"
              />
              Determinato
            </label>
          </div>
        </div>

        <div className="edit-dipendente-field">
          <label className="edit-dipendente-label">
            {form.tipo_contratto === 'determinato' ? 'Data Scadenza Contratto *' : 'Cessazione'}
          </label>
          <input
            type="date"
            name="data_scadenza_contratto"
            value={form.data_scadenza_contratto}
            onChange={handleChange}
            required={form.tipo_contratto === 'determinato'}
            className="edit-dipendente-input"
          />
        </div>

        <div className="edit-dipendente-field">
          <label className="edit-dipendente-label">
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
            className="edit-dipendente-input"
          />
        </div>

        <div className="edit-dipendente-field">
          <label className="edit-dipendente-label">
            Decorrenza variazione contrattuale
          </label>
          <input
            type="date"
            name="data_decorrenza_variazione"
            value={form.data_decorrenza_variazione}
            onChange={handleChange}
            className="edit-dipendente-input"
          />
          <small className="edit-dipendente-hint">
            da compilare se cambi CCNL, giorni di riposo o % part-time.
          </small>
        </div>

        <div className="edit-dipendente-field">
          <label className="edit-dipendente-label">
            Giorni Lavorativi Settimanali *
          </label>
          <select
            name="giorni_lavorativi_settimanali"
            value={form.giorni_lavorativi_settimanali}
            onChange={handleChange}
            required
            className="edit-dipendente-input"
          >
            <option value="1">1 giorni</option>
            <option value="2">2 giorni</option>
            <option value="3">3 giorni</option>
            <option value="4">4 giorni</option>
            <option value="5">5 giorni</option>
            <option value="6">6 giorni</option>
          </select>
        </div>
        
        {/* I campi R1 ed R2 compaiono solo se il dipendente NON è part-time (< 100%) */}
        {Number(form.percentuale_part_time ?? 100) >= 100 && (
          <div className="edit-dipendente-riposi-inline">
            <div className="edit-dipendente-field">
              {/* Mostra R1 se i giorni lavorativi sono 5 oppure 6 */}
              {(Number(form.giorni_lavorativi_settimanali) === 5 || Number(form.giorni_lavorativi_settimanali) === 6) && (
                <div className="edit-dipendente-riposo-item">
                  <label className="edit-dipendente-label">
                    R1*
                  </label>
                  <select name="R1"
                          id="R1"
                          value={form.R1}
                          onChange={(e) => setForm({ ...form, R1: e.target.value })}
                          className="edit-dipendente-input">
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

              {/* Mostra R2 SOLO se i giorni lavorativi sono 5 */}
              {Number(form.giorni_lavorativi_settimanali) === 5 && (
                <div className="edit-dipendente-riposo-item">
                  <label className="edit-dipendente-label">
                    R2*
                  </label>
                  <select name="R2"
                          id="R2"
                          value={form.R2}
                          onChange={(e) => setForm({ ...form, R2: e.target.value })}
                          className="edit-dipendente-input">
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
        <div className="edit-dipendente-field">
          <label className="edit-dipendente-label-ratei">
            Ratei ferie e permessi (full time)
          </label>
          <div className="edit-dipendente-ratei-grid">
            {[
              ['rateo_mensile_ferie', 'Ferie', 'Es: 2.12345'],
              ['rateo_mensile_permessi_rol', 'Perm./ROL', 'Es: 2.12345'],
              ['rateo_mensile_ex_festivita', 'Ex-festività', 'Es: 2.12345']
            ].map(([name, label, placeholder]) => (
              <div key={name}>
                <label className="edit-dipendente-ratei-label">
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
                  className="edit-dipendente-ratei-input"
                />
              </div>
            ))}
          </div>
          <small className="edit-dipendente-hint">
            Anzianità per calcolo permessi/ROL maturati: <strong>{formatGiorni(giorniDallAssunzione)}</strong>
          </small>
        </div>

        {/* Configurazione Orari Settimanali per Part-Time */}
        {(form.percentuale_part_time ?? 100) < 100 && (
          <div className="edit-dipendente-orari-container">
            <div className="edit-dipendente-orari-header">
              <label className="edit-dipendente-orari-label">
                Configurazione Orario Settimanale Part-Time
              </label>
              <span className={getStatusClass()}>
                {orariConfigurati ? '✓ Configurato' : '✗ Non configurato'}
              </span>
            </div>

            <p className="edit-dipendente-orari-description">
              Per i dipendenti part-time, definire l'orario giornaliero per ogni giorno della settimana.
              <strong> Senza questa configurazione non sarà possibile inserire presenze.</strong>
            </p>

            {/* Dati contrattuali */}
            <div className="edit-dipendente-orari-data">
              <p className="edit-dipendente-orari-data-label">
                <strong>Dati Contrattuali:</strong>
              </p>
              <p className="edit-dipendente-orari-data-value">
                Ore settimanali (full-time): {oreSettimanaliFullTime} h
              </p>
              <p className="edit-dipendente-orari-data-value">
                % Part-Time: {form.percentuale_part_time || 100}%
              </p>
              <p className="edit-dipendente-orari-data-value">
                Ore settimanali part-time: <strong>{oreSettimanaliPartTime} h</strong>
              </p>
              <p className="edit-dipendente-orari-data-value">
                Ore attualmente configurate: <strong>{Math.round(totaleSettimanale * 100) / 100} h</strong>
              </p>
              <p className={totaleSettimanale <= oreSettimanaliPartTime ? 'edit-dipendente-orari-data-value' : 'edit-dipendente-orari-data-warning'}>
                {totaleSettimanale <= oreSettimanaliPartTime
                  ? '✓ Totale nel limite'
                  : `✗ Supera di ${Math.round((totaleSettimanale - oreSettimanaliPartTime) * 100) / 100} ore`}
              </p>
            </div>

            {orariError && (
              <div className="edit-dipendente-orari-error">
                {orariError}
              </div>
            )}

            {/* Tabella orari */}
            <table className="edit-dipendente-orari-table">
              <thead>
                <tr className="edit-dipendente-orari-table-header">
                  <th className="edit-dipendente-orari-table-header-cell">Giorno</th>
                  <th className="edit-dipendente-orari-table-header-cell">Turno 1 - Dalle</th>
                  <th className="edit-dipendente-orari-table-header-cell">Turno 1 - Alle</th>
                  <th className="edit-dipendente-orari-table-header-cell">Turno 2 - Dalle</th>
                  <th className="edit-dipendente-orari-table-header-cell">Turno 2 - Alle</th>
                  <th className="edit-dipendente-orari-table-header-cell">Totale Giorno (h)</th>
                </tr>
              </thead>
              <tbody>
                {orariSettimanali.map((giorno, index) => (
                  <tr key={giorno.giorno_settimana} className="edit-dipendente-orari-table-row">
                    <td className="edit-dipendente-orari-table-cell edit-dipendente-orari-table-cell-label">
                      {giorno.name}
                    </td>
                    <td className="edit-dipendente-orari-table-cell">
                      <input
                        type="text"
                        value={giorno.turno1.dalle || ''}
                        onChange={(e) => handleTurnoChange(index, 'turno1', 'dalle', e.target.value)}
                        placeholder="--:--"
                        maxLength={5}
                        className={getTimeInputClass(giorno.turno1.dalle)}
                      />
                    </td>
                    <td className="edit-dipendente-orari-table-cell">
                      <input
                        type="text"
                        value={giorno.turno1.alle || ''}
                        onChange={(e) => handleTurnoChange(index, 'turno1', 'alle', e.target.value)}
                        placeholder="--:--"
                        maxLength={5}
                        className={getTimeInputClass(giorno.turno1.alle)}
                      />
                    </td>
                    <td className="edit-dipendente-orari-table-cell">
                      <input
                        type="text"
                        value={giorno.turno2.dalle || ''}
                        onChange={(e) => handleTurnoChange(index, 'turno2', 'dalle', e.target.value)}
                        placeholder="--:--"
                        maxLength={5}
                        className={getTimeInputClass(giorno.turno2.dalle)}
                      />
                    </td>
                    <td className="edit-dipendente-orari-table-cell">
                      <input
                        type="text"
                        value={giorno.turno2.alle || ''}
                        onChange={(e) => handleTurnoChange(index, 'turno2', 'alle', e.target.value)}
                        placeholder="--:--"
                        maxLength={5}
                        className={getTimeInputClass(giorno.turno2.alle)}
                      />
                    </td>
                    <td className="edit-dipendente-orari-table-cell edit-dipendente-orari-total-cell">
                      {giorno.totaleGiorno.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="edit-dipendente-orari-footer">
                  <td className="edit-dipendente-orari-footer-label" colSpan={5}>
                    <strong>Totale Settimanale:</strong>
                  </td>
                  <td className={getFooterValueClass()}>
                    <strong>{Math.round(totaleSettimanale * 100) / 100} h</strong>
                  </td>
                </tr>
              </tfoot>
            </table>

            <p className="edit-dipendente-orari-instructions">
              <strong>Istruzioni:</strong> Inserisci gli orari per ogni giorno (formato HH:MM).
              Puoi configurare due turni per giorno. Il totale non può superare le ore part-time.
            </p>

            <div className="edit-dipendente-orari-buttons">
              <button
                type="button"
                onClick={handleSalvaOrari}
                disabled={savingOrari || totaleSettimanale > oreSettimanaliPartTime || oreSettimanaliPartTime <= 0}
                className={getSaveButtonClass()}
              >
                {savingOrari ? 'Salvataggio...' :
                 (totaleSettimanale > oreSettimanaliPartTime || oreSettimanaliPartTime <= 0)
                   ? '⚠️ Dati non validi'
                   : 'Salva Configurazione'}
              </button>
            </div>
          </div>
        )}

        <div className="edit-dipendente-buttons">
          <button
            type="button"
            onClick={() => navigate('/admin/dipendenti')}
            className="edit-dipendente-button edit-dipendente-button-cancel"
          >
            Annulla
          </button>
          <button
            type="submit"
            className="edit-dipendente-button edit-dipendente-button-submit"
          >
            Aggiorna Dipendente
          </button>
        </div>
      </form>
    </div>
  )
}

export default EditDipendente