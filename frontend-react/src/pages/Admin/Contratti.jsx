import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getContratti, deleteContratto } from '../../services/dipendentiService'

function Contratti() {
  const [contratti, setContratti] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const fetchContratti = () => {
    getContratti()
      .then((res) => setContratti(res.data))
      .catch(() => setError('Errore nel caricamento contratti'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchContratti()
  }, [])

  const handleDelete = async (id) => {
    if (window.confirm('Sei sicuro di voler eliminare questo contratto?')) {
      try {
        await deleteContratto(id)
        fetchContratti()
      } catch {
        setError('Errore durante l\'eliminazione')
      }
    }
  }

  return (
    <div style={{ padding: '1.5rem', fontFamily: 'sans-serif' }}>
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
          <h1 style={{ margin: 0 }}>Gestione CCNL</h1>
          <button
            onClick={() => navigate('/admin/contratti/nuovo')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            + Nuovo Contratto
          </button>
        </div>
      </div>

      {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}

      {loading ? (
        <p>Caricamento...</p>
      ) : contratti.length === 0 ? (
        <p style={{ color: '#6b7280' }}>Nessun contratto trovato. Crea il primo contratto.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', textAlign: 'center' }}>
                <th style={{ padding: '0.75rem' }}>Nome Contratto</th>
                <th style={{ padding: '0.75rem' }}>Codice CNEL</th>
                <th style={{ padding: '0.75rem' }}>Ore Settimanali</th>
                <th style={{ padding: '0.75rem' }}>Limite Straord. Mensile</th>
                <th style={{ padding: '0.75rem' }}>Soglia Magg. 1</th>
                <th style={{ padding: '0.75rem' }}>Soglia Magg. 2</th>
                <th style={{ padding: '0.75rem' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {contratti.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.75rem' }}><strong>{c.nome_contratto}</strong></td>
                  <td style={{ padding: '0.75rem' }}>{c.codice_cnel || '-'}</td>
                  <td style={{ padding: '0.75rem' }}>{c.ore_settimanali_teoriche}</td>
                  <td style={{ padding: '0.75rem' }}>{c.limite_straordinario_mensile || '-'}</td>
                  <td style={{ padding: '0.75rem' }}>{c.soglia_maggiorazione_1 || '-'}</td>
                  <td style={{ padding: '0.75rem' }}>{c.soglia_maggiorazione_2 || '-'}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <button
                      onClick={() => navigate(`/admin/contratti/${c.id}/edit`)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        marginBottom: '0.25rem',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginRight: '0.5rem',
                        fontSize: '0.875rem'
                      }}
                    >
                      Modifica
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        marginTop: '0.25rem',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      Elimina
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

export default Contratti
