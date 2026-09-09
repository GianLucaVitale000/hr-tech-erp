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

  useEffect(() => {
  const fetchData = async () => {
    setLoading(true) // Ora è all'interno di una funzione asincrona
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
        return 'Da approvare';
      case 'reinviato':
        return 'Da approvare (Reinviato)';
      case 'approvato':
        return 'Approvato';
      default:
        return stato || 'Sconosciuto';
    }
  };

  const getStatoStyle = (stato) => {
    switch(stato) {
      case 'inviato':
      case 'rifiutato':
        return { backgroundColor: '#fef3c7', color: '#92400e' };
      case 'reinviato':
        return { backgroundColor: '#fde68a', color: '#854d0e' };
      case 'approvato':
        return { backgroundColor: '#dcfce7', color: '#166534' };
      default:
        return { backgroundColor: '#f3f4f6', color: '#374151' };
    }
  };

  return (
    <div style={{ padding: '2.5rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ margin: '0 0 2rem 0', lineHeight: '1.2', fontSize: isMobile ? '1.75rem' : undefined }}>Approvazione Fogli Ore</h1>

      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}>
          <button
            onClick={() => {
              const oggi = new Date()
              handleExport(oggi.getMonth() + 1, oggi.getFullYear())
            }}
            style={{
              padding: '0.6rem 1.2rem',
              backgroundColor: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            📊 Export Excel Paghe (Mese Corrente)
          </button>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <select
              value={meseSelezionato}
              onChange={(e) => setMeseSelezionato(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '4px' }}
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
              style={{
                padding: '0.6rem 1.2rem',
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              disabled={!meseSelezionato || loadingApprovati}
            >
              📊 Export Excel Paghe ({meseSelezionato ? NOMI_MESI[parseInt(meseSelezionato.split('-')[0]) - 1] || meseSelezionato : '...'})
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <p>Caricamento...</p>
      ) : mesi.length === 0 ? (
        <p>Nessun foglio ore da visualizzare.</p>
      ) : (
        <>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontWeight: '500' }}>Dipendente:</label>
                <select
                  value={filtroDipendente}
                  onChange={(e) => setFiltroDipendente(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                >
                  <option value="">Tutti</option>
                  {[...new Set(mesi.map(m => m.dipendente_nome))].sort().map(nome => (
                    <option key={nome} value={nome}>{nome}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontWeight: '500' }}>Mese:</label>
                <select
                  value={filtroMese}
                  onChange={(e) => setFiltroMese(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                >
                  <option value="">Tutti</option>
                  {[...new Set(mesi.map(m => m.mese))].sort().map(mese => (
                    <option key={mese} value={mese}>{NOMI_MESI[parseInt(mese) - 1]}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontWeight: '500' }}>Anno:</label>
                <select
                  value={filtroAnno}
                  onChange={(e) => setFiltroAnno(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                >
                  <option value="">Tutti</option>
                  {[...new Set(mesi.map(m => m.anno))].sort((a, b) => b - a).map(anno => (
                    <option key={anno} value={anno}>{anno}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {isMobile ? (
            // Versione mobile: card
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {mesi
                .filter(m => (
                  (filtroDipendente === '' || m.dipendente_nome === filtroDipendente) &&
                  (filtroMese === '' || m.mese === filtroMese) &&
                  (filtroAnno === '' || m.anno === filtroAnno)
                ))
                .map((m) => (
                  <div key={m.dipendente_id} style={{ backgroundColor: '#374151', borderRadius: '8px', padding: '1rem', border: '1px solid #4b5563' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid #4b5563' }}>
                        <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Dipendente:</span>
                        <span
                          style={{ color: 'white', fontSize: '0.95rem', fontWeight: '500', cursor: 'pointer', textDecoration: 'underline' }}
                          onClick={() => navigate(`/admin/approvazioni/${m.dipendente_id}/${m.mese}/${m.anno}`)}
                        >
                          {m.dipendente_nome}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid #4b5563' }}>
                        <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Mese:</span>
                        <span style={{ color: 'white', fontSize: '0.95rem', fontWeight: '500' }}>{NOMI_MESI[parseInt(m.mese) - 1]} {m.anno}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid #4b5563' }}>
                        <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Giorni Inviati:</span>
                        <span style={{ color: 'white', fontSize: '0.95rem', fontWeight: '500' }}>{m.totale_giorni}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid #4b5563' }}>
                        <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Ore Ordinarie:</span>
                        <span style={{ color: 'white', fontSize: '0.95rem', fontWeight: '500' }}>{Number(m.totale_ore_ordinarie || 0).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid #4b5563' }}>
                        <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Ore Eccedenti:</span>
                        <span style={{ color: 'white', fontSize: '0.95rem', fontWeight: '500' }}>{Number(m.totale_ore_eccedenti || 0).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid #4b5563' }}>
                        <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Straordinari:</span>
                        <span style={{ color: 'white', fontSize: '0.95rem', fontWeight: '500' }}>{Number(m.totale_ore_straordinarie || 0).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                        <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Stato:</span>
                        <span style={{ color: 'white', fontSize: '0.95rem', fontWeight: '500' }}>
                          <span style={{ padding: '0.25rem 0.6rem', borderRadius: '12px', ...getStatoStyle(m.stato) }}>
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
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6', textAlign: 'center' }}>
                    <th style={{ padding: '0.75rem', minWidth: '150px' }}>Dipendente</th>
                    <th style={{ padding: '0.75rem', minWidth: '80px' }}>Mese</th>
                    <th style={{ padding: '0.75rem', minWidth: '100px' }}>Giorni Inviati</th>
                    <th style={{ padding: '0.75rem', minWidth: '100px' }}>Ore Ordinarie</th>
                    <th style={{ padding: '0.75rem', minWidth: '100px' }}>Ore Eccedenti</th>
                    <th style={{ padding: '0.75rem', minWidth: '100px' }}>Straordinari</th>
                    <th style={{ padding: '0.75rem', minWidth: '120px' }}>Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {mesi
                    .filter(m => (
                      (filtroDipendente === '' || m.dipendente_nome === filtroDipendente) &&
                      (filtroMese === '' || m.mese === filtroMese) &&
                      (filtroAnno === '' || m.anno === filtroAnno)
                    ))
                    .map((m) => {
                      return (
                        <tr key={m.dipendente_id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td
                            style={{ padding: '0.75rem', cursor: 'pointer', color: '#2563eb', textDecoration: 'underline' }}
                            onClick={() => navigate(`/admin/approvazioni/${m.dipendente_id}/${m.mese}/${m.anno}`)}
                          >
                            {m.dipendente_nome}
                          </td>
                          <td style={{ padding: '0.75rem' }}>{m.mese}/{m.anno}</td>
                          <td style={{ padding: '0.75rem' }}>{m.totale_giorni}</td>
                          <td style={{ padding: '0.75rem' }}>{Number(m.totale_ore_ordinarie || 0).toFixed(2)}</td>
                          <td style={{ padding: '0.75rem' }}>{Number(m.totale_ore_eccedenti || 0).toFixed(2)}</td>
                          <td style={{ padding: '0.75rem' }}>{Number(m.totale_ore_straordinarie || 0).toFixed(2)}</td>
                          <td style={{ padding: '0.75rem' }}>
                            <span style={{
                              padding: '0.25rem 0.6rem',
                              borderRadius: '12px',
                              ...getStatoStyle(m.stato)
                            }}>
                              {getStatoLabel(m.stato)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
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