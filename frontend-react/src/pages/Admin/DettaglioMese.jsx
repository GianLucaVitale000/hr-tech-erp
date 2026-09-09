import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPresenze, aggiornaStatoMese } from '../../services/presenzeService'

const CAUSALI_LABEL = {
  lavoro: '-- Nessuna --',
  ferie: 'Ferie',
  permesso_rol: 'Permesso/ROL',
  permesso_retribuito: 'Permessi Retribuiti (PR)',
  permesso_non_retribuito: 'Permessi Non Retribuiti (PNR)',
  malattia: 'Malattia',
  maternita: 'Maternità',
  infortunio: 'Infortunio',
  assemblea: 'Assemblea',
  sciopero: 'Sciopero',
  cassa_integrazione: 'Cassa Integrazione',
}

const NOMI_MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']

function formattaData(dataIso) {
  if (!dataIso) return ''
  const [anno, mese, giorno] = dataIso.split('-')
  return `${giorno}-${mese}-${anno}`
}

function DettaglioMese() {
  const { dipendenteId, mese, anno } = useParams()
  const navigate = useNavigate()
  const [presenze, setPresenze] = useState([])
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

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
    getPresenze(dipendenteId, mese, anno)
      .then((res) => setPresenze(res.data))
      .finally(() => setLoading(false))
  }, [dipendenteId, mese, anno])

  const handleAzione = async (stato) => {
    await aggiornaStatoMese(parseInt(dipendenteId), parseInt(mese), parseInt(anno), stato)
    navigate('/admin/approvazioni')
  }

  if (loading) return <p style={{ padding: '2rem' }}>Caricamento...</p>

  const nomeDipendente = presenze[0]?.dipendente?.user?.name || ''
  const percentualePartTime = presenze[0]?.dipendente?.percentuale_part_time || 0
  const isFullTime = Number(percentualePartTime) === 100

  const totaleOrdinarie = presenze.reduce((acc, p) => acc + parseFloat(p.ore_ordinarie || 0), 0)
  const totaleEccedenti = presenze.reduce((acc, p) => acc + parseFloat(p.ore_eccedenti || 0), 0)
  const totaleStraordinarie = presenze.reduce((acc, p) => acc + parseFloat(p.ore_straordinarie || 0), 0)
  const stato = presenze[0]?.stato || ''

  const getStatoLabel = () => {
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

  const getStatoColor = () => {
    switch(stato) {
      case 'inviato':
      case 'rifiutato':
        return '#f3e8ff';
      case 'reinviato':
        return '#fde68a';
      case 'approvato':
        return '#dcfce7';
      default:
        return '#f3e8ff';
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <button
        onClick={() => navigate('/admin/approvazioni')}
        style={{
          marginBottom: '1rem',
          padding: '0.4rem 0.8rem',
          backgroundColor: '#6b7280',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        ← Torna alla lista
      </button>

      <h1 style={{ margin: '0 0 1rem 0' }}>{nomeDipendente} — {NOMI_MESI[parseInt(mese) - 1]}-{anno}</h1>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '6px' }}>
          <strong>Ore Ordinarie:</strong> {Number(totaleOrdinarie).toFixed(2)}
        </div>
        {!isFullTime && (
          <div style={{ padding: '1rem', backgroundColor: '#fef3c7', borderRadius: '6px' }}>
            <strong>Ore Eccedenti:</strong> {Number(totaleEccedenti).toFixed(2)}
          </div>
        )}
        {isFullTime && (
          <div style={{ padding: '1rem', backgroundColor: '#fef3c7', borderRadius: '6px' }}>
            <strong>Straordinari:</strong> {Number(totaleStraordinarie).toFixed(2)}
          </div>
        )}
        <div style={{ padding: '1rem', backgroundColor: getStatoColor(), borderRadius: '6px' }}>
          <strong>Stato:</strong> {getStatoLabel()}
        </div>
      </div>

      {isMobile ? (
        // Versione mobile: card
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {presenze.map((p) => (
            <div key={p.id} style={{ backgroundColor: '#374151', borderRadius: '8px', padding: '1rem', border: '1px solid #4b5563' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid #4b5563' }}>
                  <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Data:</span>
                  <span style={{ color: 'white', fontSize: '0.95rem', fontWeight: '500' }}>{formattaData(p.data)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid #4b5563' }}>
                  <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Ore Ordinarie:</span>
                  <span style={{ color: 'white', fontSize: '0.95rem', fontWeight: '500' }}>{Number(p.ore_ordinarie || 0).toFixed(2)}</span>
                </div>
                {!isFullTime && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid #4b5563' }}>
                    <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Ore Eccedenti:</span>
                    <span style={{ color: 'white', fontSize: '0.95rem', fontWeight: '500' }}>{Number(p.ore_eccedenti || 0).toFixed(2)}</span>
                  </div>
                )}
                {isFullTime && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid #4b5563' }}>
                    <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Ore Straordinarie:</span>
                    <span style={{ color: 'white', fontSize: '0.95rem', fontWeight: '500' }}>{Number(p.ore_straordinarie || 0).toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid #4b5563' }}>
                  <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Causale:</span>
                  <span style={{ color: 'white', fontSize: '0.95rem', fontWeight: '500' }}>{CAUSALI_LABEL[p.causale] || p.causale}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                  <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Altro:</span>
                  <span style={{ color: 'white', fontSize: '0.95rem', fontWeight: '500' }}>{Number(p.ore_causale || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Versione desktop: tabella
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6', textAlign: 'center' }}>
              <th style={{ padding: '0.5rem' }}>Data</th>
              <th style={{ padding: '0.5rem' }}>Ore Ordinarie</th>
              {!isFullTime && <th style={{ padding: '0.5rem' }}>Ore Eccedenti</th>}
              {isFullTime && <th style={{ padding: '0.5rem' }}>Ore Straordinarie</th>}
              <th style={{ padding: '0.5rem' }}>Causale</th>
              <th style={{ padding: '0.5rem' }}>Altro</th>
            </tr>
          </thead>
          <tbody>
            {presenze.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.5rem' }}>{formattaData(p.data)}</td>
                <td style={{ padding: '0.5rem' }}>{Number(p.ore_ordinarie || 0).toFixed(2)}</td>
                {!isFullTime && <td style={{ padding: '0.5rem' }}>{Number(p.ore_eccedenti || 0).toFixed(2)}</td>}
                {isFullTime && <td style={{ padding: '0.5rem' }}>{Number(p.ore_straordinarie || 0).toFixed(2)}</td>}
                <td style={{ padding: '0.5rem' }}>{CAUSALI_LABEL[p.causale] || p.causale}</td>
                <td style={{ padding: '0.5rem' }}>{Number(p.ore_causale || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {(stato === 'inviato' || stato === 'rifiutato' || stato === 'reinviato') && (
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleAzione('approvato')}
            style={{
              padding: '0.6rem 1.2rem',
              backgroundColor: '#16a34a',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ✓ Approva Mese
          </button>
          <button
            onClick={() => handleAzione('rifiutato')}
            style={{
              padding: '0.6rem 1.2rem',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ✕ Rifiuta Mese
          </button>
        </div>
      )}
    </div>
  )
}

export default DettaglioMese