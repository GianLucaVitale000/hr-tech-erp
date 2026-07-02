import { useState, useEffect, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { getContrattiAllVersions, getRegoleCalcolo, createRegolaCalcolo, updateRegolaCalcolo } from '../../services/dipendentiService'

function Contratti() {
  const [contratti, setContratti] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [currentContratto, setCurrentContratto] = useState(null)
  const [regolaForm, setRegolaForm] = useState({
    ore_settimanali_teoriche: 40
  })
  const [modalLoading, setModalLoading] = useState(false)
  const [regoleMap, setRegoleMap] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const [onlyMainUnions, setOnlyMainUnions] = useState(false)
  const [expandedCodes, setExpandedCodes] = useState({}) // { codice_cnel: true/false }
  const navigate = useNavigate()

  // Funzione per determinare il record principale di un gruppo
  const getMainContratto = (gruppo) => {
    const ordinati = [...gruppo].sort((a, b) => {
      if (!a.data_decorrenza && !b.data_decorrenza) return 0;
      if (!a.data_decorrenza) return 1;
      if (!b.data_decorrenza) return -1;
      return new Date(b.data_decorrenza) - new Date(a.data_decorrenza);
    });
    
    // Cerca il primo con Confcommercio + almeno una di CGIL/CISL/UIL
    const conSindacatiPrincipali = ordinati.find(c => {
      const datoriali = c.partiDatorialiFirmatarie || [];
      const sindacati = c.partiSindacaliFirmatarie || [];
      
      const datorialiStr = typeof datoriali === 'string' ? datoriali : JSON.stringify(datoriali);
      const sindacatiStr = typeof sindacati === 'string' ? sindacati : JSON.stringify(sindacati);
      
      const haConfcommercio = datorialiStr.toUpperCase().includes('CONFCOMMERCIO');
      const haSindacatoPrincipale = sindacatiStr.toLowerCase().includes('cgil') ||
                                        sindacatiStr.toLowerCase().includes('cisl') ||
                                        sindacatiStr.toLowerCase().includes('uil');
      
      return haConfcommercio && haSindacatoPrincipale;
    });
    
    return conSindacatiPrincipali || ordinati[0];
  };

  const toggleExpand = (codice) => {
    setExpandedCodes(prev => ({
      ...prev,
      [codice]: !prev[codice]
    }));
  };

  // Funzione helper per formattare parti firmatarie
  const formatFirmatari = (firmatari) => {
    if (!firmatari) return '-';
    if (typeof firmatari === 'string') {
      if (firmatari.startsWith('[')) {
        try {
          return JSON.parse(firmatari).join(', ');
        } catch {
          return firmatari;
        }
      }
      return firmatari;
    }
    if (Array.isArray(firmatari)) {
      return firmatari.join(', ');
    }
    return '-';
  };

  // Funzione helper per ottenere il colore della tipologia
  const getTipologiaColor = (tipologia) => {
    const colors = {
      'Accordo di rinnovo': '#3b82f6',
      'Verbale Integrativo': '#10b981',
      'Testo definitivo': '#8b5cf6',
      'Accordo economico': '#f59e0b',
      'Economico secondo biennio': '#ef4444'
    };
    return colors[tipologia] || '#6b7280';
  };

  // Funzione helper per formattare la data in gg/mm/aaaa
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      // Gestisce sia formato YYYY-MM-DD che ISO completo (YYYY-MM-DDTHH:MM:SS...)
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        // Fallback per formato YYYY-MM-DD non valido come data
        const [year, month, day] = dateString.split('-');
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
      }
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  };

  const fetchContratti = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true)
    }

    try {
      const [contrattiRes, regoleRes] = await Promise.all([
        getContrattiAllVersions(),
        getRegoleCalcolo()
      ])

      setContratti(contrattiRes.data)
      // Crea mappa contratto_id -> regola
      const map = {}
      regoleRes.data.forEach(r => {
        map[r.contratto_id] = r
      })
      setRegoleMap(map)
    } catch {
      setError('Errore nel caricamento contratti')
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    let cancelled = false

    const loadContratti = async () => {
      try {
        const [contrattiRes, regoleRes] = await Promise.all([
          getContrattiAllVersions(),
          getRegoleCalcolo()
        ])

        if (cancelled) {
          return
        }

        setContratti(contrattiRes.data)
        const map = {}
        regoleRes.data.forEach(r => {
          map[r.contratto_id] = r
        })
        setRegoleMap(map)
      } catch {
        if (!cancelled) {
          setError('Errore nel caricamento contratti')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadContratti()

    return () => {
      cancelled = true
    }
  }, [])

  const openRegoleModal = (contratto) => {
    setCurrentContratto(contratto)
    const existingRegola = regoleMap[contratto?.id]
    // Converti 0 in null per coerenza
    const ore = existingRegola?.ore_settimanali_teoriche
    setRegolaForm({
      ore_settimanali_teoriche: !ore || parseFloat(ore) === 0 ? null : ore
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 style={{ margin: 0 }}>Gestione CCNL</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={onlyMainUnions}
                onChange={(e) => setOnlyMainUnions(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Solo CGIL, CISL, UIL
            </label>
          </div>
        </div>
        
        {/* Legenda tipologie contrattuali */}
        <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
          <strong style={{ fontSize: '0.875rem', color: '#4b5563' }}>Legenda tipologie:</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
            <span style={{ backgroundColor: '#3b82f6', color: 'white', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>Accordo di rinnovo</span>
            <span style={{ backgroundColor: '#10b981', color: 'white', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>Verbale Integrativo</span>
            <span style={{ backgroundColor: '#8b5cf6', color: 'white', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>Testo definitivo</span>
            <span style={{ backgroundColor: '#f59e0b', color: 'white', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>Accordo economico</span>
            <span style={{ backgroundColor: '#ef4444', color: 'white', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>Economico secondo biennio</span>
          </div>
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
                <th style={{ padding: '0.25rem', fontSize: '0.75rem' }}>Tipologia</th>
                <th style={{ padding: '0.25rem', fontSize: '0.75rem' }}>Parte Datoriale</th>
                <th style={{ padding: '0.25rem', fontSize: '0.75rem' }}>Parte Sindacale</th>
                <th style={{ padding: '0.25rem', fontSize: '0.75rem' }}>Ore Settimanali</th>
                <th style={{ padding: '0.25rem', fontSize: '0.75rem' }}>Data Decorrenza</th>
                <th style={{ padding: '0.25rem', fontSize: '0.75rem' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(
                contratti
                  // Raggruppa per codice CNEL
                  .reduce((acc, c) => {
                    if (!acc[c.codice_cnel]) acc[c.codice_cnel] = [];
                    acc[c.codice_cnel].push(c);
                    return acc;
                  }, {})
              )
                // Filtra i gruppi
                .filter(([, gruppo]) => {
                  // Filtro sindacati maggiori (se flag attivo)
                  if (onlyMainUnions) {
                    const haSindacatoPrincipale = gruppo.some(c => {
                      const sindacati = c.partiSindacaliFirmatarie || [];
                      const sindacatiStr = typeof sindacati === 'string' 
                        ? sindacati 
                        : JSON.stringify(sindacati);
                      return sindacatiStr.toLowerCase().includes('cgil') ||
                             sindacatiStr.toLowerCase().includes('cisl') ||
                             sindacatiStr.toLowerCase().includes('uil');
                    });
                    if (!haSindacatoPrincipale) return false;
                  }
                  
                  // Filtro di ricerca: almeno un contratto nel gruppo deve matchare
                  if (searchTerm) {
                    const matchesSearch = gruppo.some(c =>
                      c.nome_contratto.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (c.codice_cnel || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                      JSON.stringify(c.partiDatorialiFirmatarie || []).toLowerCase().includes(searchTerm.toLowerCase()) ||
                      JSON.stringify(c.partiSindacaliFirmatarie || []).toLowerCase().includes(searchTerm.toLowerCase())
                    );
                    if (!matchesSearch) return false;
                  }
                  
                  return true;
                })
                .map(([codice, gruppo]) => {
                  const main = getMainContratto(gruppo);
                  const isExpanded = expandedCodes[codice] || false;
                  const mainRegola = regoleMap[main.id];
                  
                  return (
                    <Fragment key={codice}>
                      {/* Riga principale */}
                      <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '0.25rem', fontSize: '0.75rem' }}><strong>{main.nome_contratto}</strong></td>
                        <td style={{ padding: '0.25rem', fontSize: '0.75rem' }}>{codice || '-'}</td>
                        <td style={{ padding: '0.25rem', fontSize: '0.75rem', textAlign: 'center' }}>
                          {main.tipologia_contratto && (
                            <span style={{
                              display: 'inline-block',
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              backgroundColor: getTipologiaColor(main.tipologia_contratto),
                              cursor: 'help'
                            }} title={main.tipologia_contratto} />
                          )}
                        </td>
                        <td style={{ padding: '0.25rem', fontSize: '0.75rem' }}>
                          {formatFirmatari(main.partiDatorialiFirmatarie)}
                        </td>
                        <td style={{ padding: '0.25rem', fontSize: '0.75rem' }}>
                          {formatFirmatari(main.partiSindacaliFirmatarie)}
                        </td>
                        <td style={{ padding: '0.25rem', fontSize: '0.75rem' }}>
                          {Number(mainRegola?.ore_settimanali_teoriche ?? main.ore_settimanali_teoriche) === 0 ? '-' : (mainRegola?.ore_settimanali_teoriche ?? main.ore_settimanali_teoriche ?? '-')}
                        </td>
                        <td style={{ padding: '0.25rem', fontSize: '0.75rem' }}>
                          {main.data_decorrenza && (
                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                              {formatDate(main.data_decorrenza)}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.25rem', fontSize: '0.75rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <button
                              onClick={() => toggleExpand(codice)}
                              style={{
                                padding: '0.15rem 0.3rem',
                                backgroundColor: '#6b7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.65rem'
                              }}
                            >
                              {isExpanded ? '▲' : '▼'}
                            </button>
                            <button
                              onClick={() => openRegoleModal(main)}
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
                          </div>
                        </td>
                      </tr>
                      
                      {/* Righe espanse */}
                      {isExpanded && gruppo
                        .filter(c => c.id !== main.id)
                        .filter(c => {
                          if (!onlyMainUnions) return true;
                          const sindacati = c.partiSindacaliFirmatarie || [];
                          const sindacatiStr = typeof sindacati === 'string' 
                            ? sindacati 
                            : JSON.stringify(sindacati);
                          return sindacatiStr.toLowerCase().includes('cgil') ||
                                 sindacatiStr.toLowerCase().includes('cisl') ||
                                 sindacatiStr.toLowerCase().includes('uil');
                        })
                        .map((c) => {
                        const regola = regoleMap[c.id];
                        return (
                          <tr key={c.id} style={{ backgroundColor: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '0.25rem', fontSize: '0.75rem', paddingLeft: '2rem' }}>{c.nome_contratto}</td>
                            <td style={{ padding: '0.25rem', fontSize: '0.75rem' }}>{c.codice_cnel || '-'}</td>
                            <td style={{ padding: '0.25rem', fontSize: '0.75rem', textAlign: 'center' }}>
                              {c.tipologia_contratto && (
                                <span style={{
                                  display: 'inline-block',
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  backgroundColor: getTipologiaColor(c.tipologia_contratto),
                                  cursor: 'help'
                                }} title={c.tipologia_contratto} />
                              )}
                            </td>
                            <td style={{ padding: '0.25rem', fontSize: '0.75rem' }}>
                              {formatFirmatari(c.partiDatorialiFirmatarie)}
                            </td>
                            <td style={{ padding: '0.25rem', fontSize: '0.75rem' }}>
                              {formatFirmatari(c.partiSindacaliFirmatarie)}
                            </td>
                            <td style={{ padding: '0.25rem', fontSize: '0.75rem' }}>
                              {Number(regola?.ore_settimanali_teoriche ?? c.ore_settimanali_teoriche) === 0 ? '-' : (regola?.ore_settimanali_teoriche ?? c.ore_settimanali_teoriche ?? '-')}
                            </td>
                            <td style={{ padding: '0.25rem', fontSize: '0.75rem' }}>
                              {c.data_decorrenza && (
                                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                  {formatDate(c.data_decorrenza)}
                                </span>
                              )}
                            </td>
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
                      );
                      })}
                    </Fragment>
                  );
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
