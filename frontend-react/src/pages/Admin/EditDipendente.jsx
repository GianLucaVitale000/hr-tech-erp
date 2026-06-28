import { useState, useEffect } from 'react'
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
    livello: '',
    mansione: '',
    data_assunzione: '',
    percentuale_part_time: 100,
    giorni_lavorativi_settimanali: 5
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dipendente, setDipendente] = useState(null)
  const [orariConfigurati, setOrariConfigurati] = useState(false)
  const [savingOrari, setSavingOrari] = useState(false)
  const [orariError, setOrariError] = useState('')
  const [oreSettimanaliFullTime, setOreSettimanaliFullTime] = useState(40)
  const [oreSettimanaliPartTimeCalcolato, setOreSettimanaliPartTimeCalcolato] = useState(0)
  
  // Stato per gli orari settimanali con due turni per ogni giorno
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
  
  // Calcola il totale settimanale
  const totaleSettimanale = orariSettimanali.reduce((sum, giorno) => sum + (giorno.totaleGiorno || 0), 0)
  
  // Usa il valore calcolato in tempo reale in base a contratto e percentuale
  const oreSettimanaliPartTime = oreSettimanaliPartTimeCalcolato

  useEffect(() => {
    Promise.all([
      getDipendente(id),
      getContratti(),
      getUsers()
    ])
      .then(([dipRes, contrattiRes, usersRes]) => {
        const d = dipRes.data
        
        // Debug: logga i dati del dipendente per diagnosticare
        console.log('Dipendente caricato:', d)
        console.log('Contratto:', d.contratto)
        console.log('Contratto ID:', d.contratto_id)
        
        setForm({
          user_id: d.user_id || '',
          // Usa il contratto caricato tramite relazione, altrimenti contratt_id, altrimenti stringa vuota
          // Converte in stringa per garantire compatibilità con il select HTML
          contratto_id: String(d.contratto?.id || d.contratto_id || '').toString(),
          codice_fiscale: d.codice_fiscale || '',
          livello: d.livello || '',
          mansione: d.mansione || '',
          data_assunzione: d.data_assunzione || '',
          percentuale_part_time: d.percentuale_part_time || 100,
          giorni_lavorativi_settimanali: d.giorni_lavorativi_settimanali || 5
        })
        setDipendente(d)
        
        // Assicurati che il contratto del dipendente sia nella lista
        // anche se non è il più recente per il suo codice CNEL
        let contrattiCompleti = [...contrattiRes.data]
        if (d.contratto && !contrattiRes.data.some(c => c.id == d.contratto.id)) {
          contrattiCompleti.push(d.contratto)
        }
        
        // Raggruppa per codice_cnel e mantieni solo il più recente per ogni codice
        // (simula il comportamento originale del backend)
        const contrattiMap = new Map()
        contrattiCompleti.forEach(c => {
          if (!c.codice_cnel) return
          if (!contrattiMap.has(c.codice_cnel)) {
            contrattiMap.set(c.codice_cnel, c)
          } else {
            // Se esiste già, confronta per data_decorrenza e mantieni il più recente
            const existing = contrattiMap.get(c.codice_cnel)
            const existingDate = existing.data_decorrenza ? new Date(existing.data_decorrenza) : null
            const newDate = c.data_decorrenza ? new Date(c.data_decorrenza) : null
            
            if (newDate && (!existingDate || newDate > existingDate)) {
              contrattiMap.set(c.codice_cnel, c)
            }
            // Se il contratto del dipendente non è il più recente, ma vogliamo includerlo comunque
            // se è quello attualmente selezionato
            else if (d.contratto && d.contratto.id == c.id) {
              // Mantieni il contratto del dipendente anche se non è il più recente
              contrattiMap.set(c.codice_cnel, c)
            }
          }
        })
        
        setContratti(Array.from(contrattiMap.values()))
        setUsers(usersRes.data)
        
        // Debug
        console.log('Contratto dipendente:', d.contratto)
        console.log('Contratto ID form:', String(d.contratto?.id || d.contratto_id || ''))
        console.log('Regole calcolo contratto:', d.contratto?.regole_calcolo)
        console.log('Tipo regole_calcolo:', typeof d.contratto?.regole_calcolo)
        console.log('Lunghezza:', d.contratto?.regole_calcolo?.length)
        console.log('Chiavi:', Object.keys(d.contratto?.regole_calcolo || {}))
        if (d.contratto?.regole_calcolo) {
          console.log('Primo elemento (index 0):', d.contratto.regole_calcolo[0])
          // Usa accesso con indice [0] per array JavaScript
          const primaRegola = d.contratto.regole_calcolo[0] || d.contratto.regole_calcolo.first
          console.log('Regola di calcolo (corretta):', primaRegola)
        }
        console.log('regolaCalcolo accessor:', d.regolaCalcolo || 'Usare regole_calcolo[0]')
        console.log('Ore settimanali part-time (from backend):', d.ore_settimanali_part_time)
        // Ottieni l'email direttamente dalla relazione user (più affidabile)
        setSelectedUserEmail(d.user?.email || '')
        
        // Controlla se gli orari settimanali sono configurati (almeno un giorno con ore > 0)
        setOrariConfigurati(d.has_orari_settimanali_configurati || (d.orari_settimanali && d.orari_settimanali.some(o => (o.ore_giornaliere_previste || 0) > 0)))
        
        // Inizializza ore full-time e part-time dal contratto del dipendente
        const oreFullTimeIniziali = d.contratto?.regole_calcolo?.[0]?.ore_settimanali_teoriche || 40
        const percentualeIniziale = d.percentuale_part_time || 100
        const orePartTimeIniziali = Math.round(oreFullTimeIniziali * percentualeIniziale / 100 * 100) / 100
        setOreSettimanaliFullTime(oreFullTimeIniziali)
        setOreSettimanaliPartTimeCalcolato(orePartTimeIniziali)
        
        // Inizializza gli orari settimanali con i dati esistenti
        if (d.orari_settimanali && d.orari_settimanali.length > 0) {
          // Crea una mappa per giorno con tutti i dati
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
        // Se errore 401 (non autenticato), reindirizza al login
        if (err.response && err.response.status === 401) {
          navigate('/login')
          return
        }
        // Se errore 404, dipendente non trovato
        if (err.response && err.response.status === 404) {
          setError('Dipendente non trovato')
          return
        }
        // Altro errore di rete
        setError('Errore di connessione. Verifica che il server sia attivo.')
      })
      .finally(() => setLoading(false))
  }, [id, navigate])

  // Calcola ore settimanali full-time e part-time in base al contratto selezionato
  useEffect(() => {
    const contrattoSelezionato = contratti.find(c => String(c.id) === String(form.contratto_id))
    const oreFullTime = contrattoSelezionato?.regole_calcolo?.[0]?.ore_settimanali_teoriche || 40
    const percentuale = form.percentuale_part_time || 100
    const orePartTime = Math.round(oreFullTime * percentuale / 100 * 100) / 100
    
    setOreSettimanaliFullTime(oreFullTime)
    setOreSettimanaliPartTimeCalcolato(orePartTime)
  }, [form.contratto_id, form.percentuale_part_time, contratti])

  // Aggiorna il totale del giorno quando cambiano i turni
  const handleTurnoChange = (giornoIndex, turno, campo, valore) => {
    setOrariSettimanali(prev => {
      const newOrari = [...prev]
      const giorno = { ...newOrari[giornoIndex] }
      
      // Aggiorna il campo specifico
      giorno[turno][campo] = valore
      
      // Calcola il totale per questo giorno
      const t1Ore = calcolaOreDaTempo(giorno.turno1.dalle, giorno.turno1.alle)
      const t2Ore = calcolaOreDaTempo(giorno.turno2.dalle, giorno.turno2.alle)
      giorno.totaleGiorno = Math.round((t1Ore + t2Ore) * 100) / 100
      
      newOrari[giornoIndex] = giorno
      return newOrari
    })
    setOrariError('')
  }

  // Salva gli orari settimanali
  const handleSalvaOrari = async () => {
    // Validazione: non può superare oreSettimanaliPartTime
    if (totaleSettimanale > oreSettimanaliPartTime) {
      setOrariError(`Il totale settimanale (${Math.round(totaleSettimanale * 100) / 100} h) supera il limite consentito (${oreSettimanaliPartTime} h)`)
      return
    }
    
    // Validazione: almeno un giorno deve avere ore > 0
    if (totaleSettimanale <= 0) {
      setOrariError('Inserire almeno un orario valido per un giorno')
      return
    }
    
    setSavingOrari(true)
    setOrariError('')
    
    try {
      // Prepara i dati per l'API (inclusi i turni)
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
      
      // Aggiorna lo stato
      setOrariConfigurati(true)
      
      // Ricarica il dipendente per aggiornare lo stato
      const res = await getDipendente(id)
      setDipendente(res.data)
      
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
    
    setForm(prev => {
      const newForm = { ...prev, [name]: value }
      if (name === 'contratto_id') {
        console.log('Form aggiornato, contratto_id:', newForm.contratto_id)
      }
      return newForm
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      // Prepara i dati: converte i campi numerici in numeri
      const submitData = {
        ...form,
        // Converte i campi che devono essere numerici
        contratto_id: form.contratto_id ? Number(form.contratto_id) : null,
        user_id: form.user_id ? Number(form.user_id) : null,
        percentuale_part_time: Number(form.percentuale_part_time) || 100,
        giorni_lavorativi_settimanali: Number(form.giorni_lavorativi_settimanali) || 5
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

        {/* Configurazione Orari Settimanali per Part-Time - Tabella integrata */}
        {(form.percentuale_part_time ?? 100) < 100 && (
          <div style={{ 
            marginBottom: '1.5rem', 
            padding: '1rem', 
            border: '1px solid #f59e0b', 
            borderRadius: '8px',
            backgroundColor: '#fef3c7'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: '600', color: '#92400e' }}>
                Configurazione Orari Settimanali Part-Time
              </label>
              <span style={{
                fontSize: '0.875rem',
                color: orariConfigurati ? '#059669' : '#dc2626',
                fontWeight: '500'
              }}>
                {orariConfigurati ? '✓ Configurato' : '✗ Non configurato'}
              </span>
            </div>
            
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#92400e' }}>
              Per i dipendenti part-time, definire l'orario giornaliero per ogni giorno della settimana.
              <strong> Senza questa configurazione non sarà possibile inserire presenze.</strong>
            </p>
            
            {/* Dati contrattuali */}
            <div style={{
              backgroundColor: '#f0f9ff',
              padding: '0.75rem',
              borderRadius: '4px',
              marginBottom: '1rem',
              border: '1px solid #bae6fd',
              fontSize: '0.75rem'
            }}>
              <p style={{ margin: 0, color: '#0c4a6e' }}>
                <strong>Dati Contrattuali:</strong>
              </p>
              <p style={{ margin: '0.25rem 0 0 0', color: '#1e40af' }}>
                Ore settimanali (full-time): {oreSettimanaliFullTime} h
              </p>
              <p style={{ margin: '0.25rem 0 0 0', color: '#1e40af' }}>
                % Part-Time: {form.percentuale_part_time || 100}%
              </p>
              <p style={{ margin: '0.25rem 0 0 0', color: '#1e40af' }}>
                Ore settimanali part-time: <strong>{oreSettimanaliPartTime} h</strong>
              </p>
              <p style={{ margin: '0.25rem 0 0 0', color: '#1e40af' }}>
                Ore attualmente configurate: <strong>{Math.round(totaleSettimanale * 100) / 100} h</strong>
              </p>
              <p style={{ margin: '0.25rem 0 0 0', color: totaleSettimanale <= oreSettimanaliPartTime ? '#059669' : '#dc2626' }}>
                {totaleSettimanale <= oreSettimanaliPartTime 
                  ? '✓ Totale nel limite' 
                  : `✗ Supera di ${Math.round((totaleSettimanale - oreSettimanaliPartTime) * 100) / 100} ore`}
              </p>
            </div>

            {orariError && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                padding: '1rem',
                borderRadius: '4px',
                marginBottom: '1rem'
              }}>
                {orariError}
              </div>
            )}

            {/* Tabella orari */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem' }}>Giorno</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem' }}>Turno 1 - Dalle</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem' }}>Turno 1 - Alle</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem' }}>Turno 2 - Dalle</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem' }}>Turno 2 - Alle</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem' }}>Totale Giorno (h)</th>
                </tr>
              </thead>
              <tbody>
                {orariSettimanali.map((giorno, index) => (
                  <tr key={giorno.giorno_settimana} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.5rem', fontSize: '0.75rem', fontWeight: '500' }}>
                      {giorno.name}
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <input
                        type="text"
                        value={giorno.turno1.dalle || ''}
                        onChange={(e) => handleTurnoChange(index, 'turno1', 'dalle', e.target.value)}
                        placeholder="--:--"
                        maxLength={5}
                        style={{
                          padding: '0.375rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          width: '50px',
                          textAlign: 'center',
                          color: (giorno.turno1.dalle && giorno.turno1.dalle !== '00:00') ? '#7cfc00' : '#9ca3af'
                        }}
                      />
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <input
                        type="text"
                        value={giorno.turno1.alle || ''}
                        onChange={(e) => handleTurnoChange(index, 'turno1', 'alle', e.target.value)}
                        placeholder="--:--"
                        maxLength={5}
                        style={{
                          padding: '0.375rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          width: '50px',
                          textAlign: 'center',
                          color: (giorno.turno1.alle && giorno.turno1.alle !== '00:00') ? '#7cfc00' : '#9ca3af'
                        }}
                      />
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <input
                        type="text"
                        value={giorno.turno2.dalle || ''}
                        onChange={(e) => handleTurnoChange(index, 'turno2', 'dalle', e.target.value)}
                        placeholder="--:--"
                        maxLength={5}
                        style={{
                          padding: '0.375rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          width: '50px',
                          textAlign: 'center',
                          color: (giorno.turno2.dalle && giorno.turno2.dalle !== '00:00') ? '#7cfc00' : '#9ca3af'
                        }}
                      />
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <input
                        type="text"
                        value={giorno.turno2.alle || ''}
                        onChange={(e) => handleTurnoChange(index, 'turno2', 'alle', e.target.value)}
                        placeholder="--:--"
                        maxLength={5}
                        style={{
                          padding: '0.375rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          width: '50px',
                          textAlign: 'center',
                          color: (giorno.turno2.alle && giorno.turno2.alle !== '00:00') ? '#7cfc00' : '#9ca3af'
                        }}
                      />
                    </td>
                    <td style={{ padding: '0.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#1e40af' }}>
                      {giorno.totaleGiorno.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <td style={{ padding: '0.5rem', fontSize: '0.75rem', fontWeight: '600' }} colSpan={5}>
                    <strong>Totale Settimanale:</strong>
                  </td>
                  <td style={{ padding: '0.5rem', fontSize: '0.75rem', fontWeight: '600', color: totaleSettimanale <= oreSettimanaliPartTime ? '#059669' : '#dc2626' }}>
                    <strong>{Math.round(totaleSettimanale * 100) / 100} h</strong>
                  </td>
                </tr>
              </tfoot>
            </table>

            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '1rem' }}>
              <strong>Istruzioni:</strong> Inserisci gli orari per ogni giorno (formato HH:MM).
              Puoi configurare due turni per giorno. Il totale non può superare le ore part-time.
            </p>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleSalvaOrari}
                disabled={savingOrari || totaleSettimanale > oreSettimanaliPartTime || oreSettimanaliPartTime <= 0}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: (totaleSettimanale > oreSettimanaliPartTime || oreSettimanaliPartTime <= 0) 
                    ? '#9ca3af' 
                    : (savingOrari ? '#6b7280' : '#2563eb'),
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: (totaleSettimanale > oreSettimanaliPartTime || oreSettimanaliPartTime <= 0 || savingOrari) 
                    ? 'not-allowed' 
                    : 'pointer'
                }}
              >
                {savingOrari ? 'Salvataggio...' : 
                 (totaleSettimanale > oreSettimanaliPartTime || oreSettimanaliPartTime <= 0) 
                   ? '⚠️ Dati non validi' 
                   : 'Salva Configurazione Orari'}
              </button>
            </div>
          </div>
        )}

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
