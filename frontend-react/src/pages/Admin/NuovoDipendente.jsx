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

  // Calcola giorni dall'assunzione alla data odierna (per visualizzazione admin)
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
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '500px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>Nuovo Dipendente</h1>
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
            IBAN
          </label>
          <input
            type="text"
            name="iban"
            value={form.iban}
            onChange={handleChange}
            placeholder="Es: IT60X0542811101000000123456"
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
            CCNL applicato
          </label>
          <input
            type="text"
            placeholder="Cerca per codice CNEL o nome (es: C011, Metalmeccanica...)"
            value={contrattiFilter}
            onChange={(e) => setContrattiFilter(e.target.value)}
            style={{ 
              display: 'block', 
              width: '100%', 
              padding: '0.5rem', 
              border: '1px solid #d1d5db', 
              borderRadius: '4px',
              marginBottom: '0.5rem'
            }}
          />
          <select
            name="contratto_id"
            value={form.contratto_id}
            onChange={handleChange}
            style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
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

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Tipo Contratto *
          </label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                name="tipo_contratto"
                value="indeterminato"
                checked={form.tipo_contratto === 'indeterminato'}
                onChange={handleChange}
                required
                style={{ marginRight: '0.5rem' }}
              />
              Tempo Indeterminato
            </label>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                name="tipo_contratto"
                value="determinato"
                checked={form.tipo_contratto === 'determinato'}
                onChange={handleChange}
                required
                style={{ marginRight: '0.5rem' }}
              />
              Tempo Determinato
            </label>
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            {form.tipo_contratto === 'determinato' ? 'Data Scadenza Contratto *' : 'Cessazione'}
          </label>
          <input
            type="date"
            name="data_scadenza_contratto"
            value={form.data_scadenza_contratto}
            onChange={handleChange}
            required={form.tipo_contratto === 'determinato'}
            style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
          />
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
          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
            100 = tempo pieno
          </p>
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

        {/* Ratei mensili per calcolo ferie e permessi */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '500', color: '#d1d5db' }}>
            Ratei mensili per ferie e permessi (in ore full time)
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {[
              ['rateo_mensile_ferie', 'Ferie', 'Es: 2.12345'],
              ['rateo_mensile_permessi_rol', 'Permessi/ROL', 'Es: 2.12345'],
              ['rateo_mensile_ex_festivita', 'Ex-festività', 'Es: 2.12345']
            ].map(([name, label, placeholder]) => (
              <div key={name}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: '#9ca3af' }}>
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
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px'
                  }}
                />
              </div>
            ))}
          </div>
          <small style={{ display: 'block', marginTop: '0.35rem', color: '#6b7280' }}>
            Anzianità ai fini permessi/ROL: <strong>{formatGiorni(giorniDallAssunzione)}</strong>
          </small>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Data Assunzione
          </label>
          <input
            type="date"
            name="data_assunzione"
            value={form.data_assunzione}
            onChange={handleChange}
            style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Sesso
          </label>
          <select
            name="sesso"
            value={form.sesso}
            onChange={handleChange}
            style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
          >
            <option value="">-- Seleziona sesso --</option>
            <option value="M">Maschio</option>
            <option value="F">Femmina</option>
          </select>
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
            Salva
          </button>
        </div>
      </form>
    </div>
  )
}

export default NuovoDipendente
