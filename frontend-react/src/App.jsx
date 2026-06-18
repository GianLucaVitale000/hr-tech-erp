import { useEffect, useState } from 'react'
import api from './services/api'

function App() {
  const [status, setStatus] = useState('In attesa...')

  useEffect(() => {
    api.get('/ping')
      .then((res) => setStatus('✅ ' + res.data.message))
      .catch(() => setStatus('❌ Connessione non riuscita'))
  }, [])

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>HR-Tech ERP Light</h1>
      <p>Stato connessione Laravel: <strong>{status}</strong></p>
    </div>
  )
}

export default App
