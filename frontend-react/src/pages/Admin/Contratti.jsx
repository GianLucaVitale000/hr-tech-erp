import { useState, useEffect, Fragment } from 'react'
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
  const [isMobile, setIsMobile] = useState(false)
  const [expandedCards, setExpandedCards] = useState({})

  // Rileva se è mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Funzione per determinare il record principale di un gruppo
  const getMainContratto = (gruppo) => {
    const ordinati = [...gruppo].sort((a, b) => {
      if (!a.data_decorrenza && !b.data_decorrenza) return 0;
      if (!a.data_decorrenza) return 1;
      if (!b.data_decorrenza) return -1;
      return new Date(b.data_decorrenza) - new Date(a.data_decorrenza);
    });

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

  const toggleCard = (codice) => {
    setExpandedCards(prev => ({
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

  const getTipologiaColorClass = (tipologia) => {
    const colors = {
      'Accordo di rinnovo': 'contratti-tipologia-rinnovo',
      'Verbale Integrativo': 'contratti-tipologia-integrativo',
      'Testo definitivo': 'contratti-tipologia-definitivo',
      'Accordo economico': 'contratti-tipologia-economico',
      'Economico secondo biennio': 'contratti-tipologia-biennio'
    };
    return colors[tipologia] || '';
  }

  const getTipologiaIndicatorSize = (context) => {
    if (context === 'card') return 'contratti-tipologia-indicator-small';
    if (context === 'altra') return 'contratti-tipologia-indicator-small';
    return 'contratti-tipologia-indicator-medium';
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

      setContratti(contrattiRes.data);
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

    if (profilo.id) {
      if (window.confirm('Vuoi davvero eliminare questo profilo orario?')) {
        try {
          await deleteRegolaCalcolo(profilo.id)
          const newProfili = [...profili]
          newProfili.splice(index, 1)
          setProfili(newProfili)
        } catch (error) {
          console.error('Errore nell\'eliminazione del profilo:', error)
          setError('Errore nell\'eliminazione del profilo orario')
        }
      }
    } else {
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
      const dipendentiRes = contratto.codice_cnel
        ? await getDipendentiByCodiceContratto(contratto.codice_cnel)
        : await getDipendentiByContratto(contratto.id)

      setAllDipendenti(dipendentiRes.data || [])

      setContrattoOre(contratto.ore_settimanali_teoriche ?? null)

      const regoleContratto = regoleMap[contratto.id] || []

      if (regoleContratto.length === 0) {
        setProfili([{
          id: null,
          ore: null,
          descrizione: '',
          dipendenti_ids: []
        }])
      } else {
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
      if (contrattoOre !== null && contrattoOre !== currentContratto.ore_settimanali_teoriche) {
        await updateContratto(currentContratto.id, {
          ore_settimanali_teoriche: contrattoOre
        })
      }

      for (const profilo of profili) {
        if (profilo.id) {
          const updateData = {
            ore_settimanali_teoriche: profilo.ore,
            descrizione: profilo.descrizione || null,
            dipendenti_ids: profilo.dipendenti_ids
          }
          await updateRegolaCalcolo(profilo.id, updateData)
        } else {
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
    <div className="contratti-container">
      <div className="contratti-header">
        <div className="contratti-header-content">
          <h1 className="contratti-title">Gestione CCNL</h1>
          <div className={isMobile ? "contratti-filter-group contratti-filter-group-mobile" : "contratti-filter-group"}>
            <label>
              <input
                type="text"
                placeholder="Cerca per codice o nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={isMobile ? "contratti-search-input contratti-search-input-mobile" : "contratti-search-input contratti-search-input-desktop"}
              />
            </label>
            <label className="contratti-checkbox-label">
              <input
                type="checkbox"
                checked={onlyMainUnions}
                onChange={(e) => setOnlyMainUnions(e.target.checked)}
                className="contratti-checkbox-input"
              />
              <span className="contratti-checkbox-text">Solo sindacati comparativamente più rappresentativi sul piano nazionale</span>
            </label>
          </div>
        </div>

        <div className="contratti-header">
          <strong className="contratti-legend-title">Legenda tipologie:</strong>
          <div className="contratti-legend-tags">
            <span className="contratti-legend-tag contratti-legend-tag-rinnovo">Accordo di rinnovo</span>
            <span className="contratti-legend-tag contratti-legend-tag-integrativo">Verbale Integrativo</span>
            <span className="contratti-legend-tag contratti-legend-tag-definitivo">Testo definitivo</span>
            <span className="contratti-legend-tag contratti-legend-tag-economico">Accordo economico</span>
            <span className="contratti-legend-tag contratti-legend-tag-biennio">Economico secondo biennio</span>
          </div>
        </div>
      </div>

      {error && <p className="contratti-error">{error}</p>}

      {loading ? (
        <p className="contratti-loading">Caricamento...</p>
      ) : contratti.length === 0 ? (
        <p className="contratti-empty">Nessun contratto trovato. Crea il primo contratto.</p>
      ) : isMobile ? (
        // LAYOUT MOBILE: cards incolonnate
        <div className="contratti-mobile-list">
          {Object.entries(
            contratti.reduce((acc, c) => {
              if (!acc[c.codice_cnel]) acc[c.codice_cnel] = [];
              acc[c.codice_cnel].push(c);
              return acc;
            }, {})
          )
            .filter(([, gruppo]) => {
              if (onlyMainUnions) {
                const haSindacatoPrincipale = gruppo.some(c => {
                  const sindacati = c.partiSindacaliFirmatarie || [];
                  const sindacatiStr = typeof sindacati === 'string' ? sindacati : JSON.stringify(sindacati);
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
              const isCardExpanded = expandedCards[codice] || false;
              const altreVersioni = gruppo.filter(c => c.id !== main.id).filter(c => {
                if (!onlyMainUnions) return true;
                const sindacati = c.partiSindacaliFirmatarie || [];
                const sindacatiStr = typeof sindacati === 'string' ? sindacati : JSON.stringify(sindacati);
                return sindacatiStr.toLowerCase().includes('cgil') ||
                       sindacatiStr.toLowerCase().includes('cisl') ||
                       sindacatiStr.toLowerCase().includes('uil');
              });
              return (
                <div key={codice} className="contratti-card">
                  <div className="contratti-card-fields">
                    <div className="contratti-card-field">
                      <span className="contratti-card-label">Nome Contratto:</span>
                      <span className="contratti-card-value contratti-card-value-contratto">{main.nome_contratto}</span>
                    </div>
                    <div className="contratti-card-field">
                      <span className="contratti-card-label">Cod. CNEL:</span>
                      <span className="contratti-card-value">{codice || '-'}</span>
                    </div>
                    <div className="contratti-card-field">
                      <span className="contratti-card-label">Tipo:</span>
                      <span className="contratti-card-value">
                        {main.tipologia_contratto && (
                          <span className={`contratti-tipologia-indicator ${getTipologiaIndicatorSize('card')} ${getTipologiaColorClass(main.tipologia_contratto)}`} title={main.tipologia_contratto} />
                        )}
                        {main.tipologia_contratto || '-'}
                      </span>
                    </div>
                    <div className="contratti-card-field">
                      <span className="contratti-card-label">Parte Datoriale:</span>
                      <span className="contratti-card-value">{formatFirmatari(main.partiDatorialiFirmatarie)}</span>
                    </div>
                    <div className="contratti-card-field">
                      <span className="contratti-card-label">Parte Sindacale:</span>
                      <span className="contratti-card-value">{formatFirmatari(main.partiSindacaliFirmatarie)}</span>
                    </div>
                    <div className="contratti-card-field">
                      <span className="contratti-card-label">orario sett. TP da CCNL:</span>
                      <span className="contratti-card-value">
                        {Number(main.ore_settimanali_teoriche) === 0 || main.ore_settimanali_teoriche === null ? '-' : main.ore_settimanali_teoriche}
                      </span>
                    </div>
                    <div className="contratti-card-field">
                      <span className="contratti-card-label">Decorrenza:</span>
                      <span className="contratti-card-value">{main.data_decorrenza ? formatDate(main.data_decorrenza) : '-'}</span>
                    </div>
                  </div>
                  <div className="contratti-card-actions">
                    {altreVersioni.length > 0 && (
                      <button
                        onClick={() => toggleCard(codice)}
                        className="contratti-card-button contratti-card-button-versions"
                      >
                        {isCardExpanded ? '▲ Nascondi' : `▼ Versioni (${altreVersioni.length})`}
                      </button>
                    )}
                    <button
                      onClick={() => openRegoleModal(main)}
                      className="contratti-card-button contratti-card-button-rules"
                    >
                      Regole
                    </button>
                  </div>
                  {isCardExpanded && altreVersioni.length > 0 && (
                    <div className="contratti-expanded-versions">
                      <div className="contratti-expanded-title">Altre versioni:</div>
                      {altreVersioni.map((c) => (
                        <div key={c.id} className="contratti-altra-version-card">
                          <div className="contratti-altra-version-fields">
                            <div className="contratti-altra-version-field">
                              <span className="contratti-altra-version-label">Tipo:</span>
                              <span className="contratti-altra-version-value">
                                {c.tipologia_contratto && (
                                  <span className={`contratti-tipologia-indicator ${getTipologiaIndicatorSize('altra')} ${getTipologiaColorClass(c.tipologia_contratto)}`} title={c.tipologia_contratto} />
                                )}
                                {c.tipologia_contratto || '-'}
                              </span>
                            </div>
                            <div className="contratti-altra-version-field">
                              <span className="contratti-altra-version-label">Decorrenza:</span>
                              <span className="contratti-altra-version-value">{c.data_decorrenza ? formatDate(c.data_decorrenza) : '-'}</span>
                            </div>
                            <div className="contratti-altra-version-actions">
                              <button
                                onClick={() => openRegoleModal(c)}
                                className="contratti-altra-version-button"
                              >
                                Regole
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      ) : (
        // LAYOUT DESKTOP: tabella
        <div className="contratti-table-container">
          <table className="contratti-table">
            <thead>
              <tr className="contratti-table-header">
                <th>Nome CCNL</th>
                <th>codice CNEL</th>
                <th>tipologia</th>
                <th>Parte Datoriale</th>
                <th>Parte Sindacale</th>
                <th>orario sett.</th>
                <th>data</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(
                contratti.reduce((acc, c) => {
                  if (!acc[c.codice_cnel]) acc[c.codice_cnel] = [];
                  acc[c.codice_cnel].push(c);
                  return acc;
                }, {})
              )
                .filter(([, gruppo]) => {
                  if (onlyMainUnions) {
                    const haSindacatoPrincipale = gruppo.some(c => {
                      const sindacati = c.partiSindacaliFirmatarie || [];
                      const sindacatiStr = typeof sindacati === 'string' ? sindacati : JSON.stringify(sindacati);
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
                      <tr className="contratti-table-row">
                        <td className="contratti-table-cell-contratto"><strong>{main.nome_contratto}</strong></td>
                        <td>{codice || '-'}</td>
                        <td className="contratti-table-cell-center">
                          {main.tipologia_contratto && (
                            <span className={`contratti-tipologia-indicator ${getTipologiaIndicatorSize('table')} ${getTipologiaColorClass(main.tipologia_contratto)}`} title={main.tipologia_contratto} />
                          )}
                        </td>
                        <td>{formatFirmatari(main.partiDatorialiFirmatarie)}</td>
                        <td>{formatFirmatari(main.partiSindacaliFirmatarie)}</td>
                        <td>{Number(main.ore_settimanali_teoriche) === 0 || main.ore_settimanali_teoriche === null ? '-' : main.ore_settimanali_teoriche}</td>
                        <td>{main.data_decorrenza && <span className="contratti-table-cell-data">{formatDate(main.data_decorrenza)}</span>}</td>
                        <td>
                          <div className="contratti-table-actions">
                            <button onClick={() => toggleExpand(codice)} className="contratti-table-button contratti-table-button-expand">
                              {isExpanded ? '▲' : '▼'}
                            </button>
                            <button onClick={() => openRegoleModal(main)} className="contratti-table-button contratti-table-button-rules">Regole</button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && gruppo.filter(c => c.id !== main.id).filter(c => {
                        if (!onlyMainUnions) return true;
                        const sindacati = c.partiSindacaliFirmatarie || [];
                        const sindacatiStr = typeof sindacati === 'string' ? sindacati : JSON.stringify(sindacati);
                        return sindacatiStr.toLowerCase().includes('cgil') ||
                               sindacatiStr.toLowerCase().includes('cisl') ||
                               sindacatiStr.toLowerCase().includes('uil');
                      }).map((c) => (
                        <tr key={c.id} className="contratti-table-row-expanded">
                          <td className="contratti-table-cell-expanded" title={c.nome_contratto || ''}>{c.nome_contratto}</td>
                          <td>{c.codice_cnel || '-'}</td>
                          <td className="contratti-table-cell-center">
                            {c.tipologia_contratto && <span className={`contratti-tipologia-indicator ${getTipologiaIndicatorSize('table')} ${getTipologiaColorClass(c.tipologia_contratto)}`} title={c.tipologia_contratto} />}
                          </td>
                          <td>{formatFirmatari(c.partiDatorialiFirmatarie)}</td>
                          <td>{formatFirmatari(c.partiSindacaliFirmatarie)}</td>
                          <td>{Number(c.ore_settimanali_teoriche) === 0 || c.ore_settimanali_teoriche === null ? '-' : c.ore_settimanali_teoriche}</td>
                          <td>{c.data_decorrenza && <span className="contratti-table-cell-data-green">{formatDate(c.data_decorrenza)}</span>}</td>
                          <td><button onClick={() => openRegoleModal(c)} className="contratti-table-button contratti-table-button-rules">Regole</button></td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modale Regole di Calcolo */}
      {modalOpen && (
        <div className="contratti-modal-overlay">
          <div className="contratti-modal">
            <div className="contratti-modal-header">
              <h2 className="contratti-modal-title">
                {currentContratto ? `Regole di Calcolo - ${currentContratto.nome_contratto}` : 'Nuove Regole'}
              </h2>
              <button
                onClick={closeModal}
                className="contratti-modal-close"
              >
                ×
              </button>
            </div>

            {/* Campo Ore Settimanali Teoriche - Base del contratto */}
            <div className="contratti-modal-section">
              <label className="contratti-modal-label">
                Ore Settimanali Teoriche
              </label>
              <input
                type="number"
                value={contrattoOre === null ? '' : contrattoOre}
                onChange={handleContrattoOreChange}
                step="0.01"
                min="0"
                placeholder="ore sett. da CCNL"
                className="contratti-modal-input contratti-modal-input-ore"
              />
            </div>

            <div className="contratti-modal-divider">
              <h3 className="contratti-modal-divider-title">Profili Orario Specifici</h3>

              {profili.map((profilo, index) => (
                <div key={index} className="contratti-modal-profilo">
                  <div className="contratti-modal-profilo-header">
                    <span className="contratti-modal-profilo-title">
                      Profilo {index + 1}
                    </span>
                    {profili.length > 1 && (
                      <button
                        onClick={() => removeProfilo(index)}
                        className="contratti-modal-profilo-remove"
                      >
                        Rimuovi
                      </button>
                    )}
                  </div>

                  {/* Ore e Descrizione sulla stessa riga */}
                  <div className="contratti-modal-profilo-fields">
                    <div className="contratti-modal-profilo-field">
                      <label className="contratti-modal-profilo-field-label">
                        Ore
                      </label>
                      <input
                        type="number"
                        name="ore"
                        value={profilo.ore === null ? '' : profilo.ore}
                        onChange={(e) => handleProfiloChange(index, e)}
                        step="0.01"
                        min="0"
                        className="contratti-modal-profilo-field-input"
                      />
                    </div>
                    <div className="contratti-modal-profilo-field contratti-modal-profilo-field-descrizione">
                      <label className="contratti-modal-profilo-field-label">
                        Descrizione
                      </label>
                      <input
                        type="text"
                        name="descrizione"
                        value={profilo.descrizione || ''}
                        onChange={(e) => handleProfiloChange(index, e)}
                        className="contratti-modal-profilo-field-input"
                      />
                    </div>
                  </div>

                  {/* Select per Dipendenti */}
                  <div className="contratti-modal-select-container">
                    <label className="contratti-modal-select-label">
                      Dipendenti Associati
                      <span className="contratti-modal-select-hint">
                        {' - Seleziona i dipendenti per questo profilo'}
                      </span>
                    </label>

                    {dipendentiLoading ? (
                      <p className="contratti-modal-select-loading">Caricamento dipendenti...</p>
                    ) : (
                      <>
                        {allDipendenti.length === 0 ? (
                          <p className="contratti-modal-select-empty">
                            Nessun dipendente trovato per questo contratto
                          </p>
                        ) : getDipendentiResidui(index).length === 0 ? (
                          <p className="contratti-modal-select-empty">
                            {profili.length === 1
                              ? 'Nessun dipendente disponibile per questo contratto'
                              : 'Tutti i dipendenti sono già assegnati ad altri profili'}
                          </p>
                        ) : (
                          <select
                            name="dipendenti_ids"
                            onChange={(e) => handleProfiloChange(index, e)}
                            multiple
                            className="contratti-modal-select"
                            size={Math.min(getDipendentiResidui(index).length + 1, 5)}
                          >
                            {getDipendentiResidui(index).map((dipendente) => {
                              const isSelected = profilo.dipendenti_ids.includes(dipendente.id)
                              return (
                                <option
                                  key={dipendente.id}
                                  value={dipendente.id}
                                  selected={isSelected}
                                  className={isSelected ? "contratti-modal-select-option contratti-modal-select-option-selected" : "contratti-modal-select-option"}
                                >
                                  {dipendente.user?.name || `Dipendente #${dipendente.id}`}
                                  {dipendente.mansione && ` (${dipendente.mansione})`}
                                </option>
                              )
                            })}
                          </select>
                        )}

                        {profilo.dipendenti_ids.length > 0 && (
                          <div className="contratti-modal-selected-count">
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
                className="contratti-modal-add-button"
              >
                + Aggiungi Profilo Orario
              </button>
            </div>

            <div className="contratti-modal-buttons">
              <button
                type="button"
                onClick={closeModal}
                disabled={modalLoading}
                className="contratti-modal-button contratti-modal-button-cancel"
              >
                Annulla
              </button>
              <button
                onClick={handleSave}
                disabled={modalLoading}
                className="contratti-modal-button contratti-modal-button-save"
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