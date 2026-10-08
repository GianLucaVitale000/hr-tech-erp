import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDipendenti } from '../../services/dipendentiService'
import DipendenteModal from '../../components/Admin/DipendenteModal'

function getOreSettimanaliVisualizzate(dipendente) {
  const isPartTime = Number(dipendente.percentuale_part_time ?? 100) < 100
  const oreDistribuzione = (dipendente.orari_settimanali || [])
    .reduce((totale, giorno) => totale + Number(giorno.ore_giornaliere_previste || 0), 0)

  if (isPartTime && oreDistribuzione > 0) {
    return oreDistribuzione
  }

  const orePersonalizzate = Number(dipendente.ore_settimanali)
  if (orePersonalizzate > 0) return orePersonalizzate

  const oreContrattuali = Number(dipendente.contratto?.ore_settimanali_teoriche)
  return oreContrattuali > 0 ? oreContrattuali : 40
}

function Dipendenti() {
  const [dipendenti, setDipendenti] = useState([])
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [selectedDipendenteId, setSelectedDipendenteId] = useState(null)
  const navigate = useNavigate()

  // Rileva se è mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return dateStr
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      return `${day}/${month}/${year}`
    } catch {
      return dateStr
    }
  }

  useEffect(() => {
    getDipendenti()
      .then((res) => setDipendenti(res.data))
      .catch(() => console.error('Errore nel caricamento dipendenti'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="dipendenti-container">
      <div className="dipendenti-header">
        <div className="dipendenti-header-content">
          <h1 className="dipendenti-title">Anagrafica Dipendenti</h1>
          <button
            onClick={() => navigate('/admin/dipendenti/nuovo')}
            className="dipendenti-add-button"
          >
            + Nuovo Dipendente
          </button>
        </div>
      </div>

      {loading ? (
        <p>Caricamento...</p>
      ) : dipendenti.length === 0 ? (
        <p className="dipendenti-empty">Nessun dipendente trovato.</p>
      ) : isMobile ? (
        <div className="dipendenti-mobile-list">
        {dipendenti.map((d) => {
          const oreSettimanali = getOreSettimanaliVisualizzate(d)
            return (
              <div key={d.id} className="dipendenti-card">
                <div className="dipendenti-card-fields">
                  <div className="dipendenti-card-field">
                    <span className="dipendenti-card-label">Nome e Cognome:</span>
                    <span 
                      className="dipendenti-card-value" 
                      onClick={() => setSelectedDipendenteId(d.id)}
                      style={{ color: '#4f46e5', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      {d.user?.name}
                    </span>
                  </div>
                  <div className="dipendenti-card-field">
                    <span className="dipendenti-card-label">Cod. Fisc.:</span>
                    <span className="dipendenti-card-value dipendenti-card-value-codfiscale">{d.codice_fiscale || '-'}</span>
                  </div>
                  <div className="dipendenti-card-field">
                    <span className="dipendenti-card-label">Mansione:</span>
                    <span className="dipendenti-card-value">{d.mansione || '-'}</span>
                  </div>
                  <div className="dipendenti-card-field">
                    <span className="dipendenti-card-label">Orario Settimanale:</span>
                    <span className="dipendenti-card-value">{oreSettimanali}</span>
                  </div>
                  <div className="dipendenti-card-field">
                    <span className="dipendenti-card-label">Livello:</span>
                    <span className="dipendenti-card-value">{d.livello || '-'}</span>
                  </div>
                  <div className="dipendenti-card-field">
                    <span className="dipendenti-card-label">CCNL applicato:</span>
                    <span className="dipendenti-card-value">{d.contratto?.codice_cnel || '-'}</span>
                  </div>
                  <div className="dipendenti-card-field">
                    <span className="dipendenti-card-label">% Part-Time:</span>
                    <span className="dipendenti-card-value">{d.percentuale_part_time ? `${d.percentuale_part_time}%` : '100%'}</span>
                  </div>
                  <div className="dipendenti-card-field">
                    <span className="dipendenti-card-label">GG. Lavorativi Settimanali:</span>
                    <span className="dipendenti-card-value">{d.giorni_lavorativi_settimanali || '5'}</span>
                  </div>
                  <div className="dipendenti-card-field">
                    <span className="dipendenti-card-label">Data Assunzione:</span>
                    <span className="dipendenti-card-value">{formatDate(d.data_assunzione)}</span>
                  </div>
                </div>
                <div className="dipendenti-card-actions">
                  <button
                    onClick={() => navigate(`/admin/dipendenti/${d.id}/edit`)}
                    className="dipendenti-card-button"
                  >
                    Modifica
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="dipendenti-table-container">
          <table className="dipendenti-table">
            <thead>
              <tr className="dipendenti-table-header">
                <th>Nome e Cognome</th>
                <th>Codice Fiscale</th>
                <th>Mansione</th>
                <th>Ore Sett.</th>
                <th>Liv.</th>
                <th>CCNL</th>
                <th>% PT</th>
                <th>GG.</th>
                <th>Data Assunz.</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {dipendenti.map((d) => (
                <tr key={d.id} className="dipendenti-table-row">
                  <td>
                    <span
                      onClick={() => setSelectedDipendenteId(d.id)}
                      style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: '500', textDecoration: 'underline' }}
                    >
                      {d.user?.name}
                    </span>
                  </td>
                  <td className="dipendenti-table-cell-codfiscale">{d.codice_fiscale || '-'}</td>
                  <td
                    className="dipendenti-table-cell-mansione"
                    title={!isMobile ? (d.mansione || '-') : undefined}
                  >
                    {d.mansione || '-'}
                  </td>
                  <td>
                    {getOreSettimanaliVisualizzate(d)}
                  </td>
                  <td>{d.livello || '-'}</td>
                  <td>{d.contratto?.codice_cnel || '-'}</td>
                  <td>
                    {d.percentuale_part_time ? `${d.percentuale_part_time}%` : '100%'}
                  </td>
                  <td>
                    {d.giorni_lavorativi_settimanali || '5'}
                  </td>
                  <td>{formatDate(d.data_assunzione)}</td>
                  <td>
                    <button
                      onClick={() => navigate(`/admin/dipendenti/${d.id}/edit`)}
                      className="dipendenti-table-button"
                    >
                      Modifica
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedDipendenteId && (
        <DipendenteModal
          dipendenteId={selectedDipendenteId}
          onClose={() => setSelectedDipendenteId(null)}
        />
      )}
    </div>
  )
}

export default Dipendenti