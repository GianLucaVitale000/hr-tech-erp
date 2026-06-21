import { useEffect, useState } from 'react'
import { getMioProfilo } from '../../services/dipendentiService'
import { getPresenze, salvaPresenza, inviaMese } from '../../services/presenzeService'

const CAUSALI = [
  { value: 'lavoro', label: '-- Nessuna --' },
  { value: 'ferie', label: 'Ferie' },
  { value: 'permesso_rol', label: 'Permesso/ROL' },
  { value: 'malattia', label: 'Malattia' },
  { value: 'maternita', label: 'Maternità' },
  { value: 'infortunio', label: 'Infortunio' },
  { value: 'assemblea', label: 'Assemblea' },
]

function getGiorniDelMese(mese, anno) {
  return new Date(anno, mese, 0).getDate()
}

function RigaGiorno({ giorno, riga, onChange, onSalva, salvando, salvato }) {
  return (
    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
      <td style={{ padding: '0.5rem' }}>{giorno}</td>

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
          onChange={(e) => onChange({ ...riga, causale: e.target.value })}
          style={{ padding: '0.25rem' }}
        >
          {CAUSALI.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
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

function Timesheet() {
  const oggi = new Date()
  const [mese] = useState(oggi.getMonth() + 1)
  const [anno] = useState(oggi.getFullYear())
  const [dipendente, setDipendente] = useState(null)
  const [righe, setRighe] = useState({})
  const [statoSalvataggio, setStatoSalvataggio] = useState({})
  const [loading, setLoading] = useState(true)
  const [messaggio, setMessaggio] = useState('')

  useEffect(() => {
    getMioProfilo().then((res) => {
      setDipendente(res.data)
      getPresenze(res.data.id, mese, anno).then((res2) => {
        const mappa = {}
        res2.data.forEach((p) => {
          mappa[p.data] = {
            ore_ordinarie: p.ore_ordinarie || 0,
            ore_straordinarie: p.ore_straordinarie || 0,
            ore_causale: p.ore_causale || 0,
            causale: p.causale || 'lavoro',
          }
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

  const getRiga = (dataStr) =>
    righe[dataStr] || { ore_ordinarie: 0, ore_straordinarie: 0, ore_causale: 0, causale: 'lavoro' }

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
    }

    await salvaPresenza(payload)

    setStatoSalvataggio((prev) => ({ ...prev, [dataStr]: 'salvato' }))
    setTimeout(() => {
      setStatoSalvataggio((prev) => ({ ...prev, [dataStr]: null }))
    }, 1500)
  }

  const handleInvia = async () => {
    await inviaMese(dipendente.id, mese, anno)
    setMessaggio('✅ Mese inviato per approvazione!')
  }

  if (loading) return <p style={{ padding: '2rem' }}>Caricamento...</p>

  // Totali calcolati in tempo reale dai valori digitati (anche non salvati)
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
                riga={riga}
                onChange={(nuovaRiga) => handleChange(dataStr, nuovaRiga)}
                onSalva={() => handleSalva(dataStr)}
                salvando={stato === 'salvando'}
                salvato={stato === 'salvato'}
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
    </div>
  )
}

export default Timesheet
