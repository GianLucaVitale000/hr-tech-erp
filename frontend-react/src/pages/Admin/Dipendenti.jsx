import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDipendenti } from '../../services/dipendentiService'

function Dipendenti() {
  const [dipendenti, setDipendenti] = useState([])
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const navigate = useNavigate()

  // Rileva se è mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    try {
      // Gestisce formato ISO completo: "2025-01-01T00:00:00.000000Z"
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return dateStr
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      return `${day}/${month}/${year}`
    } catch {
      return dateStr
    }
  }

  useEffect(() => {
    getDipendenti()
      .then((res) => setDipendenti(res.data))
      .catch(() => console.error('Errore nel caricamento dipendenti'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: '2.5rem', fontFamily: 'sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, lineHeight: '1.2' }}>Anagrafica Dipendenti</h1>
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
      ) : dipendenti.length === 0 ? (
        <p style={{ color: '#6b7280' }}>Nessun dipendente trovato.</p>
      ) : isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {dipendenti.map((d) => {
            const oreSettimanali = d.ore_settimanali !== null && d.ore_settimanali !== undefined && parseFloat(d.ore_settimanali) !== 0
              ? d.ore_settimanali
              : d.contratto?.ore_settimanali_teoriche !== null && parseFloat(d.contratto.ore_settimanali_teoriche) !== 0
              ? d.contratto.ore_settimanali_teoriche
              : '40'
            return (
              <div key={d.id} style={{ backgroundColor: '#374151', borderRadius: '8px', padding: '1rem', border: '1px solid #4b5563' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid #4b5563' }}>
                    <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Nome:</span>
                    <span style={{ color: 'white', fontSize: '0.95rem', fontWeight: '500' }}>{d.user?.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid #4b5563' }}>
                    <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>CF:</span>
                    <span style={{ color: 'white', fontSize: '0.95rem', fontWeight: '500' }}>{d.codice_fiscale || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid #4b5563' }}>
                    <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Mansione:</span>
                    <span style={{ color: 'white', fontSize: '0.95rem', fontWeight: '500' }}>{d.mansione || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid #4b5563' }}>
                    <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Ore Sett.:</span>
                    <span style={{ color: 'white', fontSize: '0.95rem', fontWeight: '500' }}>{oreSettimanali}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid #4b5563' }}>
                    <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Livello:</span>
                    <span style={{ color: 'white', fontSize: '0.95rem', fontWeight: '500' }}>{d.livello || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid #4b5563' }}>
                    <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>CCNL:</span>
                    <span style={{ color: 'white', fontSize: '0.95rem', fontWeight: '500' }}>{d.contratto?.codice_cnel || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid #4b5563' }}>
                    <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>% PT:</span>
                    <span style={{ color: 'white', fontSize: '0.95rem', fontWeight: '500' }}>{d.percentuale_part_time ? `${d.percentuale_part_time}%` : '100%'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid #4b5563' }}>
                    <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>GG.:</span>
                    <span style={{ color: 'white', fontSize: '0.95rem', fontWeight: '500' }}>{d.giorni_lavorativi_settimanali || '5'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                    <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Data Assunz.:</span>
                    <span style={{ color: 'white', fontSize: '0.95rem', fontWeight: '500' }}>{formatDate(d.data_assunzione)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  <button
                    onClick={() => navigate(`/admin/dipendenti/${d.id}/edit`)}
                    style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', flex: '1' }}
                  >
                    Modifica
                  </button>
                </div>
              </div> 
            )
          })}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', textAlign: 'center' }}>
                <th style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>Nome e Cognome</th>
                <th style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>CF</th>
                <th style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>Mansione</th>
                <th style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>Ore Sett.</th>
                <th style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>Liv.</th>
                <th style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>CCNL</th>
                <th style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>% PT</th>
                <th style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>GG.</th>
                <th style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>Data Assunz.</th>
                <th style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {dipendenti.map((d) => (
                <tr key={d.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>{d.user?.name}</td>
                  <td style={{ padding: '0.4rem', whiteSpace: 'nowrap', fontSize: '0.7rem' }}>{d.codice_fiscale || '-'}</td>
                  <td 
                    style={{ padding: '0.4rem', whiteSpace: 'nowrap', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.7rem' }}
                    title={!isMobile ? (d.mansione || '-') : undefined}
                  >
                    {d.mansione || '-'}
                  </td>
                  <td style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>
                    {d.ore_settimanali !== null && d.ore_settimanali !== undefined && parseFloat(d.ore_settimanali) !== 0 ? (
                      d.ore_settimanali
                    ) : d.contratto?.ore_settimanali_teoriche !== null && parseFloat(d.contratto.ore_settimanali_teoriche) !== 0 ? (
                      d.contratto.ore_settimanali_teoriche
                    ) : (
                      '40'
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
