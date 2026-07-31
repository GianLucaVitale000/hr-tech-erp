import { useState } from 'react'
import { scanQrCode } from '../services/presenzeService'

function KioskTest() {
  const [qrToken, setQrToken] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleScan = async (action) => {
    if (!qrToken.trim()) {
      setError('Inserisci il token QR')
      setTimeout(() => setError(''), 3000)
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      // Usa il token Kiosk da variabile d'ambiente o default per sviluppo
      const kioskToken = import.meta.env.VITE_KIOSK_TOKEN || 'test-kiosk-token'
      
      const response = await scanQrCode(qrToken, kioskToken)
      setResult({
        message: action === 'ingresso' 
          ? 'Ingresso registrato con successo!' 
          : 'Uscita registrata con successo!',
        data: response,
        action
      })
    } catch (err) {
      setError(err.message)
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  const handlePasteQrToken = () => {
    navigator.clipboard.readText()
      .then(text => setQrToken(text))
      .catch(() => alert('Non posso accedere agli appunti. Incollare manualmente.'))
  }

  return (
    <div style={{ 
      padding: '2rem', 
      fontFamily: 'sans-serif',
      maxWidth: '600px',
      margin: '0 auto',
      textAlign: 'center'
    }}>
      <h1 style={{ marginBottom: '2rem' }}>📱 Emulatore Kiosk</h1>
      
      <p style={{ marginBottom: '1.5rem', color: '#666' }}>
        Questa pagina emula il tablet in sede per testare la timbratura tramite QR Code.
        Incolla il token QR generato dal dipendente e clicca Ingresso o Uscita.
      </p>

      {error && (
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#fecaca', 
          color: '#b91c1c', 
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#dcfce7', 
          color: '#166534', 
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          <strong>{result.message}</strong>
          {result.data?.ore && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
              Ore lavorate: {Number(result.data.ore || 0).toFixed(2)}h
              {result.data.ore_ordinarie && (
                <span>, Ordinarie: {Number(result.data.ore_ordinarie).toFixed(2)}h</span>
              )}
              {result.data.ore_straordinarie && (
                <span>, Straordinarie: {Number(result.data.ore_straordinarie).toFixed(2)}h</span>
              )}
            </div>
          )}
          {result.data?.message && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
              {result.data.message}
            </div>
          )}
        </div>
      )}

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', textAlign: 'left' }}>
          Token QR (dal dipendente):
        </label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={qrToken}
            onChange={(e) => setQrToken(e.target.value)}
            placeholder="Incollare token QR qui..."
            style={{ 
              flex: 1, 
              padding: '0.75rem', 
              border: '2px solid #e2e8f0', 
              borderRadius: '8px',
              fontSize: '1rem'
            }}
          />
          <button
            onClick={handlePasteQrToken}
            style={{ 
              padding: '0.75rem 1rem', 
              backgroundColor: '#64748b', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px',
              cursor: 'pointer'
            }}
            title="Incolla dagli appunti"
          >
            Incolla Token
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button
          onClick={() => handleScan('ingresso')}
          disabled={loading || !qrToken.trim()}
          style={{ 
            padding: '1.5rem 2rem', 
            backgroundColor: loading ? '#93c5fd' : '#2563eb',
            color: 'white', 
            border: 'none', 
            borderRadius: '12px',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            cursor: (loading || !qrToken.trim()) ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            minWidth: '180px'
          }}
        >
          🔄 INGRESSO
        </button>
        
        <button
          onClick={() => handleScan('uscita')}
          disabled={loading || !qrToken.trim()}
          style={{ 
            padding: '1.5rem 2rem', 
            backgroundColor: loading ? '#93c5fd' : '#16a34a',
            color: 'white', 
            border: 'none', 
            borderRadius: '12px',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            cursor: (loading || !qrToken.trim()) ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            minWidth: '180px'
          }}
        >
          ✅ USCITA
        </button>
      </div>

      {loading && (
        <div style={{ marginTop: '1.5rem', color: '#64748b' }}>
          Elaborazione in corso...
        </div>
      )}

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '0.9rem' }}>Istruzioni:</h3>
        <ol style={{ textAlign: 'left', marginBottom: 0, paddingLeft: '1.5rem', fontSize: '0.85rem' }}>
          <li>Nel foglio presenze del dipendente, attiva "QR Code" per un giorno</li>
          <li>Clicca sul pulsante "Kiosk" per generare il token</li>
          <li>Copia il token QR dalla modale che si apre</li>
          <li>Incolla il token in questa pagina</li>
          <li>Clicca "INGRESSO" o "USCITA" per simulare la timbratura</li>
          <li>Torna al foglio presenze e aggiorna per vedere le ore calcolate</li>
        </ol>
      </div>
    </div>
  )
}

export default KioskTest
