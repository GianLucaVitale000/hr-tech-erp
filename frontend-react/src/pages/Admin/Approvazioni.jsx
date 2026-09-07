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
  const navigate = useNavigate()

  const NOMI_MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']

useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setLoading(true)
  getPresenzeInAttesa()
    .then((res) => setMesi(res.data))
    .finally(() => setLoading(false))
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

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ margin: '0 0 2rem 0', lineHeight: '1.2' }}>Approvazione Fogli Ore</h1>

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
              .map((m, i) => {
              const getStatoLabel = () => {
                switch(m.stato) {
                  case 'inviato':
                  case 'rifiutato':
                    return 'Da approvare';
                  case 'reinviato':
                    return 'Da approvare (Reinviato)';
                  case 'approvato':
                    return 'Approvato';
                  default:
                    return m.stato || 'Sconosciuto';
                }
              };

              const getStatoStyle = () => {
                switch(m.stato) {
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
                <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
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
                      ...getStatoStyle()
                    }}>
                      {getStatoLabel()}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  )
}

export default Approvazioni
