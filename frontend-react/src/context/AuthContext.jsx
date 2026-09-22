import { useState } from 'react'
import { AuthContext } from './AuthContextValue'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    const rememberMe = localStorage.getItem('remember_me') === 'true'

    if (saved && rememberMe) {
      return JSON.parse(saved)
    }
    return saved ? JSON.parse(saved) : null
  })

  const [token, setToken] = useState(() => {
    // Carichiamo il token solo se remember_me è impostato (per security)
    const rememberMe = localStorage.getItem('remember_me') === 'true'
    if (rememberMe) {
      return localStorage.getItem('auth_token') || null
    }
    return localStorage.getItem('auth_token') || null
  })

  const login = (userData, authToken, rememberMe = false) => {
    setUser(userData)
    setToken(authToken)
    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.setItem('auth_token', authToken)

    if (rememberMe) {
      localStorage.setItem('remember_me', 'true')
    } else {
      localStorage.removeItem('remember_me')
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)

    // Se rememberMe è attivo, preserviamo token e utente per la prossima sessione
    const shouldRemember = localStorage.getItem('remember_me') === 'true'

    if (!shouldRemember) {
      localStorage.removeItem('user')
      localStorage.removeItem('auth_token')
      localStorage.removeItem('remember_me')
    }

    document.documentElement.removeAttribute('data-theme')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
