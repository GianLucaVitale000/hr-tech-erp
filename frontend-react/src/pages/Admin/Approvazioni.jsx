import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPresenzeInAttesa, getMesiApprovati, aggiornaStatoMese } from '../../services/presenzeService'

function Approvazioni() {
  const [mesi, setMesi] = useState([])
  const [mesiApprovati, setMesiApprovati] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingApprovati, setLoadingApprovati] = useState(true)
  const [meseSelezionato, setMeseSelezionato] = useState('')
  const navigate = useNavigate()

  const [refreshKey, setRefreshKey] = useState(0)

  const NOMI_MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']

useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setLoading(true)
  getPresenzeInAttesa()
    .then((res) => setMesi(res.data))
    .finally(() => setLoading(false))
}, [refreshKey])

useEffect(() => {
  const fetchMesiApprovati = async () => {
    setLoadingApprovati(true)
    try {
      const res = await getMesiApprovati()
      const dati = Array.isArray(res?.data) ? res.data : []
      setMesiApprovati(dati)
      if (dati.length > 0) {
        setMeseSelezionato(`${dati[0].mese}-${dati[0].anno}`)
      } else {
        setMeseSelezionato('')
      }
    } catch (err) {
      console.error('Errore caricamento mesi approvati:', err)
      setMesiApprovati([])
      setMeseSelezionato('')
    } finally {
      setLoadingApprovati(false)
    }
  }
  fetchMesiApprovati()
}, [refreshKey])

const caricaMesi = () => setRefreshKey((k) => k + 1)

  const handleAzione = async (m, stato) => {
    await aggiornaStatoMese(m.dipendente_id, m.mese, m.anno, stato)
    caricaMesi()
  }

  const handleExport = async (m, a) => {
    const response = await fetch(`http://localhost:8001/export/paghe?mese=${m}&anno=${a}`)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const aElement = document.createElement('a')
    aElement.href = url
    aElement.download = `paghe_${m}_${a}.xlsx`
    aElement.click()
    window.URL.revokeObjectURL(url)
}

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
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

      <h1 style={{ margin: '0 0 2rem 0' }}>Approvazione Fogli Ore</h1>

      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}>
          <button
            onClick={() => {
              const oggi = new Date()
              handleExport(oggi.getMonth() + 1, oggi.getFullYear())
            }}
            style={{
              padding: '0.6rem 1.2rem',
              backgroundColor: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            📊 Export Excel Paghe (Mese Corrente)
          </button>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <select
            value={meseSelezionato}
            onChange={(e) => setMeseSelezionato(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px' }}
            disabled={loadingApprovati}
          >
            {mesiApprovati
              .filter(ma => ma && ma.mese && ma.anno)
              .map((ma) => (
                <option key={`${ma.mese}-${ma.anno}`} value={`${ma.mese}-${ma.anno}`}>
                  {NOMI_MESI[parseInt(ma.mese) - 1]} {ma.anno}
                </option>
              ))}
          </select>
          <button
            onClick={() => {
              if (meseSelezionato) {
                const [m, a] = meseSelezionato.split('-')
                handleExport(parseInt(m), parseInt(a))
              }
            }}
            style={{
              padding: '0.6rem 1.2rem',
              backgroundColor: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            disabled={!meseSelezionato || loadingApprovati}
          >
            📊 Export Excel Paghe ({meseSelezionato ? NOMI_MESI[parseInt(meseSelezionato.split('-')[0]) - 1] || meseSelezionato : '...'})
          </button>
          </div>
        </div>
      </div>

      {loading ? (
        <p>Caricamento...</p>
      ) : mesi.length === 0 ? (
        <p>Nessun mese in attesa di approvazione.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem' }}>Dipendente</th>
              <th style={{ padding: '0.75rem' }}>Mese</th>
              <th style={{ padding: '0.75rem' }}>Giorni Inviati</th>
              <th style={{ padding: '0.75rem' }}>Ore Ordinarie</th>
              <th style={{ padding: '0.75rem' }}>Straordinari</th>
              <th style={{ padding: '0.75rem' }}>Stato</th>
              <th style={{ padding: '0.75rem' }}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {mesi.map((m, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td
                  style={{ padding: '0.75rem', cursor: 'pointer', color: '#2563eb', textDecoration: 'underline' }}
                  onClick={() => navigate(`/admin/approvazioni/${m.dipendente_id}/${m.mese}/${m.anno}`)}
                >
                  {m.dipendente_nome}
                </td>
                <td style={{ padding: '0.75rem' }}>{m.mese}/{m.anno}</td>
                <td style={{ padding: '0.75rem' }}>{m.totale_giorni}</td>
                <td style={{ padding: '0.75rem' }}>{m.totale_ore_ordinarie}</td>
                <td style={{ padding: '0.75rem' }}>{m.totale_ore_straordinarie}</td>
                <td style={{ padding: '0.75rem' }}>
                  <span style={{
                    padding: '0.25rem 0.6rem',
                    borderRadius: '12px',
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    fontSize: '0.85rem'
                  }}>
                    Da approvare
                  </span>
                </td>
                <td style={{ padding: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleAzione(m, 'approvato')}
                    style={{
                      padding: '0.4rem 0.8rem',
                      backgroundColor: '#16a34a',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    ✓ Approva
                  </button>
                  <button
                    onClick={() => handleAzione(m, 'rifiutato')}
                    style={{
                      padding: '0.4rem 0.8rem',
                      backgroundColor: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    ✕ Rifiuta
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default Approvazioni
