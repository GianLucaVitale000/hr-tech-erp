import { useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import '../../styles/QrCodeModal.css'

/**
 * Modale per visualizzare il QR Code dinamico
 * 
 * @param {Object} props
 * @param {string} props.qrToken - Token JWT per il QR Code
 * @param {Object} props.presence - Oggetto presenza (data, ecc.)
 * @param {Function} props.onClose - Callback per chiudere la modale
 */
function QrCodeModal({ qrToken, presence, onClose }) {
  const countdownRef = useRef(null)
  
  // Avvia il countdown di 30 secondi
  useEffect(() => {
    let seconds = 30
    
    const timer = setInterval(() => {
      seconds--
      if (countdownRef.current) {
        countdownRef.current.textContent = seconds
      }
      
      if (seconds <= 0) {
        clearInterval(timer)
        onClose()
      }
    }, 1000)
    
    return () => clearInterval(timer)
  }, [onClose])

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

  // Formatta la data per il titolo
  const formatDate = (dateString) => {
    if (!dateString) return ''
    const [year, month, day] = dateString.split('-')
    return `${day}/${month}/${year}`
  }

  return (
    <div
      className="qrCodeModal-overlay"
      onClick={(e) => {
        // Chiudi se si clicca fuori dal modale
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="qrCodeModal-content">
        <h2 className="qrCodeModal-title">
          QR Code Presenza
        </h2>

        <p className="qrCodeModal-dateInfo">
          Giorno: <strong>{formatDate(presence?.data)}</strong>
        </p>

        <div className="qrCodeModal-qrWrapper">
          <QRCodeSVG
            value={qrToken || ''}
            size={256}
            level="H"
            includeMargin={true}
            imageSettings={{
              src: '/vite.svg',
              height: 24,
              width: 24,
              excavate: true,
            }}
          />
        </div>

        <div className="qrCodeModal-tokenBox">
          <div className="qrCodeModal-tokenRow">
            <input
              type="text"
              value={qrToken || ''}
              readOnly
              className="qrCodeModal-tokenInput"
              title="Seleziona e copia questo token per incollarlo in KioskTest"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(qrToken || '')
                  .then(() => alert('Token copiato negli appunti!'))
                  .catch(() => {
                    // Fallback per browser vecchi
                    const textarea = document.createElement('textarea')
                    textarea.value = qrToken || ''
                    document.body.appendChild(textarea)
                    textarea.select()
                    document.execCommand('copy')
                    document.body.removeChild(textarea)
                    alert('Token copiato!')
                  })
              }}
              className="qrCodeModal-copyButton"
              title="Copia il token"
            >
              Copia Token
            </button>
          </div>
        </div>

        <p className="qrCodeModal-countdown">
          Scade tra: <span ref={countdownRef} className="qrCodeModal-countdownValue">30</span> secondi
        </p>

        <p className="qrCodeModal-description">
          Mostra questo codice al tablet all'ingresso.<br />
          Il codice si aggiorna automaticamente ogni 25 secondi.
        </p>

        <button
          onClick={onClose}
          className="qrCodeModal-closeButton"
        >
          Chiudi
        </button>
      </div>
    </div>
  )
}

export default QrCodeModal
