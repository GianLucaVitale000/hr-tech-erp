import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPresenzeInAttesa, aggiornaStatoMese } from '../../services/presenzeService'

function Approvazioni() {
  const [mesi, setMesi] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const [refreshKey, setRefreshKey] = useState(0)

useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setLoading(true)
  getPresenzeInAttesa()
    .then((res) => setMesi(res.data))
    .finally(() => setLoading(false))
}, [refreshKey])

const caricaMesi = () => setRefreshKey((k) => k + 1)

  const handleAzione = async (m, stato) => {
    await aggiornaStatoMese(m.dipendente_id, m.mese, m.anno, stato)
    caricaMesi()
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Approvazione Fogli Ore</h1>

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
