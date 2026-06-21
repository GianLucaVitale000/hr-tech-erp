import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Auth/Login'
import AdminDashboard from './pages/Admin/Dashboard'
import DipendenteDashboard from './pages/Dipendente/Dashboard'
import Dipendenti from './pages/Admin/Dipendenti'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/admin" element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } />

          <Route path="/admin/dipendenti" element={
            <ProtectedRoute role="admin">
              <Dipendenti />
            </ProtectedRoute>
          } />

          <Route path="/dipendente" element={
            <ProtectedRoute role="dipendente">
              <DipendenteDashboard />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
