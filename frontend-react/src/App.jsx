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
import Utenti from './pages/Admin/Utenti'
import NuovoUtente from './pages/Admin/NuovoUtente'
import EditUtente from './pages/Admin/EditUtente'
import AnalisiHR from './pages/Admin/AnalisiHR'
import Kiosk from './pages/Kiosk'
import KioskTest from './tools/KioskTest'
import AdminLayout from './components/Admin/AdminLayout'
import DipendenteLayout from './components/DipendenteLayout'

import './styles/admin.css'
import './styles/dipendente.css'
import './styles/dipendente-pages.css'
import './styles/kiosk.css'
import './styles/admin-pages.css'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* 🔹 Area Admin con Navbar e Footer */}
          <Route element={
            <ProtectedRoute role="admin">
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/contratti" element={<Contratti />} />
            <Route path="/admin/utenti" element={<Utenti />} />
            <Route path="/admin/utenti/nuovo" element={<NuovoUtente />} />
            <Route path="/admin/utenti/:id/edit" element={<EditUtente />} />
            <Route path="/admin/dipendenti" element={<Dipendenti />} />
            <Route path="/admin/dipendenti/nuovo" element={<NuovoDipendente />} />
            <Route path="/admin/dipendenti/:id/edit" element={<EditDipendente />} />
            <Route path="/admin/approvazioni" element={<Approvazioni />} />
            <Route path="/admin/approvazioni/:dipendenteId/:mese/:anno" element={<DettaglioMese />} />
            <Route path="/admin/analisi-hr" element={<AnalisiHR />} />
          </Route>

          {/* 🔹 Area Dipendente con Navbar e Footer */}
          <Route element={
            <ProtectedRoute role="dipendente">
              <DipendenteLayout />
            </ProtectedRoute>
          }>
            <Route path="/dipendente" element={<DipendenteDashboard />} />
            <Route path="/dipendente/timesheet" element={<Timesheet />} />
          </Route>

          {/* 🔹 Rotta PUBBLICA per il tablet in modalità kiosk (nessun auth richiesto) */}
          <Route path="/kiosk" element={<Kiosk />} />
          {/* 🔹 Rotta per emulazione kiosk durante lo sviluppo */}
          <Route path="/kiosk-test" element={<KioskTest />} />

          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
