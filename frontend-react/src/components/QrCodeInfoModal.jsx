import { useEffect } from 'react'
import '../styles/QrCodeInfoModal.css'

/**
 * Modale informativa per la rilevazione presenze con QR Code
 * 
 * @param {Object} props
 * @param {Function} props.onClose - Callback per chiudere la modale
 */
function QrCodeInfoModal({ onClose }) {

  // Gestisci la chiusura con ESC
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const steps = [
    {
      step: 1,
      title: 'Sul foglio presenze',
      description: 'Lascia la causale settata su "-- Nessuna --"'
    },
    {
      step: 2,
      title: 'Seleziona "In sede"',
      description: 'Apparirà il checkbox per il QR Code.'
    },
    {
      step: 3,
      title: 'Salva la riga',
      description: 'Click su "Salva" una prima volta: serve per salvare le impostazioni del foglio presenze.'
    },
    {
      step: 4,
      title: 'Attiva il QR Code',
      description: 'Spuntando il checkbox "QR Code", si aprirà una finestra'
    },
    {
      step: 5,
      title: 'Configura la pausa',
      description: 'imposta la pausa, se prevista.'
    },
    {
      step: 6,
      title: 'Conferma',
      description: 'Click su "Salva" una seconda volta per confermare le modifiche.'
    }
  ]

  return (
    <div
      className="qrCodeInfoModal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="qrCodeInfoModal-content">
        <h2 className="qrCodeInfoModal-title">
          Rilevazione presenze con QR Code
        </h2>

        <p className="qrCodeInfoModal-subtitle">
          Per attivare la timbratura, segui questi passaggi:
        </p>

        <div className="qrCodeInfoModal-steps">
          {steps.map((item) => (
            <div key={item.step} className="qrCodeInfoModal-step">
              <div className="qrCodeInfoModal-stepNumber">
                {item.step}
              </div>
              <div className="qrCodeInfoModal-stepBody">
                <div className="qrCodeInfoModal-stepTitle">
                  {item.title}
                </div>
                <div className="qrCodeInfoModal-stepDescription">
                  {item.description}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          className="qrCodeInfoModal-closeButton"
          onClick={onClose}
        >
          Ho capito
        </button>
      </div>
    </div>
  )
}

export default QrCodeInfoModal