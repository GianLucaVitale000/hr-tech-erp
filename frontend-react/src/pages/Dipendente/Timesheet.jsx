import { useEffect, useState } from 'react'
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
  onApriModaleMalattia, onUploadTrasferta, onUploadInfortunio
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
          max="8"
          step="1"
          value={riga.ore_ordinarie}
          onChange={(e) => onChange({ ...riga, ore_ordinarie: e.target.value })}
          style={{ width: '60px', padding: '0.25rem' }}
        />
      </td>

      <td style={{ padding: '0.5rem' }}>
        <input
          type="number"
          min="0"
          max="4"
          step="1"
          value={riga.ore_straordinarie}
          onChange={(e) => onChange({ ...riga, ore_straordinarie: e.target.value })}
          style={{ width: '60px', padding: '0.25rem' }}
        />
      </td>

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
              /> Smart Working
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
  const oggi = new Date()
  const [mese] = useState(oggi.getMonth() + 1)
  const [anno] = useState(oggi.getFullYear())
  const [dipendente, setDipendente] = useState(null)
  const [righe, setRighe] = useState({})
  const [statoSalvataggio, setStatoSalvataggio] = useState({})
  const [loading, setLoading] = useState(true)
  const [messaggio, setMessaggio] = useState('')
  const [modaleMalattiaGiorno, setModaleMalattiaGiorno] = useState(null)

  const normalizzaRiga = (p = {}) => ({
  ore_ordinarie: p.ore_ordinarie || 0,
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
})

useEffect(() => {
  getMioProfilo().then((res) => {
    setDipendente(res.data)
    getPresenze(res.data.id, mese, anno).then((res2) => {
      const mappa = {}
      res2.data.forEach((p) => {
        mappa[p.data] = normalizzaRiga(p)
      })
      setRighe(mappa)
      setLoading(false)
    })
  })
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])

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

    const riga = getRiga(dataStr)
    const payload = {
      dipendente_id: dipendente.id,
      data: dataStr,
      ore_ordinarie: parseInt(riga.ore_ordinarie) || 0,
      ore_straordinarie: parseInt(riga.ore_straordinarie) || 0,
      ore_causale: parseInt(riga.ore_causale) || 0,
      causale: riga.causale,
      modalita_lavoro: riga.modalita_lavoro,
    }

    const res = await salvaPresenza(payload)
    setRighe((prev) => ({ ...prev, [dataStr]: normalizzaRiga(res.data) }))

    setStatoSalvataggio((prev) => ({ ...prev, [dataStr]: 'salvato' }))
    setTimeout(() => {
      setStatoSalvataggio((prev) => ({ ...prev, [dataStr]: null }))
    }, 1500)
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
    await inviaMese(dipendente.id, mese, anno)
    setMessaggio('✅ Mese inviato per approvazione!')
  }

  if (loading) return <p style={{ padding: '2rem' }}>Caricamento...</p>

  const totaleOrdinarie = Object.values(righe).reduce(
    (acc, r) => acc + (parseInt(r.ore_ordinarie) || 0), 0
  )
  const totaleStraordinarie = Object.values(righe).reduce(
    (acc, r) => acc + (parseInt(r.ore_straordinarie) || 0), 0
  )

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Foglio Presenze - {mese}/{anno}</h1>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '6px' }}>
          <strong>Ore Ordinarie:</strong> {totaleOrdinarie}
        </div>
        <div style={{ padding: '1rem', backgroundColor: '#fef3c7', borderRadius: '6px' }}>
          <strong>Straordinari:</strong> {totaleStraordinarie}
        </div>
      </div>

      {messaggio && <p style={{ color: 'green' }}>{messaggio}</p>}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f3f4f6', textAlign: 'left' }}>
            <th style={{ padding: '0.5rem' }}>Giorno</th>
            <th style={{ padding: '0.5rem' }}>Ore Ordinarie</th>
            <th style={{ padding: '0.5rem' }}>Ore Straordinarie</th>
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
              />
            )
          })}
        </tbody>
      </table>

      <button
        onClick={handleInvia}
        style={{
          marginTop: '1.5rem',
          padding: '0.75rem 1.5rem',
          backgroundColor: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Invia al Manager
      </button>

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