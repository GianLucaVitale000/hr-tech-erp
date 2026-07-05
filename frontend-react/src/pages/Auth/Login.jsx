import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import api from '../../services/api'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showLoginForm, setShowLoginForm] = useState(false)
  const [isFading, setIsFading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setIsFading(true)
    }, 2000)

    const formTimer = setTimeout(() => {
      setShowLoginForm(true)
    }, 3000)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(formTimer)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await api.post('/login', { email, password })
      login(res.data.user, res.data.token)

      // Reindirizza in base al ruolo
      if (res.data.user.role === 'admin') {
        navigate('/admin')
      } else {
        navigate('/dipendente')
      }
    } catch {
      setError('Email o password non validi')
    } finally {
      setLoading(false)
    }
  }

  if (!showLoginForm) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'sans-serif',
        zIndex: 1000,
        opacity: isFading ? 0 : 1,
        transition: 'opacity 1s ease-out'
      }}>
        <h1 style={{
          color: 'white',
          fontSize: '3rem',
          textAlign: 'center',
          marginBottom: '2rem'
        }}>
          HR-Tech ERP
        </h1>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontFamily: 'sans-serif'
    }}>
      <div style={{
        width: '360px',
        padding: '2rem',
        border: '1px solid #ddd',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          HR-Tech ERP
        </h2>

        {error && (
          <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>
        )}

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              display: 'block',
              margin: '0 auto',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
