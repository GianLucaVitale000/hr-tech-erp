import { useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import '../../styles/QrCodeModal.css'

function getTokenExpiration(token) {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '='))
    const expiration = JSON.parse(json).exp

    return typeof expiration === 'number' ? expiration : null
  } catch {
    return null
  }
}

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
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // Il countdown riparte quando viene generato un nuovo token.
  useEffect(() => {
    const expiration = getTokenExpiration(qrToken)
    if (!expiration) {
      if (countdownRef.current) {
        countdownRef.current.textContent = '0'
      }
      onCloseRef.current()
      return undefined
    }

    const updateCountdown = () => {
      const seconds = Math.max(0, expiration - Math.floor(Date.now() / 1000))
      if (countdownRef.current) {
        countdownRef.current.textContent = String(seconds)
      }
      if (seconds === 0) {
        onCloseRef.current()
      }
    }

    updateCountdown()
    const timer = setInterval(updateCountdown, 250)

    return () => clearInterval(timer)
  }, [qrToken])

  // Gestisci la chiusura con ESC
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onCloseRef.current()
      }
    }
    
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [])

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
              src: '/favicon-light.png',
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
                const tokenToCopy = (qrToken || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim()
                navigator.clipboard.writeText(tokenToCopy)
                  .then(() => alert('Token copiato negli appunti!'))
                  .catch(() => {
                    // Fallback per browser vecchi
                    const textarea = document.createElement('textarea')
                    textarea.value = tokenToCopy
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
          Il codice resta valido per alcuni minuti.
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
