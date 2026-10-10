import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPresenzeInAttesa, getMesiApprovati } from '../../services/presenzeService'

function Approvazioni() {
  const [mesi, setMesi] = useState([])
  const [mesiApprovati, setMesiApprovati] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingApprovati, setLoadingApprovati] = useState(true)
  const [meseSelezionato, setMeseSelezionato] = useState('')
  const [filtroDipendente, setFiltroDipendente] = useState('')
  const [filtroMese, setFiltroMese] = useState('')
  const [filtroAnno, setFiltroAnno] = useState('')
  const [filtroStato, setFiltroStato] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const navigate = useNavigate()

  const NOMI_MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']

  // Rileva se è mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fix per l'errore ESLint: setState in useEffect
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await getPresenzeInAttesa()
        setMesi(res.data)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

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
  }, [])

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

  const getStatoLabel = (stato) => {
    switch(stato) {
      case 'inviato':
      case 'rifiutato':
        return 'Da approvare'
      case 'reinviato':
        return 'Da approvare (Reinviato)'
      case 'approvato':
        return 'Approvato'
      default:
        return stato || 'Sconosciuto'
    }
  }

  const getStatoClass = (stato) => {
    switch(stato) {
      case 'inviato':
      case 'rifiutato':
        return 'approvazioni-stato-da-approvare'
      case 'reinviato':
        return 'approvazioni-stato-reinviato'
      case 'approvato':
        return 'approvazioni-stato-approvato'
      default:
        return 'approvazioni-stato-sconosciuto'
    }
  }

  return (
    <div className="approvazioni-container">
      {/* Titolo con font-size responsive */}
      <h1 className="approvazioni-title">
        Approvazione Fogli Ore
      </h1>

      <div className="approvazioni-buttons-container">
        <div className="approvazioni-buttons-group">
          <button
            onClick={() => {
              const oggi = new Date()
              handleExport(oggi.getMonth() + 1, oggi.getFullYear())
            }}
            className="approvazioni-button"
          >
            📊 Export Excel Paghe (Mese Corrente)
          </button>
          <div className="approvazioni-export-group">
            <select
              value={meseSelezionato}
              onChange={(e) => setMeseSelezionato(e.target.value)}
              className="approvazioni-select-mese"
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
              className="approvazioni-button"
              disabled={!meseSelezionato || loadingApprovati}
            >
              📊 Export Excel Paghe ({meseSelezionato ? NOMI_MESI[parseInt(meseSelezionato.split('-')[0]) - 1] || meseSelezionato : '...'})
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="approvazioni-loading">Caricamento...</p>
      ) : mesi.length === 0 ? (
        <p className="approvazioni-empty">Nessun foglio ore da visualizzare.</p>
      ) : (
        <>
          {/* Filtri */}
          <div className="approvazioni-filters">
            <div className="approvazioni-filters-container">
              <div className="approvazioni-filter-group">
                <label className="approvazioni-filter-label">Dipendente:</label>
                <select
                  value={filtroDipendente}
                  onChange={(e) => setFiltroDipendente(e.target.value)}
                  className="approvazioni-filter-select"
                >
                  <option value="">Tutti</option>
                  {[...new Set(mesi.map(m => m.dipendente_nome))].map((nome, index) => (
                    <option key={`${nome}-${index}`} value={nome}>{nome}</option>
                  ))}
                </select>
              </div>
              <div className="approvazioni-filter-group">
                <label className="approvazioni-filter-label">Mese:</label>
                <select
                  value={filtroMese}
                  onChange={(e) => setFiltroMese(e.target.value)}
                  className="approvazioni-filter-select"
                >
                  <option value="">Tutti</option>
                  {[...new Set(mesi.map(m => m.mese))].map((mese, index) => (
                    <option key={`${mese}-${index}`} value={mese}>{NOMI_MESI[parseInt(mese) - 1]}</option>
                  ))}
                </select>
              </div>
              <div className="approvazioni-filter-group">
                <label className="approvazioni-filter-label">Anno:</label>
                <select
                  value={filtroAnno}
                  onChange={(e) => setFiltroAnno(e.target.value)}
                  className="approvazioni-filter-select"
                >
                  <option value="">Tutti</option>
                  {[...new Set(mesi.map(m => m.anno))].sort((a, b) => b - a).map((anno, index) => (
                    <option key={`${anno}-${index}`} value={anno}>{anno}</option>
                  ))}
                </select>
              </div>
              <div className="approvazioni-filter-group">
                <label className="approvazioni-filter-label">Stato:</label>
                <select
                  value={filtroStato}
                  onChange={(e) => setFiltroStato(e.target.value)}
                  className="approvazioni-filter-select"
                >
                  <option value="">Tutti</option>
                  <option value="da_approvare">Da approvare</option>
                  <option value="reinviato">Da approvare (Reinviato)</option>
                  <option value="approvato">Approvato</option>
                </select>
              </div>
            </div>
          </div>

          {/* Versione mobile: card */}
          {isMobile ? (
            <div className="approvazioni-mobile-list">
              {mesi
                .filter(m => (
                  (filtroDipendente === '' || m.dipendente_nome === filtroDipendente) &&
                  (filtroMese === '' || m.mese === filtroMese) &&
                  (filtroAnno === '' || m.anno === filtroAnno) &&
                  (filtroStato === '' ||
                    (filtroStato === 'da_approvare' && (m.stato === 'inviato' || m.stato === 'rifiutato')) ||
                    (filtroStato === 'reinviato' && m.stato === 'reinviato') ||
                    (filtroStato === 'approvato' && m.stato === 'approvato')
                  )
                ))
                .map((m) => (
                  <div key={`${m.dipendente_id}-${m.mese}-${m.anno}`} className="approvazioni-card">
                    <div className="approvazioni-card-fields">
                      <div className="approvazioni-card-field">
                        <span className="approvazioni-card-label">Dipendente:</span>
                        <span
                          className="approvazioni-card-value approvazioni-card-value-clickable"
                          onClick={() => navigate(`/admin/approvazioni/${m.dipendente_id}/${m.mese}/${m.anno}`)}
                        >
                          {m.dipendente_nome}
                        </span>
                      </div>
                      <div className="approvazioni-card-field">
                        <span className="approvazioni-card-label">Mese:</span>
                        <span className="approvazioni-card-value-color">{NOMI_MESI[parseInt(m.mese) - 1]} {m.anno}</span>
                      </div>
                      <div className="approvazioni-card-field">
                        <span className="approvazioni-card-label">Giorni Inviati:</span>
                        <span className="approvazioni-card-value">{m.totale_giorni}</span>
                      </div>
                      <div className="approvazioni-card-field">
                        <span className="approvazioni-card-label">Ore Ordinarie:</span>
                        <span className="approvazioni-card-value">{Number(m.totale_ore_ordinarie || 0).toFixed(2)}</span>
                      </div>
                      <div className="approvazioni-card-field">
                        <span className="approvazioni-card-label">Ore Eccedenti:</span>
                        <span className="approvazioni-card-value">{Number(m.totale_ore_eccedenti || 0).toFixed(2)}</span>
                      </div>
                      <div className="approvazioni-card-field">
                        <span className="approvazioni-card-label">Straordinari:</span>
                        <span className="approvazioni-card-value">{Number(m.totale_ore_straordinarie || 0).toFixed(2)}</span>
                      </div>
                      <div className="approvazioni-card-field">
                        <span className="approvazioni-card-label">Stato:</span>
                        <span className="approvazioni-card-value">
                          <span className={`approvazioni-stato-badge ${getStatoClass(m.stato)}`}>
                            {getStatoLabel(m.stato)}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            // Versione desktop: tabella
            <div className="approvazioni-table-container">
              <table className="approvazioni-table">
                <thead>
                  <tr className="approvazioni-table-header">
                    <th>Dipendente</th>
                    <th>Mese</th>
                    <th>Giorni Inviati</th>
                    <th>Ore Ordinarie</th>
                    <th>Ore Eccedenti</th>
                    <th>Straordinari</th>
                    <th>Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {mesi
                    .filter(m => (
                      (filtroDipendente === '' || m.dipendente_nome === filtroDipendente) &&
                      (filtroMese === '' || m.mese === filtroMese) &&
                      (filtroAnno === '' || m.anno === filtroAnno) &&
                      (filtroStato === '' ||
                        (filtroStato === 'da_approvare' && (m.stato === 'inviato' || m.stato === 'rifiutato')) ||
                        (filtroStato === 'reinviato' && m.stato === 'reinviato') ||
                        (filtroStato === 'approvato' && m.stato === 'approvato')
                      )
                    ))
                    .map((m) => (
                      <tr key={`${m.dipendente_id}-${m.mese}-${m.anno}`} className="approvazioni-table-row">
                        <td
                          className="approvazioni-table-cell-clickable"
                          onClick={() => navigate(`/admin/approvazioni/${m.dipendente_id}/${m.mese}/${m.anno}`)}
                        >
                          {m.dipendente_nome}
                        </td>
                        <td>{m.mese}/{m.anno}</td>
                        <td>{m.totale_giorni}</td>
                        <td>{Number(m.totale_ore_ordinarie || 0).toFixed(2)}</td>
                        <td>{Number(m.totale_ore_eccedenti || 0).toFixed(2)}</td>
                        <td>{Number(m.totale_ore_straordinarie || 0).toFixed(2)}</td>
                        <td>
                          <span className={`approvazioni-stato-badge ${getStatoClass(m.stato)}`}>
                            {getStatoLabel(m.stato)}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Approvazioni