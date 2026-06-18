import { useEffect, useState } from 'react'
import api from './services/api'

function App() {
  const [laravelStatus, setLaravelStatus] = useState('In attesa...')
  const [pythonStatus, setPythonStatus] = useState('In attesa...')

  useEffect(() => {
    // Test Laravel
    api.get('/ping')
      .then((res) => setLaravelStatus('✅ ' + res.data.message))
      .catch(() => setLaravelStatus('❌ Connessione non riuscita'))

    // Test Python
    fetch('http://localhost:8001')
      .then((res) => res.json())
      .then((data) => setPythonStatus('✅ ' + data.message))
      .catch(() => setPythonStatus('❌ Connessione non riuscita'))
  }, [])

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>HR-Tech ERP Light</h1>
      <p>Laravel: <strong>{laravelStatus}</strong></p>
      <p>Python:  <strong>{pythonStatus}</strong></p>
    </div>
  )
}

export default App
