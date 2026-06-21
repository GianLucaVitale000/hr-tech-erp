import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDipendenti } from '../../services/dipendentiService'

function Dipendenti() {
  const [dipendenti, setDipendenti] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getDipendenti()
      .then((res) => setDipendenti(res.data))
      .catch(() => console.error('Errore nel caricamento dipendenti'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Anagrafica Dipendenti</h1>
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

      {loading ? (
        <p>Caricamento...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem' }}>Nome</th>
              <th style={{ padding: '0.75rem' }}>Email</th>
              <th style={{ padding: '0.75rem' }}>Codice Fiscale</th>
              <th style={{ padding: '0.75rem' }}>Mansione</th>
              <th style={{ padding: '0.75rem' }}>Contratto</th>
              <th style={{ padding: '0.75rem' }}>Data Assunzione</th>
            </tr>
          </thead>
          <tbody>
            {dipendenti.map((d) => (
              <tr key={d.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.75rem' }}>{d.user?.name}</td>
                <td style={{ padding: '0.75rem' }}>{d.user?.email}</td>
                <td style={{ padding: '0.75rem' }}>{d.codice_fiscale || '-'}</td>
                <td style={{ padding: '0.75rem' }}>{d.mansione || '-'}</td>
                <td style={{ padding: '0.75rem' }}>{d.contratto?.nome_contratto || '-'}</td>
                <td style={{ padding: '0.75rem' }}>{d.data_assunzione || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default Dipendenti
