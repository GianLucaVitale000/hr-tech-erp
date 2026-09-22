import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import api from '../../services/api'
import Logo from '../../components/Admin/Logo'
import '../../styles/login.css'

function Login() {
  const [email, setEmail] = useState(() => {
    // Ripristina email se "Ricordami" era selezionato
    const saved = localStorage.getItem('remember_me') === 'true'
    if (saved) {
      try {
        const userData = JSON.parse(localStorage.getItem('user') || '{}')
        return userData.email || ''
      } catch {
        return ''
      }
    }
    return ''
  })
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showLoginForm, setShowLoginForm] = useState(false)
  const [isFading, setIsFading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('remember_me') === 'true'
  })

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
      login(res.data.user, res.data.token, rememberMe)

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
            <div className="login-input-wrapper">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="login-input"
              />
              {email && (
                <button
                  type="button"
                  className="login-input-clear"
                  onClick={() => setEmail('')}
                  aria-label="Pulisci email"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>
           <div className="login-form-group">
             <label className="login-label">Password</label>
            <div className="login-password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="login-input"
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="login-options">
            <label className="login-remember-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Ricordami
            </label>
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
