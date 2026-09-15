import { useState } from 'react'
import { AuthContext } from './AuthContextValue'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })

  const [token, setToken] = useState(() => {
    return localStorage.getItem('auth_token') || null
  })

  const login = (userData, authToken) => {
    setUser(userData)
    setToken(authToken)
    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.setItem('auth_token', authToken)
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('user')
    localStorage.removeItem('auth_token')
    localStorage.removeItem('theme')
    document.documentElement.removeAttribute('data-theme')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
