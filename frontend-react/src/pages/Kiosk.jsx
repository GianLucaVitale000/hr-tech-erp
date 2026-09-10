import { useEffect, useRef, useState, useCallback } from 'react'
import { scanQrCode } from '../services/presenzeService'
import '../styles/kiosk.css'

/**
 * Pagina Kiosk per il tablet all'ingresso
 * Mostra lo scanner QR code e registra le presenze
 */
function Kiosk() {
  const [feedback, setFeedback] = useState('Inquadra il tuo QR Code...')
  const [feedbackType, setFeedbackType] = useState('normal')
  const scannerRef = useRef(null)

  // Token fisso per il tablet (da configurare in .env del frontend)
  // In produzione, questo token va salvato in una variabile d'ambiente
  const KIOSK_TOKEN = import.meta.env.VITE_KIOSK_TOKEN || 'tablet_kiosk_secret_token_12345'

  // Gestisci la scansione confermata
  const onScanSuccess = useCallback(async (decodedText) => {
    // Sospendi lo scanner per evitare letture multiple
    if (scannerRef.current) {
      scannerRef.current.pause()
    }
    setFeedback('Elaborazione in corso...')
    setFeedbackType('normal')

    try {
      // Invia il token al backend
      const response = await scanQrCode(decodedText, KIOSK_TOKEN)

      if (response.error) {
        setFeedback(response.error)
        setFeedbackType('error')
      } else {
        setFeedback(response.message)
        setFeedbackType('success')

        // Se ci sono ore, mostrale dopo 1 secondo
        if (response.ore) {
          setTimeout(() => {
            setFeedback(`Ingresso registrato. Totale ore: ${response.ore}`)
          }, 1000)
        }
      }

      // Riattiva lo scanner dopo 5 secondi
      setTimeout(() => {
        if (scannerRef.current) {
          scannerRef.current.resume()
        }
        setFeedback('Inquadra il tuo QR Code...')
        setFeedbackType('normal')
      }, 5000)

    } catch (error) {
      console.error('Errore nella scansione:', error)
      setFeedback('Errore: ' + (error.message || 'QR Code non valido'))
      setFeedbackType('error')

      // Riattiva lo scanner dopo 5 secondi
      setTimeout(() => {
        if (scannerRef.current) {
          scannerRef.current.resume()
        }
        setFeedback('Inquadra il tuo QR Code...')
        setFeedbackType('normal')
      }, 5000)
    }
  }, [KIOSK_TOKEN])

  // Gestisci errori di scansione
  const onScanError = useCallback((error) => {
    console.warn('Errore di scansione:', error)
    // Non mostrare l'errore all'utente (è normale che ci siano errori temporanei)
  }, [])

  // Carica la libreria HTML5 QR Code
  useEffect(() => {
    // Inizializza lo scanner
    const initScanner = () => {
      if (window.Html5QrcodeScanner) {
        const scanner = new window.Html5QrcodeScanner(
          'reader',
          {
            fps: 10,
            qrbox: { width: 300, height: 300 },
            disableFlip: false,
          }
        )

        scannerRef.current = scanner
        scanner.render(onScanSuccess, onScanError)
      } else {
        setFeedback('Libreria scanner non caricata')
        setFeedbackType('error')
      }
    }

    const loadScanner = async () => {
      // Carica lo script della libreria
      const script = document.createElement('script')
      script.src = 'https://unpkg.com/html5-qrcode@2.3.8/minified/html5-qrcode-scanner-js.min.js'
      script.async = true
      script.onload = initScanner
      document.body.appendChild(script)

      return () => {
        document.body.removeChild(script)
      }
    }

    loadScanner()

    return () => {
      // Pulizia dello scanner
      if (scannerRef.current) {
        try {
          scannerRef.current.clear()
        } catch (e) {
          console.warn('Errore nella pulizia dello scanner:', e)
        }
      }
    }
  }, [onScanSuccess, onScanError])

  return (
    <div className="kiosk-container">
      <h1 className="kiosk-title">🏢 Scanner Presenze HR-Tech</h1>

      <div className="kiosk-scanner-container">
        <div id="reader" className="kiosk-reader"></div>
      </div>

      <div className={`kiosk-feedback kiosk-feedback-${feedbackType}`}>
        {feedback}
      </div>

      <div className="kiosk-instructions">
        Mostra il QR Code dal tuo smartphone con l'applicazione HR-Tech all'ingresso.<br />
        Il codice è valido per 30 secondi.
      </div>
    </div>
  )
}

export default Kiosk