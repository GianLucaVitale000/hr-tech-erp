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

  if (loading) return <p className="dettaglio-mese-loading">Caricamento...</p>

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
        return 'Da approvare'
      case 'reinviato':
        return 'Da approvare (Reinviato)'
      case 'approvato':
        return 'Approvato'
      default:
        return stato || 'Sconosciuto'
    }
  }

  const getStatoBoxClass = () => {
    switch(stato) {
      case 'inviato':
      case 'rifiutato':
        return 'dettaglio-mese-info-box-stato'
      case 'reinviato':
        return 'dettaglio-mese-info-box-stato-reinviato'
      case 'approvato':
        return 'dettaglio-mese-info-box-stato-approvato'
      default:
        return 'dettaglio-mese-info-box-stato'
    }
  }

  return (
    <div className="dettaglio-mese-container">
      <button
        onClick={() => navigate('/admin/approvazioni')}
        className="dettaglio-mese-back-button"
      >
        ← Torna alla lista
      </button>

      <h1 className="dettaglio-mese-title">{nomeDipendente} <hr /> {NOMI_MESI[parseInt(mese) - 1]} {anno}</h1>

      <div className="dettaglio-mese-info-container">
        <div className="dettaglio-mese-info-box dettaglio-mese-info-box-ore-ordinarie">
          <strong>Ore Ordinarie:</strong> {Number(totaleOrdinarie).toFixed(2)}
        </div>
        {!isFullTime && (
          <div className="dettaglio-mese-info-box dettaglio-mese-info-box-ore-eccedenti">
            <strong>Ore Eccedenti:</strong> {Number(totaleEccedenti).toFixed(2)}
          </div>
        )}
        {isFullTime && (
          <div className="dettaglio-mese-info-box dettaglio-mese-info-box-straordinari">
            <strong>Straordinari:</strong> {Number(totaleStraordinarie).toFixed(2)}
          </div>
        )}
        <div className={`dettaglio-mese-info-box ${getStatoBoxClass()}`}>
          <strong>Stato:</strong> {getStatoLabel()}
        </div>
      </div>

      {isMobile ? (
        // Versione mobile: card
        <div className="dettaglio-mese-mobile-list">
          {presenze.map((p) => (
            <div key={p.id} className="dettaglio-mese-card">
              <div className="dettaglio-mese-card-fields">
                <div className="dettaglio-mese-card-field">
                  <span className="dettaglio-mese-card-label">Data:</span>
                  <span className="dettaglio-mese-card-value">{formattaData(p.data)}</span>
                </div>
                <div className="dettaglio-mese-card-field">
                  <span className="dettaglio-mese-card-label">Ore Ordinarie:</span>
                  <span className="dettaglio-mese-card-value">{Number(p.ore_ordinarie || 0).toFixed(2)}</span>
                </div>
                {!isFullTime && (
                  <div className="dettaglio-mese-card-field">
                    <span className="dettaglio-mese-card-label">Ore Eccedenti:</span>
                    <span className="dettaglio-mese-card-value">{Number(p.ore_eccedenti || 0).toFixed(2)}</span>
                  </div>
                )}
                {isFullTime && (
                  <div className="dettaglio-mese-card-field">
                    <span className="dettaglio-mese-card-label">Ore Straordinarie:</span>
                    <span className="dettaglio-mese-card-value">{Number(p.ore_straordinarie || 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="dettaglio-mese-card-field">
                  <span className="dettaglio-mese-card-label">Causale:</span>
                  <span className="dettaglio-mese-card-value">{CAUSALI_LABEL[p.causale] || p.causale}</span>
                </div>
                <div className="dettaglio-mese-card-field">
                  <span className="dettaglio-mese-card-label">Altro:</span>
                  <span className="dettaglio-mese-card-value">{Number(p.ore_causale || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Versione desktop: tabella
        <table className="dettaglio-mese-table">
          <thead>
            <tr className="dettaglio-mese-table-header">
              <th>Data</th>
              <th>Ore Ordinarie</th>
              {!isFullTime && <th>Ore Eccedenti</th>}
              {isFullTime && <th>Ore Straordinarie</th>}
              <th>Causale</th>
              <th>Altro</th>
            </tr>
          </thead>
          <tbody>
            {presenze.map((p) => (
              <tr key={p.id} className="dettaglio-mese-table-row">
                <td>{formattaData(p.data)}</td>
                <td>{Number(p.ore_ordinarie || 0).toFixed(2)}</td>
                {!isFullTime && <td>{Number(p.ore_eccedenti || 0).toFixed(2)}</td>}
                {isFullTime && <td>{Number(p.ore_straordinarie || 0).toFixed(2)}</td>}
                <td>{CAUSALI_LABEL[p.causale] || p.causale}</td>
                <td>{Number(p.ore_causale || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {(stato === 'inviato' || stato === 'rifiutato' || stato === 'reinviato') && (
        <div className="dettaglio-mese-actions">
          <button
            onClick={() => handleAzione('approvato')}
            className="dettaglio-mese-button dettaglio-mese-button-approva"
          >
            ✓ Approva Mese
          </button>
          <button
            onClick={() => handleAzione('rifiutato')}
            className="dettaglio-mese-button dettaglio-mese-button-rifiuta"
          >
            ✕ Rifiuta Mese
          </button>
        </div>
      )}
    </div>
  )
}

export default DettaglioMese