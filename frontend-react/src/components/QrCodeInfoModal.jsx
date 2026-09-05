import { useEffect } from 'react'

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
      description: 'A quel punto, appare il checkbox per il QR Code.'
    },
    {
      step: 3,
      title: 'Salva la riga',
      description: 'una prima volta, serve per salvare le impostazioni'
    },
    {
      step: 4,
      title: 'Attiva il QR Code',
      description: 'Spunta il checkbox "QR Code" e si aprirà una modale'
    },
    {
      step: 5,
      title: 'Configura la pausa',
      description: 'imposta nella modale la pausa, se necessario.'
    },
    {
      step: 6,
      title: 'Conferma',
      description: 'Clicca una seconda volta su "Salva"'
    }
  ]

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      backdropFilter: 'blur(4px)',
    }} onClick={(e) => {
      if (e.target === e.currentTarget) {
        onClose()
      }
    }}>
      <div style={{
        backgroundColor: '#1f2937',
        padding: '1.5rem',
        borderRadius: '12px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        maxWidth: '480px',
        width: '90%',
        maxHeight: '85vh',
        overflowY: 'auto',
        animation: 'fadeIn 0.2s ease-out',
      }}>
        <h2 style={{
          margin: '0 0 0.75rem 0',
          color: '#93c5fd',
          fontSize: '1.25rem',
          textAlign: 'center',
        }}>
          Rilevazione presenze con QR Code
        </h2>
        
        <p style={{
          color: '#9ca3af',
          fontSize: '0.85rem',
          textAlign: 'center',
          margin: '0 0 1.25rem 0',
          lineHeight: '1.4',
        }}>
          Per attivare la timbratura, segui questi passaggi:
        </p>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}>
          {steps.map((item) => (
            <div key={item.step} style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start',
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: '#2563eb',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                flexShrink: 0,
              }}>
                {item.step}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: '600',
                  color: '#f3f4f6',
                  fontSize: '0.9rem',
                  marginBottom: '0.15rem',
                }}>
                  {item.title}
                </div>
                <div style={{
                  color: '#9ca3af',
                  fontSize: '0.8rem',
                  lineHeight: '1.4',
                }}>
                  {item.description}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: '1.25rem',
            width: '100%',
            padding: '0.75rem',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
        >
          Ho capito
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

export default QrCodeInfoModal
