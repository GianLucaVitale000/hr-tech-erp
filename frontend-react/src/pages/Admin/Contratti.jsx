import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getContratti, getRegoleCalcolo, createRegolaCalcolo, updateRegolaCalcolo } from '../../services/dipendentiService'

function Contratti() {
  const [contratti, setContratti] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [currentContratto, setCurrentContratto] = useState(null)
  const [regolaForm, setRegolaForm] = useState({
    ore_settimanali_teoriche: 40,
    limite_straordinario_mensile: null
  })
  const [modalLoading, setModalLoading] = useState(false)
  const [regoleMap, setRegoleMap] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()

  const fetchContratti = () => {
    setLoading(true)
    Promise.all([
      getContratti(),
      getRegoleCalcolo()
    ]).then(([contrattiRes, regoleRes]) => {
      setContratti(contrattiRes.data)
      // Crea mappa contratto_id -> regola
      const map = {}
      regoleRes.data.forEach(r => {
        map[r.contratto_id] = r
      })
      setRegoleMap(map)
    }).catch(() => setError('Errore nel caricamento contratti'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchContratti()
  }, [])

  const openRegoleModal = (contratto) => {
    setCurrentContratto(contratto)
    const existingRegola = regoleMap[contratto?.id]
    // Converti 0 in null per coerenza
    const ore = existingRegola?.ore_settimanali_teoriche
    const limite = existingRegola?.limite_straordinario_mensile
    setRegolaForm({
      ore_settimanali_teoriche: !ore || parseFloat(ore) === 0 ? null : ore,
      limite_straordinario_mensile: !limite || parseFloat(limite) === 0 ? null : limite
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setCurrentContratto(null)
  }

  const handleRegolaChange = (e) => {
    const { name, value } = e.target
    setRegolaForm({ ...regolaForm, [name]: value === '' ? null : Number(value) })
  }

  const handleSaveRegola = async () => {
    if (!currentContratto) {
      setError('Seleziona un contratto')
      setModalLoading(false)
      return
    }
    
    setModalLoading(true)
    setError('')
    
    try {
      const regolaData = {
        ...regolaForm,
        contratto_id: currentContratto.id
      }
      
      const existingRegola = regoleMap[currentContratto.id]
      
      if (existingRegola) {
        await updateRegolaCalcolo(existingRegola.id, regolaData)
      } else {
        await createRegolaCalcolo(regolaData)
      }
      
      closeModal()
      await fetchContratti()
      setModalLoading(false)
    } catch (error) {
      setError('Errore durante il salvataggio delle regole di calcolo')
      setModalLoading(false)
      console.error('Salvataggio regola fallito:', error)
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
          <input
            type="text"
            placeholder="Cerca per codice o nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '0.875rem',
              width: '300px'
            }}
          />
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
                <th style={{ padding: '0.25rem', fontSize: '0.75rem' }}>Nome Contratto</th>
                <th style={{ padding: '0.25rem', fontSize: '0.75rem' }}>Codice CNEL</th>
                <th style={{ padding: '0.25rem', fontSize: '0.75rem' }}>Parte Datoriale</th>
                <th style={{ padding: '0.25rem', fontSize: '0.75rem' }}>Parte Sindacale</th>
                <th style={{ padding: '0.25rem', fontSize: '0.75rem' }}>Ore Settimanali</th>
                <th style={{ padding: '0.25rem', fontSize: '0.75rem' }}>Limite Straord. Mensile</th>
                <th style={{ padding: '0.25rem', fontSize: '0.75rem' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {contratti
                .filter(c => 
                  c.nome_contratto.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (c.codice_cnel || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                  JSON.stringify(c.partiDatorialiFirmatarie || []).toLowerCase().includes(searchTerm.toLowerCase()) ||
                  JSON.stringify(c.partiSindacaliFirmatarie || []).toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((c) => {
                  const regola = regoleMap[c.id]
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.25rem', fontSize: '0.75rem' }}><strong>{c.nome_contratto}</strong></td>
                      <td style={{ padding: '0.25rem', fontSize: '0.75rem' }}>{c.codice_cnel || '-'}</td>
                      <td style={{ padding: '0.25rem', fontSize: '0.75rem' }}>
                        {c.partiDatorialiFirmatarie ? 
                          (typeof c.partiDatorialiFirmatarie === 'string' 
                            ? (c.partiDatorialiFirmatarie.startsWith('[') 
                              ? JSON.parse(c.partiDatorialiFirmatarie).join(', ') 
                              : c.partiDatorialiFirmatarie)
                            : Array.isArray(c.partiDatorialiFirmatarie) 
                              ? c.partiDatorialiFirmatarie.join(', ') 
                              : c.partiDatorialiFirmatarie) 
                          : '-'}
                      </td>
                      <td style={{ padding: '0.25rem', fontSize: '0.75rem' }}>
                        {c.partiSindacaliFirmatarie ? 
                          (typeof c.partiSindacaliFirmatarie === 'string' 
                            ? (c.partiSindacaliFirmatarie.startsWith('[') 
                              ? JSON.parse(c.partiSindacaliFirmatarie).join(', ') 
                              : c.partiSindacaliFirmatarie)
                            : Array.isArray(c.partiSindacaliFirmatarie) 
                              ? c.partiSindacaliFirmatarie.join(', ') 
                              : c.partiSindacaliFirmatarie) 
                          : '-'}
                      </td>
                      <td style={{ padding: '0.25rem', fontSize: '0.75rem' }}>{Number(regola?.ore_settimanali_teoriche ?? c.ore_settimanali_teoriche) === 0 ? '-' : (regola?.ore_settimanali_teoriche ?? c.ore_settimanali_teoriche ?? '-')}</td>
                      <td style={{ padding: '0.25rem', fontSize: '0.75rem' }}>{Number(regola?.limite_straordinario_mensile ?? c.limite_straordinario_mensile) === 0 ? '-' : (regola?.limite_straordinario_mensile ?? c.limite_straordinario_mensile ?? '-')}</td>
                      <td style={{ padding: '0.25rem', fontSize: '0.75rem' }}>
                        <button
                          onClick={() => openRegoleModal(c)}
                          style={{
                            padding: '0.15rem 0.3rem',
                            backgroundColor: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.65rem'
                          }}
                        >
                          Regole
                        </button>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modale Regole di Calcolo */}
      {modalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#1f2937',
            padding: '2rem',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '80vh',
            overflowY: 'auto',
            color: 'white'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'white' }}>
                {currentContratto ? `Regole di Calcolo - ${currentContratto.nome_contratto}` : 'Nuove Regole di Calcolo'}
              </h2>
              <button
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#9ca3af'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#d1d5db' }}>
                Ore Settimanali Teoriche
              </label>
              <input
                type="number"
                name="ore_settimanali_teoriche"
                value={!regolaForm.ore_settimanali_teoriche ? '' : regolaForm.ore_settimanali_teoriche}
                onChange={handleRegolaChange}
                step="0.01"
                min="0"
                placeholder="Lascia vuoto per nessuna regola"
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #4b5563',
                  borderRadius: '4px',
                  backgroundColor: '#374151',
                  color: 'white'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#d1d5db' }}>
                Limite Straordinario Mensile (ore)
              </label>
              <input
                type="number"
                name="limite_straordinario_mensile"
                value={!regolaForm.limite_straordinario_mensile ? '' : regolaForm.limite_straordinario_mensile}
                onChange={handleRegolaChange}
                step="0.01"
                min="0"
                placeholder="Lascia vuoto per nessun limite"
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #4b5563',
                  borderRadius: '4px',
                  backgroundColor: '#374151',
                  color: 'white'
                }}
              />
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                Lascia vuoto per nessun limite
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={closeModal}
                disabled={modalLoading}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#4b5563',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Annulla
              </button>
              <button
                onClick={handleSaveRegola}
                disabled={modalLoading}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: modalLoading ? 'not-allowed' : 'pointer',
                  opacity: modalLoading ? 0.7 : 1
                }}
              >
                {modalLoading ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Contratti
