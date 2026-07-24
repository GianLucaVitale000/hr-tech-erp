import { useState, useEffect, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  getContrattiAllVersions, 
  getRegoleCalcolo, 
  createRegolaCalcolo, 
  updateRegolaCalcolo,
  deleteRegolaCalcolo,
  getDipendentiByCodiceContratto,
  getDipendentiByContratto,
  updateContratto
} from '../../services/dipendentiService'

function Contratti() {
  const [contratti, setContratti] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [currentContratto, setCurrentContratto] = useState(null)
  const [contrattoOre, setContrattoOre] = useState(null)
  const [profili, setProfili] = useState([])
  const [modalLoading, setModalLoading] = useState(false)
  const [regoleMap, setRegoleMap] = useState({})
  const [allDipendenti, setAllDipendenti] = useState([])
  const [dipendentiLoading, setDipendentiLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [onlyMainUnions, setOnlyMainUnions] = useState(false)
  const [expandedCodes, setExpandedCodes] = useState({})
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
  }

  const toggleExpand = (codice) => {
    setExpandedCodes(prev => ({
      ...prev,
      [codice]: !prev[codice]
    }));
  }

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
  }

  const getTipologiaColor = (tipologia) => {
    const colors = {
      'Accordo di rinnovo': '#3b82f6',
      'Verbale Integrativo': '#10b981',
      'Testo definitivo': '#8b5cf6',
      'Accordo economico': '#f59e0b',
      'Economico secondo biennio': '#ef4444'
    };
    return colors[tipologia] || '#6b7280';
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
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
  }

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
      // Crea mappa contratto_id -> array di regole
      const map = {}
      regoleRes.data.forEach(r => {
        if (!map[r.contratto_id]) {
          map[r.contratto_id] = []
        }
        map[r.contratto_id].push(r)
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
          if (!map[r.contratto_id]) {
            map[r.contratto_id] = []
          }
          map[r.contratto_id].push(r)
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

  // Funzione per aggiungere un nuovo profilo
  const addProfilo = () => {
    setProfili([...profili, {
      id: null,
      ore: null,
      descrizione: '',
      dipendenti_ids: []
    }])
  }

  // Funzione per rimuovere un profilo
  const removeProfilo = async (index) => {
    const profilo = profili[index]
    
    // Se il profilo ha un id, chiedi conferma ed elimina dal backend
    if (profilo.id) {
      if (window.confirm('Vuoi davvero eliminare questo profilo orario?')) {
        try {
          await deleteRegolaCalcolo(profilo.id)
          // Rimuovi localmente
          const newProfili = [...profili]
          newProfili.splice(index, 1)
          setProfili(newProfili)
        } catch (error) {
          console.error('Errore nell\'eliminazione del profilo:', error)
          setError('Errore nell\'eliminazione del profilo orario')
        }
      }
    } else {
      // Se non ha id, rimuovi solo localmente
      if (profili.length <= 1) return
      const newProfili = [...profili]
      newProfili.splice(index, 1)
      setProfili(newProfili)
    }
  }

  // Funzione per ottenere dipendenti residui per un profilo
  const getDipendentiResidui = (profiloIndex) => {
    const assignedIds = new Set()
    profili.forEach((profilo, idx) => {
      if (idx !== profiloIndex) {
        profilo.dipendenti_ids.forEach(id => assignedIds.add(id))
      }
    })
    return allDipendenti.filter(d => !assignedIds.has(d.id))
  }

  // Gestisce cambiamento in un profilo
  const handleProfiloChange = (profiloIndex, e) => {
    const { name, value, type } = e.target
    setProfili(prev => {
      const newProfili = [...prev]
      const profilo = { ...newProfili[profiloIndex] }
      
      if (type === 'select-multiple') {
        const selectedOptions = Array.from(e.target.selectedOptions, option => Number(option.value))
        profilo.dipendenti_ids = selectedOptions
      } else if (name === 'ore') {
        profilo.ore = value === '' ? null : Number(value)
      } else {
        profilo[name] = value
      }
      
      newProfili[profiloIndex] = profilo
      return newProfili
    })
  }

  const openRegoleModal = async (contratto) => {
    setCurrentContratto(contratto)
    setDipendentiLoading(true)
    
    try {
      // Carica tutti i dipendenti del contratto
      // Se c'è il codice CCNL, usa quello per trovare tutti i dipendenti
      // indipendentemente dalla versione del contratto
      const dipendentiRes = contratto.codice_cnel 
        ? await getDipendentiByCodiceContratto(contratto.codice_cnel)
        : await getDipendentiByContratto(contratto.id)
      
      setAllDipendenti(dipendentiRes.data || [])
      
      // Imposta ore base del contratto
      setContrattoOre(contratto.ore_settimanali_teoriche ?? null)
      
      // Carica i profili esistenti (regole di calcolo per questo contratto)
      const regoleContratto = regoleMap[contratto.id] || []
      
      if (regoleContratto.length === 0) {
        // Nessun profilo esistente, ne creiamo uno vuoto
        setProfili([{
          id: null,
          ore: null,
          descrizione: '',
          dipendenti_ids: []
        }])
      } else {
        // Converte in array di profili
        setProfili(regoleContratto.map(r => ({
          id: r.id,
          ore: r.ore_settimanali_teoriche !== null && parseFloat(r.ore_settimanali_teoriche) !== 0 ? r.ore_settimanali_teoriche : null,
          descrizione: r.descrizione || '',
          dipendenti_ids: r.dipendenti?.map(d => d.id) || []
        })))
      }
    } catch (error) {
      console.error('Errore nel caricamento:', error)
      setAllDipendenti([])
      setContrattoOre(null)
      setProfili([{
        id: null,
        ore: null,
        descrizione: '',
        dipendenti_ids: []
      }])
    } finally {
      setDipendentiLoading(false)
    }
    
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setCurrentContratto(null)
    setContrattoOre(null)
    setProfili([])
    setAllDipendenti([])
  }

  const handleContrattoOreChange = (e) => {
    const value = e.target.value
    setContrattoOre(value === '' ? null : Number(value))
  }

  const handleSave = async () => {
    if (!currentContratto) {
      setError('Seleziona un contratto')
      setModalLoading(false)
      return
    }
    
    setModalLoading(true)
    setError('')
    
    try {
      // 1. Aggiorna le ore settimanali teoriche del contratto
      if (contrattoOre !== null && contrattoOre !== currentContratto.ore_settimanali_teoriche) {
        await updateContratto(currentContratto.id, {
          ore_settimanali_teoriche: contrattoOre
        })
      }
      
      // 2. Gestisce i profili orario
      for (const profilo of profili) {
        if (profilo.id) {
          // Aggiorna profilo esistente
          const updateData = {
            ore_settimanali_teoriche: profilo.ore,
            descrizione: profilo.descrizione || null,
            dipendenti_ids: profilo.dipendenti_ids
          }
          await updateRegolaCalcolo(profilo.id, updateData)
        } else {
          // Crea nuovo profilo
          const createData = {
            contratto_id: currentContratto.id,
            ore_settimanali_teoriche: profilo.ore,
            descrizione: profilo.descrizione || null,
            dipendenti_ids: profilo.dipendenti_ids
          }
          await createRegolaCalcolo(createData)
        }
      }
      
      closeModal()
      await fetchContratti()
      setModalLoading(false)
    } catch (error) {
      setError('Errore durante il salvataggio')
      setModalLoading(false)
      console.error('Salvataggio fallito:', error)
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
          <h1 style={{ margin: 0, lineHeight: '1.2' }}>Gestione CCNL</h1>
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
                <th style={{ padding: '0.25rem', fontSize: '0.75rem' }}>Cod. CNEL</th>
                <th style={{ padding: '0.25rem', fontSize: '0.75rem' }}>Tipo</th>
                <th style={{ padding: '0.25rem', fontSize: '0.75rem' }}>Parte Datoriale</th>
                <th style={{ padding: '0.25rem', fontSize: '0.75rem' }}>Parte Sindacale</th>
                <th style={{ padding: '0.25rem', fontSize: '0.75rem' }}>Ore Sett.</th>
                <th style={{ padding: '0.25rem', fontSize: '0.75rem' }}>Decorrenza</th>
                <th style={{ padding: '0.25rem', fontSize: '0.75rem' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(
                contratti
                  .reduce((acc, c) => {
                    if (!acc[c.codice_cnel]) acc[c.codice_cnel] = [];
                    acc[c.codice_cnel].push(c);
                    return acc;
                  }, {})
              )
                .filter(([, gruppo]) => {
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
                  
                  return (
                    <Fragment key={codice}>
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
                          {Number(main.ore_settimanali_teoriche) === 0 || main.ore_settimanali_teoriche === null ? '-' : main.ore_settimanali_teoriche}
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
                              {Number(c.ore_settimanali_teoriche) === 0 || c.ore_settimanali_teoriche === null ? '-' : c.ore_settimanali_teoriche}
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
            maxWidth: '700px',
            maxHeight: '80vh',
            overflowY: 'auto',
            color: 'white'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'white' }}>
                {currentContratto ? `Regole di Calcolo - ${currentContratto.nome_contratto}` : 'Nuove Regole'}
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
            
            {/* Campo Ore Settimanali Teoriche - Base del contratto */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#d1d5db' }}>
                Ore Settimanali Teoriche
                <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#9ca3af' }}>
                  {' - Valore base per il CCNL (es: 40, 39, 38)'}
                </span>
              </label>
              <input
                type="number"
                value={contrattoOre === null ? '' : contrattoOre}
                onChange={handleContrattoOreChange}
                step="0.01"
                min="0"
                placeholder="Inserisci le ore settimanali base (es: 40)"
                style={{
                  display: 'block',
                  width: '10%',
                  margin: '0 auto',
                  padding: '0.5rem',
                  border: '1px solid #4b5563',
                  borderRadius: '4px',
                  backgroundColor: '#374151',
                  color: 'white'
                }}
              />
            </div>

            <div style={{ borderTop: '1px solid #374151', paddingTop: '1.5rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#d1d5db' }}>Profili Orario Specifici</h3>
              
              {profili.map((profilo, index) => (
                <div key={index} style={{ 
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  backgroundColor: '#374151',
                  borderRadius: '6px'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '1rem'
                  }}>
                    <span style={{ fontWeight: '500', color: '#d1d5db' }}>
                      Profilo {index + 1}
                    </span>
                    {profili.length > 1 && (
                      <button
                        onClick={() => removeProfilo(index)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.75rem'
                        }}
                      >
                        Rimuovi
                      </button>
                    )}
                  </div>
                  
                  {/* Ore e Descrizione sulla stessa riga */}
                  <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: '#9ca3af' }}>
                        Ore
                      </label>
                      <input
                        type="number"
                        name="ore"
                        value={profilo.ore === null ? '' : profilo.ore}
                        onChange={(e) => handleProfiloChange(index, e)}
                        step="0.01"
                        min="0"
                        placeholder="45"
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #4b5563',
                          borderRadius: '4px',
                          backgroundColor: '#1f2937',
                          color: 'white'
                        }}
                      />
                    </div>
                    <div style={{ flex: 2 }}>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: '#9ca3af' }}>
                        Descrizione
                      </label>
                      <input
                        type="text"
                        name="descrizione"
                        value={profilo.descrizione || ''}
                        onChange={(e) => handleProfiloChange(index, e)}
                        placeholder="Es: Vigilanza, Distribuzione carburanti"
                        style={{
                          display: 'block',
                          width: '75%',
                          padding: '0.5rem',
                          border: '1px solid #4b5563',
                          borderRadius: '4px',
                          backgroundColor: '#1f2937',
                          color: 'white'
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Select per Dipendenti */}
                  <div style={{ marginBottom: '0.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#d1d5db' }}>
                      Dipendenti Associati
                      <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#9ca3af' }}>
                        {' - Seleziona i dipendenti per questo profilo'}
                      </span>
                    </label>
                    
                    {dipendentiLoading ? (
                      <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Caricamento dipendenti...</p>
                    ) : (
                      <>
                        {allDipendenti.length === 0 ? (
                          <p style={{ color: '#f59e0b', fontSize: '0.875rem' }}>
                            Nessun dipendente trovato per questo contratto
                          </p>
                        ) : getDipendentiResidui(index).length === 0 ? (
                          <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
                            {profili.length === 1 
                              ? 'Nessun dipendente disponibile per questo contratto' 
                              : 'Tutti i dipendenti sono già assegnati ad altri profili'}
                          </p>
                        ) : (
                          <select
                            name="dipendenti_ids"
                            onChange={(e) => handleProfiloChange(index, e)}
                            multiple
                            style={{
                              display: 'block',
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid #4b5563',
                              borderRadius: '4px',
                              backgroundColor: '#1f2937',
                              color: 'white',
                              minHeight: '80px'
                            }}
                            size={Math.min(getDipendentiResidui(index).length + 1, 5)}
                          >
                            {getDipendentiResidui(index).map((dipendente) => {
                              const isSelected = profilo.dipendenti_ids.includes(dipendente.id)
                              return (
                                <option
                                  key={dipendente.id}
                                  value={dipendente.id}
                                  selected={isSelected}
                                  style={{
                                    backgroundColor: isSelected ? '#3b82f6' : '#1f2937',
                                    color: 'white'
                                  }}
                                >
                                  {dipendente.user?.name || `Dipendente #${dipendente.id}`}
                                  {dipendente.mansione && ` (${dipendente.mansione})`}
                                </option>
                              )
                            })}
                          </select>
                        )}
                        
                        {profilo.dipendenti_ids.length > 0 && (
                          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#10b981' }}>
                            Selezionati: {profilo.dipendenti_ids.length} dipendente(i)
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
              
              <button
                onClick={addProfilo}
                style={{
                  display: 'block',
                  width: '50%',
                  padding: '0.5rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  marginTop: '1rem'
                }}
              >
                + Aggiungi Profilo Orario
              </button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
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
                onClick={handleSave}
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
