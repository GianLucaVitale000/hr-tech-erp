import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMioProfilo } from '../../services/dipendentiService'
import {
  getPresenze,
  salvaPresenza,
  inviaMese,
  registraMalattia,
  uploadGiustificativoTrasferta,
  uploadGiustificativoInfortunio,
} from '../../services/presenzeService'

const CAUSALI = [
  { value: 'lavoro', label: '-- Nessuna --' },
  { value: 'ferie', label: 'Ferie' },
  { value: 'permesso_rol', label: 'Permesso/ROL' },
  { value: 'malattia', label: 'Malattia' },
  { value: 'maternita', label: 'Maternità' },
  { value: 'infortunio', label: 'Infortunio' },
  { value: 'assemblea', label: 'Assemblea' },
]

const GIORNI_SETTIMANA = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

const CAUSALI_CON_MODALITA = ['lavoro']

function getGiorniDelMese(mese, anno) {
  return new Date(anno, mese, 0).getDate()
}

function getNomeGiornoSettimana(anno, mese, giorno) {
  const data = new Date(anno, mese - 1, giorno)
  return GIORNI_SETTIMANA[data.getDay()]
}

function formattaData(dataIso) {
  if (!dataIso) return ''
  const [anno, mese, giorno] = dataIso.split('-')
  return `${giorno}/${mese}/${anno}`
}

function RigaGiorno({
  giorno, nomeGiorno, riga, onChange, onSalva, salvando, salvato,
  onApriModaleMalattia, onUploadTrasferta, onUploadInfortunio, isFullTime = false
}) {
  const mostraModalita = CAUSALI_CON_MODALITA.includes(riga.causale)
  const isMalattia = riga.causale === 'malattia'
  const isInfortunio = riga.causale === 'infortunio'
  const isTrasferta = riga.modalita_lavoro === 'trasferta'

  const handleCausaleChange = (nuovaCausale) => {
    if (nuovaCausale === 'malattia') {
      onApriModaleMalattia(giorno)
      return
    }
    onChange({ ...riga, causale: nuovaCausale, modalita_lavoro: null })
  }

  return (
    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
      <td style={{ padding: '0.5rem' }}>
        {giorno} <span style={{ opacity: 0.7 }}>({nomeGiorno})</span>
      </td>

      <td style={{ padding: '0.5rem' }}>
        <input
          type="number"
          min="0"
          step="0.25"
          value={riga.ore_ordinarie}
          onChange={(e) => onChange({ ...riga, ore_ordinarie: e.target.value })}
          style={{ width: '60px', padding: '0.25rem' }}
        />
      </td>

      {!isFullTime && (
        <td style={{ padding: '0.5rem' }}>
          <input
            type="number"
            min="0"
            step="0.25"
            value={riga.ore_eccedenti}
            onChange={(e) => onChange({ ...riga, ore_eccedenti: e.target.value })}
            style={{ width: '60px', padding: '0.25rem' }}
            title="Ore eccedenti (oltre il limite ordinario del giorno)"
          />
        </td>
      )}

      {isFullTime && (
        <td style={{ padding: '0.5rem' }}>
          <input
            type="number"
            min="0"
            step="0.25"
            value={riga.ore_straordinarie}
            onChange={(e) => onChange({ ...riga, ore_straordinarie: e.target.value })}
            style={{ width: '60px', padding: '0.25rem' }}
          />
          {riga.ore_straordinarie > 4 && (
            <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.25rem' }}>
              Attenzione: superato limite consigliato di straordinario giornaliero
            </div>
          )}
        </td>
      )}

      <td style={{ padding: '0.5rem' }}>
        <select
          value={riga.causale}
          onChange={(e) => handleCausaleChange(e.target.value)}
          style={{ padding: '0.25rem' }}
        >
          {CAUSALI.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        {isMalattia && riga.protocollo_malattia && (
          <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.25rem' }}>
            Prot. {riga.protocollo_malattia}<br/>
            Dal {formattaData(riga.data_inizio_malattia)} al {formattaData(riga.data_fine_malattia)}
          </div>
        )}

        {isInfortunio && (
          <div style={{ marginTop: '0.4rem' }}>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => onUploadInfortunio(giorno, e.target.files[0])}
              style={{ fontSize: '0.75rem', width: '160px' }}
            />
            {riga.giustificativo_infortunio_path && (
              <div style={{ fontSize: '0.75rem', color: '#16a34a' }}>✓ Allegato caricato</div>
            )}
          </div>
        )}
      </td>

      <td style={{ padding: '0.5rem' }}>
        <input
          type="number"
          min="0"
          max="8"
          step="1"
          value={riga.ore_causale}
          onChange={(e) => onChange({ ...riga, ore_causale: e.target.value })}
          style={{ width: '60px', padding: '0.25rem' }}
        />
      </td>

      <td style={{ padding: '0.5rem' }}>
        {mostraModalita && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.85rem' }}>
            <label>
              <input
                type="radio"
                name={`modalita-${giorno}`}
                checked={riga.modalita_lavoro === 'in_sede'}
                onChange={() => onChange({ ...riga, modalita_lavoro: 'in_sede' })}
              /> In sede
            </label>
            <label>
              <input
                type="radio"
                name={`modalita-${giorno}`}
                checked={riga.modalita_lavoro === 'smart_working'}
                onChange={() => onChange({ ...riga, modalita_lavoro: 'smart_working' })}
              /> SW
            </label>
            <label>
              <input
                type="radio"
                name={`modalita-${giorno}`}
                checked={riga.modalita_lavoro === 'trasferta'}
                onChange={() => onChange({ ...riga, modalita_lavoro: 'trasferta' })}
              /> Trasferta
            </label>

            {isTrasferta && (
              <div style={{ marginTop: '0.3rem' }}>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => onUploadTrasferta(giorno, e.target.files[0])}
                  style={{ fontSize: '0.75rem', width: '160px' }}
                />
                {riga.giustificativo_trasferta_path && (
                  <div style={{ fontSize: '0.75rem', color: '#16a34a' }}>✓ Allegato caricato</div>
                )}
              </div>
            )}
          </div>
        )}
      </td>

      <td style={{ padding: '0.5rem' }}>
        <button
          onClick={onSalva}
          disabled={salvando}
          style={{
            padding: '0.25rem 0.75rem',
            backgroundColor: salvato ? '#16a34a' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.85rem'
          }}
        >
          {salvando ? '...' : salvato ? '✓ Salvato' : 'Salva'}
        </button>
      </td>
    </tr>
  )
}

