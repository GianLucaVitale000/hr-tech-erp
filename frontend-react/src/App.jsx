import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Auth/Login'
import AdminDashboard from './pages/Admin/Dashboard'
import DipendenteDashboard from './pages/Dipendente/Dashboard'
import Dipendenti from './pages/Admin/Dipendenti'
import NuovoDipendente from './pages/Admin/NuovoDipendente'
import EditDipendente from './pages/Admin/EditDipendente'
import Timesheet from './pages/Dipendente/Timesheet'
import Approvazioni from './pages/Admin/Approvazioni'
import DettaglioMese from './pages/Admin/DettaglioMese'
import Contratti from './pages/Admin/Contratti'
import NuovoContratto from './pages/Admin/NuovoContratto'
import EditContratto from './pages/Admin/EditContratto'
import Utenti from './pages/Admin/Utenti'
import NuovoUtente from './pages/Admin/NuovoUtente'
import EditUtente from './pages/Admin/EditUtente'

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

          <Route path="/admin/contratti" element={
            <ProtectedRoute role="admin">
              <Contratti />
            </ProtectedRoute>
          } />

          <Route path="/admin/contratti/nuovo" element={
            <ProtectedRoute role="admin">
              <NuovoContratto />
            </ProtectedRoute>
          } />

          <Route path="/admin/contratti/:id/edit" element={
            <ProtectedRoute role="admin">
              <EditContratto />
            </ProtectedRoute>
          } />

          <Route path="/admin/utenti" element={
            <ProtectedRoute role="admin">
              <Utenti />
            </ProtectedRoute>
          } />

          <Route path="/admin/utenti/nuovo" element={
            <ProtectedRoute role="admin">
              <NuovoUtente />
            </ProtectedRoute>
          } />

          <Route path="/admin/utenti/:id/edit" element={
            <ProtectedRoute role="admin">
              <EditUtente />
            </ProtectedRoute>
          } />

          <Route path="/admin/dipendenti" element={
            <ProtectedRoute role="admin">
              <Dipendenti />
            </ProtectedRoute>
          } />

          <Route path="/admin/dipendenti/nuovo" element={
            <ProtectedRoute role="admin">
              <NuovoDipendente />
            </ProtectedRoute>
          } />

          <Route path="/admin/dipendenti/:id/edit" element={
            <ProtectedRoute role="admin">
              <EditDipendente />
            </ProtectedRoute>
          } />

          <Route path="/admin/approvazioni" element={
            <ProtectedRoute role="admin">
              <Approvazioni />
            </ProtectedRoute>
          } />

          <Route path="/admin/approvazioni/:dipendenteId/:mese/:anno" element={
            <ProtectedRoute role="admin">
              <DettaglioMese />
            </ProtectedRoute>
          } />

          <Route path="/dipendente" element={
            <ProtectedRoute role="dipendente">
              <DipendenteDashboard />
            </ProtectedRoute>
          } />

          <Route path="/dipendente/timesheet" element={
            <ProtectedRoute role="dipendente">
              <Timesheet />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
