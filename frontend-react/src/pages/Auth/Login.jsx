import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import api from '../../services/api'
import Logo from '../../components/Admin/Logo'
import '../../styles/login.css'

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
      <div className={`login-splash ${isFading ? 'fade-out' : ''}`}>
        <div className="login-logo-container">
          <Logo className="login-logo" />
          <span className="login-brand">HR-Tech ERP</span>
        </div>
      </div>
    )
  }

  return (
    <div className="login-container">
      <div className="login-card">
         <div className="login-logo-container">
          <Logo className="login-logo" />
          <span className="login-brand">HR-Tech ERP</span>
        </div>


        {error && (
          <p className="login-error">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-form-group">
            <label className="login-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="login-input"
            />
          </div>

          <div className="login-form-group">
            <label className="login-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="login-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="login-button"
          >
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