function ModaleMalattia({ dataInizio, onConferma, onAnnulla }) {
  const [dataFine, setDataFine] = useState(dataInizio)
  const [protocollo, setProtocollo] = useState('')

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{ backgroundColor: '#1f2937', padding: '1.5rem', borderRadius: '8px', width: '360px' }}>
        <h3 style={{ marginTop: 0 }}>Registra periodo di malattia</h3>

        <div style={{ marginBottom: '1rem' }}>
          <label>Dal</label>
          <input type="date" value={dataInizio} disabled style={{ display: 'block', width: '100%', padding: '0.4rem' }} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Al</label>
          <input
            type="date"
            value={dataFine}
            min={dataInizio}
            onChange={(e) => setDataFine(e.target.value)}
            style={{ display: 'block', width: '100%', padding: '0.4rem' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label>Numero protocollo certificato</label>
          <input
            type="text"
            value={protocollo}
            onChange={(e) => setProtocollo(e.target.value)}
            placeholder="es. INPS-2026-XXXXX"
            style={{ display: 'block', width: '100%', padding: '0.4rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button onClick={onAnnulla} style={{ padding: '0.5rem 1rem', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Annulla
          </button>
          <button
            onClick={() => onConferma(dataFine, protocollo)}
            disabled={!protocollo}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Conferma
          </button>
        </div>
      </div>
    </div>
  )
}

function Timesheet() {
  const navigate = useNavigate()
  const oggi = new Date()
  const [mese, setMese] = useState(oggi.getMonth() + 1)
  const [anno, setAnno] = useState(oggi.getFullYear())
  const [dipendente, setDipendente] = useState(null)
  const [righe, setRighe] = useState({})
  const [statoSalvataggio, setStatoSalvataggio] = useState({})
  const [loading, setLoading] = useState(true)
  const [messaggio, setMessaggio] = useState('')
  const [errore, setErrore] = useState('')
  const [modaleMalattiaGiorno, setModaleMalattiaGiorno] = useState(null)
  const [statoFoglio, setStatoFoglio] = useState(null)

  const NOMI_MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']

  const normalizzaRiga = (p = {}) => ({
  ore_ordinarie: p.ore_ordinarie || 0,
  ore_eccedenti: p.ore_eccedenti || 0,
  ore_straordinarie: p.ore_straordinarie || 0,
  ore_causale: p.ore_causale || 0,
  causale: p.causale || 'lavoro',
  modalita_lavoro: p.modalita_lavoro || null,
  giustificativo_trasferta_path: p.giustificativo_trasferta_path || null,
  giustificativo_infortunio_path: p.giustificativo_infortunio_path || null,
  protocollo_malattia: p.protocollo_malattia || null,
  data_inizio_malattia: p.data_inizio_malattia || null,
  data_fine_malattia: p.data_fine_malattia || null,
  id: p.id || null,
  warning: p.warning || null,
})

useEffect(() => {
  getMioProfilo().then((res) => {
    setDipendente(res.data)
  })
}, [])

useEffect(() => {
  if (dipendente) {
    const fetchPresenze = async () => {
      setLoading(true)
      const res = await getPresenze(dipendente.id, mese, anno)
      const mappa = {}
      let statoDelMese = null
      res.data.forEach((p) => {
        mappa[p.data] = normalizzaRiga(p)
        if (p.stato) {
          statoDelMese = p.stato
        }
      })
      setRighe(mappa)
      setStatoFoglio(statoDelMese)
      setLoading(false)
    }
    fetchPresenze()
  }
}, [dipendente, mese, anno])

  const giorni = Array.from(
    { length: getGiorniDelMese(mese, anno) },
    (_, i) => i + 1
  )

  const getDataStr = (giorno) =>
    `${anno}-${String(mese).padStart(2, '0')}-${String(giorno).padStart(2, '0')}`

  const getRiga = (dataStr) => righe[dataStr] || normalizzaRiga()

  const handleChange = (dataStr, nuovaRiga) => {
    setRighe((prev) => ({ ...prev, [dataStr]: nuovaRiga }))
  }

  const handleSalva = async (dataStr) => {
    setStatoSalvataggio((prev) => ({ ...prev, [dataStr]: 'salvando' }))
    setErrore('')

    try {
      const riga = getRiga(dataStr)
      // Per part-time, non inviare ore_eccedenti in modo che il backend possa calcolarlo
      const payload = {
        dipendente_id: dipendente.id,
        data: dataStr,
        ore_ordinarie: parseFloat(riga.ore_ordinarie) || 0,
        ore_straordinarie: parseFloat(riga.ore_straordinarie) || 0,
        ore_causale: parseFloat(riga.ore_causale) || 0,
        causale: riga.causale,
        modalita_lavoro: riga.modalita_lavoro,
      }
      // Invia anche supplementari, ma il backend per part-time lo sovrascriverà
      if (isFullTime) {
        payload.ore_eccedenti = parseFloat(riga.ore_eccedenti) || 0;
      }

      const res = await salvaPresenza(payload)
      // Ricarica tutte le presenze per avere i dati aggiornati dal backend
      const resPresenze = await getPresenze(dipendente.id, mese, anno)
      const mappa = {}
      resPresenze.data.forEach((p) => {
        mappa[p.data] = normalizzaRiga(p)
      })
      setRighe(mappa)

      setStatoSalvataggio((prev) => ({ ...prev, [dataStr]: 'salvato' }))
      setTimeout(() => {
        setStatoSalvataggio((prev) => ({ ...prev, [dataStr]: null }))
      }, 1500)
    } catch (error) {
      setStatoSalvataggio((prev) => ({ ...prev, [dataStr]: null }))
      const errorMessage = error.response?.data?.message || 
                           error.response?.data?.error ||
                           'Errore nel salvataggio. Verifica i dati inseriti.'
      setErrore(errorMessage)
      setTimeout(() => setErrore(''), 5000)
    }
  }

  const handleApriModaleMalattia = (giorno) => {
    setModaleMalattiaGiorno(giorno)
  }

  const handleConfermaMalattia = async (dataFine, protocollo) => {
    const dataInizioStr = getDataStr(modaleMalattiaGiorno)
    await registraMalattia(dipendente.id, dataInizioStr, dataFine, protocollo)
    setModaleMalattiaGiorno(null)

    const res = await getPresenze(dipendente.id, mese, anno)
    const mappa = {}
    res.data.forEach((p) => {
      mappa[p.data] = normalizzaRiga(p)
    })
    setRighe(mappa)
  }

  const handleUploadTrasferta = async (giorno, file) => {
    const dataStr = getDataStr(giorno)
    const riga = getRiga(dataStr)
    if (!riga.id) {
      alert('Salva prima la riga prima di caricare il giustificativo.')
      return
    }
    const res = await uploadGiustificativoTrasferta(riga.id, file)
    setRighe((prev) => ({ ...prev, [dataStr]: normalizzaRiga(res.data) }))
  }

  const handleUploadInfortunio = async (giorno, file) => {
    const dataStr = getDataStr(giorno)
    const riga = getRiga(dataStr)
    if (!riga.id) {
      alert('Salva prima la riga prima di caricare il giustificativo.')
      return
    }
    const res = await uploadGiustificativoInfortunio(riga.id, file)
    setRighe((prev) => ({ ...prev, [dataStr]: normalizzaRiga(res.data) }))
  }

  const handleInvia = async () => {
    try {
      await inviaMese(dipendente.id, mese, anno)
      // Ricarica le presenze per ottenere lo stato aggiornato (inviato o reinviato)
      const res = await getPresenze(dipendente.id, mese, anno)
      const nuovoStato = res.data[0]?.stato || 'inviato'
      setStatoFoglio(nuovoStato)
      setMessaggio('✅ Mese inviato per approvazione!')
      setErrore('')
    } catch (error) {
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message ||
                          'Errore durante l\'invio. Riprova.'
      setErrore(errorMessage)
      setTimeout(() => setErrore(''), 8000)
    }
  }

  if (loading) return <p style={{ padding: '2rem' }}>Caricamento...</p>

  // Determina se il dipendente è full-time (gestisce sia numero che stringa)
  const isFullTime = Number(dipendente?.percentuale_part_time) === 100;

  const totaleOrdinarie = Object.values(righe).reduce(
    (acc, r) => acc + (parseInt(r.ore_ordinarie) || 0), 0
  )
  const totaleEccedenti = Object.values(righe).reduce(
    (acc, r) => acc + (parseInt(r.ore_eccedenti) || 0), 0
  )
  const totaleStraordinarie = Object.values(righe).reduce(
    (acc, r) => acc + (parseInt(r.ore_straordinarie) || 0), 0
  )
  
  // Nuovi contatori
  const totaleFeriePermessi = Object.values(righe).reduce(
    (acc, r) => acc + (r.causale === 'ferie' || r.causale === 'permesso_rol' ? (parseInt(r.ore_causale) || 0) : 0), 0
  )
  const totaleOreINPS = Object.values(righe).reduce(
    (acc, r) => acc + (r.causale === 'malattia' || r.causale === 'maternita' ? (parseInt(r.ore_causale) || 0) : 0), 0
  )
  const totaleOreINAIL = Object.values(righe).reduce(
    (acc, r) => acc + (r.causale === 'infortunio' ? (parseInt(r.ore_causale) || 0) : 0), 0
  )

  const handleMeseCorrente = () => {
    setMese(oggi.getMonth() + 1)
    setAnno(oggi.getFullYear())
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>Foglio Presenze - {NOMI_MESI[mese - 1]} {anno}</h1>
        <button
          onClick={() => navigate('/dipendente')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Dashboard
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <select
          value={mese}
          onChange={(e) => setMese(parseInt(e.target.value))}
          style={{ padding: '0.5rem', borderRadius: '4px' }}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>{NOMI_MESI[i]}</option>
          ))}
        </select>
        <select
          value={anno}
          onChange={(e) => setAnno(parseInt(e.target.value))}
          style={{ padding: '0.5rem', borderRadius: '4px' }}
        >
          {Array.from({ length: 5 }, (_, i) => {
            const y = oggi.getFullYear() - 2 + i
            return <option key={y} value={y}>{y}</option>
          })}
        </select>
        <button
          onClick={handleMeseCorrente}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Mese corrente
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#eff6ff', borderRadius: '6px', fontSize: '0.85rem' }}>
          <strong>Ore Ordinarie:</strong> {totaleOrdinarie}
        </div>
        {!isFullTime && (
          <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#fef3c7', borderRadius: '6px', fontSize: '0.85rem' }}>
            <strong>Ore Eccedenti:</strong> {totaleEccedenti}
          </div>
        )}
        {isFullTime && (
          <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#fef3c7', borderRadius: '6px', fontSize: '0.85rem' }}>
            <strong>Straordinari:</strong> {totaleStraordinarie}
          </div>
        )}
        <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#d1fae5', borderRadius: '6px', fontSize: '0.85rem' }}>
          <strong>Ferie/Permessi:</strong> {totaleFeriePermessi}
        </div>
        <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#fde68a', borderRadius: '6px', fontSize: '0.85rem' }}>
          <strong>Ore INPS:</strong> {totaleOreINPS}
        </div>
        <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#fca5a5', borderRadius: '6px', fontSize: '0.85rem' }}>
          <strong>Ore INAIL:</strong> {totaleOreINAIL}
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={handleInvia}
          disabled={statoFoglio === 'inviato' || statoFoglio === 'approvato' || statoFoglio === 'reinviato'}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: (statoFoglio === 'inviato' || statoFoglio === 'approvato' || statoFoglio === 'reinviato') ? '#93c5fd' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (statoFoglio === 'inviato' || statoFoglio === 'approvato' || statoFoglio === 'reinviato') ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem',
            display: 'block',
            margin: '0 auto'
          }}
          title={statoFoglio === 'approvato' ? 'Foglio già approvato. Non è possibile reinviare.' : 
                statoFoglio === 'reinviato' ? 'Foglio già reinviato. Attendere l\'approvazione.' :
                statoFoglio === 'inviato' ? 'Foglio già inviato. Attendere l\'approvazione.' : ''}
        >
          Invia al Manager
        </button>
      </div>

      {messaggio && <p style={{ color: 'green' }}>{messaggio}</p>}
      {errore && <p style={{ color: 'red' }}>{errore}</p>}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f3f4f6', textAlign: 'center' }}>
            <th style={{ padding: '0.5rem' }}>Giorno</th>
            <th style={{ padding: '0.5rem' }}>Ore Ordinarie</th>
            {!isFullTime && <th style={{ padding: '0.5rem' }}>Ore Eccedenti</th>}
            {isFullTime && <th style={{ padding: '0.5rem' }}>Ore Straordinarie</th>}
            <th style={{ padding: '0.5rem' }}>Causale</th>
            <th style={{ padding: '0.5rem' }}>Altro</th>
            <th style={{ padding: '0.5rem' }}>Modalità</th>
            <th style={{ padding: '0.5rem' }}></th>
          </tr>
        </thead>
        <tbody>
          {giorni.map((giorno) => {
            const dataStr = getDataStr(giorno)
            const riga = getRiga(dataStr)
            const stato = statoSalvataggio[dataStr]

            return (
              <RigaGiorno
                key={dataStr}
                giorno={giorno}
                nomeGiorno={getNomeGiornoSettimana(anno, mese, giorno)}
                riga={riga}
                onChange={(nuovaRiga) => handleChange(dataStr, nuovaRiga)}
                onSalva={() => handleSalva(dataStr)}
                salvando={stato === 'salvando'}
                salvato={stato === 'salvato'}
                onApriModaleMalattia={handleApriModaleMalattia}
                onUploadTrasferta={handleUploadTrasferta}
                onUploadInfortunio={handleUploadInfortunio}
                isFullTime={isFullTime}
              />
            )
          })}
        </tbody>
      </table>

      {modaleMalattiaGiorno && (
        <ModaleMalattia
          dataInizio={getDataStr(modaleMalattiaGiorno)}
          onConferma={handleConfermaMalattia}
          onAnnulla={() => setModaleMalattiaGiorno(null)}
        />
      )}
    </div>
  )
}

export default Timesheet