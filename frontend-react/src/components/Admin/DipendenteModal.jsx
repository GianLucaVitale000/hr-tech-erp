import { useState, useEffect } from 'react'
import { getDipendente } from '../../services/dipendentiService'
import '../../styles/admin-pages.css'

const GIORNI_SETTIMANA = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']

const getGiornoNome = (valore) => {
  if (valore === null || valore === undefined) return '-'
  const num = Number(valore)
  if (num === 7) return 'Domenica'
  return GIORNI_SETTIMANA[num] || valore
}

const formatRateo = (valore) => {
  if (valore === null || valore === undefined || isNaN(valore)) return '-'
  return `${Number(valore).toFixed(2)} ore`
}

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

function DipendenteModal({ dipendenteId, onClose }) {
  const [dipendente, setDipendente] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDipendente(dipendenteId)
      .then((res) => {
        setDipendente(res.data)
      })
      .catch((err) => console.error('Errore nel caricamento dettagli dipendente', err))
      .finally(() => setLoading(false))
  }, [dipendenteId])

  return (
    <div className="dipendente-modal-overlay" onClick={onClose}>
      <div className="dipendente-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dipendente-modal-header">
          <h2 className="dipendente-modal-title">Riepilogo Dati Dipendente</h2>
          <button className="dipendente-modal-close" onClick={onClose}>&times;</button>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '40px' }}>Caricamento dati in corso...</p>
        ) : !dipendente ? (
          <p style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>Impossibile caricare i dati del dipendente.</p>
        ) : (
          <div>
            <div className="dipendente-modal-body">
              <div className="dipendente-modal-field">
                <strong>Nome e Cognome:</strong>{' '}
                <span>{dipendente.user?.name || '-'}</span>
              </div>
              <div className="dipendente-modal-field">
                <strong>Email:</strong>{' '}
                <span>{dipendente.user?.email || '-'}</span>
              </div>
              <div className="dipendente-modal-field">
                <strong>Codice Fiscale:</strong>{' '}
                <span>{dipendente.codice_fiscale || '-'}</span>
              </div>
              <div className="dipendente-modal-field">
                <strong>IBAN:</strong>{' '}
                <span>{dipendente.iban || '-'}</span>
              </div>
              <div className="dipendente-modal-field">
                <strong>Sesso:</strong>{' '}
                <span>{dipendente.sesso || '-'}</span>
              </div>
              <div className="dipendente-modal-field">
                <strong>Mansione:</strong>{' '}
                <span>{dipendente.mansione || '-'}</span>
              </div>
              <div className="dipendente-modal-field">
                <strong>Livello:</strong>{' '}
                <span>{dipendente.livello || '-'}</span>
              </div>
              <div className="dipendente-modal-field">
                <strong>CCNL applicato:</strong>{' '}
                <span>{dipendente.contratto ? `${dipendente.contratto.codice_cnel || ''} - ${dipendente.contratto.nome_contratto}` : '-'}</span>
              </div>
              <div className="dipendente-modal-field">
                <strong>Durata:</strong>{' '}
                <span style={{ textTransform: 'capitalize' }}>{dipendente.tipo_contratto || '-'}</span>
              </div>
              <div className="dipendente-modal-field">
                <strong>Assunzione:</strong>{' '}
                <span>{formatDate(dipendente.data_assunzione)}</span>
              </div>
              <div className="dipendente-modal-field">
                <strong>Cessazione:</strong>{' '}
                <span>{formatDate(dipendente.data_scadenza_contratto)}</span>
              </div>
              <div className="dipendente-modal-field">
                <strong>% Part-Time:</strong>{' '}
                <span>{dipendente.percentuale_part_time ? `${dipendente.percentuale_part_time}%` : '100%'}</span>
              </div>
              <div className="dipendente-modal-field">
                <strong>GG. Lav. Sett.:</strong>{' '}
                <span>{dipendente.giorni_lavorativi_settimanali || '5'}</span>
              </div>
              <div className="dipendente-modal-field">
                <strong>R1:</strong>{' '}
                <span>{getGiornoNome(dipendente.R1)}</span>
              </div>
              <div className="dipendente-modal-field">
                <strong>R2:</strong>{' '}
                <span>{getGiornoNome(dipendente.R2)}</span>
              </div>
              <div className="dipendente-modal-field">
                <strong>Rateo Mese Ferie:</strong>{' '}
                <span>{formatRateo(dipendente.rateo_mensile_ferie)}</span>
              </div>
              <div className="dipendente-modal-field">
                <strong>Rateo Mese Permessi ROL:</strong>{' '}
                <span>{formatRateo(dipendente.rateo_mensile_permessi_rol)}</span>
              </div>
              <div className="dipendente-modal-field">
                <strong>Rateo Mese Ex Festività:</strong>{' '}
                <span>{formatRateo(dipendente.rateo_mensile_ex_festivita)}</span>
              </div>
            </div>

            {dipendente.orari_settimanali && dipendente.orari_settimanali.length > 0 && (
              <div className="dipendente-modal-section">
                <h3>Orario Settimanale</h3>
                <div className="dipendente-modal-orari-grid">
                  {dipendente.orari_settimanali.map((o) => (
                    <div key={o.id || o.giorno_settimana} className="dipendente-modal-orari-item">
                      <strong>{GIORNI_SETTIMANA[o.giorno_settimana] || 'Giorno'}:</strong>
                      <div>{Number(o.ore_giornaliere_previste || 0).toFixed(2)} ore</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default DipendenteModal
