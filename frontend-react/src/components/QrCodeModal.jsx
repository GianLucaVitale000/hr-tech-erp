import { useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'

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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      backdropFilter: 'blur(4px)',
    }} onClick={(e) => {
      // Chiudi se si clicca fuori dal modale
      if (e.target === e.currentTarget) {
        onClose()
      }
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        maxWidth: '400px',
        width: '90%',
        textAlign: 'center',
        animation: 'fadeIn 0.2s ease-out',
      }}>
        <h2 style={{
          margin: '0 0 1rem 0',
          color: '#1e3a8a',
          fontSize: '1.5rem',
        }}>
          QR Code Presenza
        </h2>
        
        <p style={{
          color: '#6b7280',
          fontSize: '0.9rem',
          margin: '0 0 1.5rem 0',
        }}>
          Giorno: <strong>{formatDate(presence?.data)}</strong>
        </p>

        <div style={{
          background: 'white',
          padding: '1rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          margin: '0 auto 1.5rem auto',
        }}>
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

        <div style={{
          background: '#f8fafc',
          padding: '0.75rem',
          borderRadius: '8px',
          margin: '0 auto 1rem auto',
          maxWidth: '350px',
        }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              value={qrToken || ''}
              readOnly
              style={{
                flex: 1,
                padding: '0.5rem',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '0.75rem',
                backgroundColor: 'white',
                fontFamily: 'monospace',
                color: 'black',
              }}
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
              style={{
                padding: '0.5rem 0.75rem',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                whiteSpace: 'nowrap',
              }}
              title="Copia il token"
            >
              Copia Token
            </button>
          </div>
        </div>

        <p style={{
          color: '#6b7280',
          fontSize: '0.85rem',
          margin: '0 0 1rem 0',
        }}>
          Scade tra: <span ref={countdownRef} style={{ fontWeight: 'bold' }}>30</span> secondi
        </p>

        <p style={{
          color: '#4b5563',
          fontSize: '0.8rem',
          margin: '0 0 1.5rem 0',
          lineHeight: '1.4',
        }}>
          Mostra questo codice al tablet all'ingresso.<br />
          Il codice si aggiorna automaticamente ogni 25 secondi.
        </p>

        <button
          onClick={onClose}
          style={{
            padding: '0.75rem 2rem',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
        >
          Chiudi
        </button>
      </div>
      
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </div>
  )
}

export default QrCodeModal
