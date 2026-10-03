import { useEffect, useState } from 'react'
import { getComunicazioniPresenza, segnaComunicazioneComeLetta } from '../../services/presenzeService'

function ComunicazioniModal({ onClose }) {
  const [comunicazioni, setComunicazioni] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getComunicazioniPresenza()
      .then((response) => setComunicazioni(response.data))
      .catch(() => setError('Impossibile caricare le comunicazioni.'))
      .finally(() => setLoading(false))
  }, [])

  const handleRead = async (comunicazione) => {
    if (comunicazione.letto_at) return
    await segnaComunicazioneComeLetta(comunicazione.id)
    setComunicazioni((current) => current.map((item) => (
      item.id === comunicazione.id ? { ...item, letto_at: new Date().toISOString() } : item
    )))
  }

  return (
    <div className="comunicazioni-modal-overlay" onClick={onClose}>
      <div className="comunicazioni-modal" onClick={(event) => event.stopPropagation()}>
        <div className="comunicazioni-modal-header">
          <h2>Comunicazioni</h2>
          <button type="button" onClick={onClose} aria-label="Chiudi">×</button>
        </div>
        {loading && <p>Caricamento...</p>}
        {error && <p className="comunicazioni-modal-error">{error}</p>}
        {!loading && !error && comunicazioni.length === 0 && (
          <p>Nessuna comunicazione.</p>
        )}
        <div className="comunicazioni-modal-list">
          {comunicazioni.map((comunicazione) => (
            <button
              type="button"
              className={`comunicazione-item ${comunicazione.letto_at ? '' : 'is-unread'}`}
              key={comunicazione.id}
              onClick={() => handleRead(comunicazione)}
            >
              <span className="comunicazione-item-date">
                {new Date(comunicazione.created_at).toLocaleString('it-IT')}
              </span>
              <span>{comunicazione.messaggio}</span>
              <span className="comunicazione-item-period">
                Foglio ore: {String(comunicazione.mese).padStart(2, '0')}/{comunicazione.anno}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ComunicazioniModal
