import { useEffect, useRef, useState } from 'react'
import { scanQrCode } from '../services/presenzeService'

/**
 * Pagina Kiosk per il tablet all'ingresso
 * Mostra lo scanner QR code e registra le presenze
 */
function Kiosk() {
  const [feedback, setFeedback] = useState('Inquadra il tuo QR Code...')
  const [feedbackType, setFeedbackType] = useState('normal')
  const [scannerActive, setScannerActive] = useState(true)
  const scannerRef = useRef(null)
  
  // Token fisso per il tablet (da configurare in .env del frontend)
  // In produzione, questo token va salvato in una variabile d'ambiente
  const KIOSK_TOKEN = import.meta.env.VITE_KIOSK_TOKEN || 'tablet_kiosk_secret_token_12345'

  // Carica la libreria HTML5 QR Code
  useEffect(() => {
    const loadScanner = async () => {
      try {
        // Carica lo script della libreria
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/html5-qrcode@2.3.8/minified/html5-qrcode-scanner-js.min.js'
        script.async = true
        script.onload = initScanner
        document.body.appendChild(script)
        
        return () => {
          document.body.removeChild(script)
        }
      } catch (error) {
        console.error('Errore nel caricare lo scanner:', error)
        setFeedback('Errore nel caricare lo scanner')
        setFeedbackType('error')
      }
    }
    
    loadScanner()
    
    return () => {
      // Pulizia dello scanner
      if (scannerRef.current) {
        try {
          scannerRef.current.clear()
        } catch (e) {
          // Ignora errori di pulizia
        }
      }
    }
  }, [])

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

  // Gestisci la scansione confermata
  const onScanSuccess = async (decodedText, decodedResult) => {
    // Sospendi lo scanner per evitare letture multiple
    if (scannerRef.current) {
      scannerRef.current.pause()
    }
    setScannerActive(false)
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
        setScannerActive(true)
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
        setScannerActive(true)
        setFeedback('Inquadra il tuo QR Code...')
        setFeedbackType('normal')
      }, 5000)
    }
  }

  // Gestisci errori di scansione
  const onScanError = (error) => {
    console.warn('Errore di scansione:', error)
    // Non mostrare l'errore all'utente (è normale che ci siano errori temporanei)
  }

  // Stili
  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)',
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    title: {
      fontSize: '2rem',
      marginBottom: '1rem',
      textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
    },
    scannerContainer: {
      background: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '20px',
      padding: '20px',
      marginBottom: '20px',
      backdropFilter: 'blur(10px)',
      width: '100%',
      maxWidth: '600px',
    },
    reader: {
      width: '100%',
      maxWidth: '500px',
      height: '400px',
      margin: '0 auto',
      borderRadius: '10px',
      overflow: 'hidden',
    },
    feedback: {
      fontSize: '1.5rem',
      padding: '20px',
      margin: '10px auto',
      borderRadius: '10px',
      maxWidth: '600px',
      textAlign: 'center',
      transition: 'all 0.3s ease',
    },
    feedbackNormal: {
      background: 'rgba(255, 255, 255, 0.2)',
      color: 'white',
    },
    feedbackSuccess: {
      background: 'rgba(34, 197, 94, 0.9)',
      color: 'white',
    },
    feedbackError: {
      background: 'rgba(239, 68, 68, 0.9)',
      color: 'white',
    },
    instructions: {
      background: 'rgba(255, 255, 255, 0.1)',
      padding: '15px',
      borderRadius: '10px',
      marginTop: '10px',
      fontSize: '0.9rem',
      textAlign: 'center',
    },
  }

  // Determina lo stile del feedback
  const getFeedbackStyle = () => {
    switch (feedbackType) {
      case 'success':
        return { ...styles.feedback, ...styles.feedbackSuccess }
      case 'error':
        return { ...styles.feedback, ...styles.feedbackError }
      default:
        return { ...styles.feedback, ...styles.feedbackNormal }
    }
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🏢 Scanner Presenze HR-Tech</h1>
      
      <div style={styles.scannerContainer}>
        <div id="reader" style={styles.reader}></div>
      </div>
      
      <div style={getFeedbackStyle()}>
        {feedback}
      </div>
      
      <div style={styles.instructions}>
        Mostra il QR Code dal tuo smartphone con l'applicazione HR-Tech all'ingresso.<br />
        Il codice è valido per 30 secondi.
      </div>
    </div>
  )
}

export default Kiosk
