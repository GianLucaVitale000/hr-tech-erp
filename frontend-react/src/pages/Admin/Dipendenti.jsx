import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDipendenti } from '../../services/dipendentiService'

function Dipendenti() {
  const [dipendenti, setDipendenti] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const [year, month, day] = dateStr.split('-')
    return `${day}-${month}-${year}`
  }

  useEffect(() => {
    getDipendenti()
      .then((res) => setDipendenti(res.data))
      .catch(() => console.error('Errore nel caricamento dipendenti'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0 }}>Anagrafica Dipendenti</h1>
          <button
            onClick={() => navigate('/admin/dipendenti/nuovo')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            + Nuovo Dipendente
          </button>
        </div>
      </div>

      {loading ? (
        <p>Caricamento...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', textAlign: 'center' }}>
                <th style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>Nome</th>
                <th style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>Email</th>
                <th style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>CF</th>
                <th style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>Mansione</th>
                <th style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>Ore Sett.</th>
                <th style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>Livello</th>
                <th style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>CCNL</th>
                <th style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>% PT</th>
                <th style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>GG.</th>
                <th style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>Data</th>
                <th style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {dipendenti.map((d) => (
                <tr key={d.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>{d.user?.name}</td>
                  <td style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>{d.user?.email}</td>
                  <td style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>{d.codice_fiscale || '-'}</td>
                  <td style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>{d.mansione || '-'}</td>
                  <td style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>
                    {d.regola_calcolo?.ore_settimanali_teoriche !== null && d.regola_calcolo?.ore_settimanali_teoriche !== undefined ? (
                      d.regola_calcolo.ore_settimanali_teoriche
                    ) : (
                      d.contratto?.regole_calcolo?.[0]?.ore_settimanali_teoriche !== null && d.contratto?.regole_calcolo?.[0]?.ore_settimanali_teoriche !== undefined ? (
                        d.contratto.regole_calcolo[0].ore_settimanali_teoriche
                      ) : (
                        '40'
                      )
                    )}
                  </td>
                  <td style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>{d.livello || '-'}</td>
                  <td style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>{d.contratto?.codice_cnel || '-'}</td>
                  <td style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>
                    {d.percentuale_part_time ? `${d.percentuale_part_time}%` : '100%'}
                  </td>
                  <td style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>
                    {d.giorni_lavorativi_settimanali || '5'}
                  </td>
                  <td style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>{formatDate(d.data_assunzione)}</td>
                  <td style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>
                    <button
                      onClick={() => navigate(`/admin/dipendenti/${d.id}/edit`)}
                      style={{
                        padding: '0.15rem 0.3rem',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.7rem'
                      }}
                    >
                      Modifica
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default Dipendenti
