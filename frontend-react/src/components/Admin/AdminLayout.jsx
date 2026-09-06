import { Outlet } from 'react-router-dom'
import AdminNavbar from './AdminNavbar'
import AdminFooter from './AdminFooter'

/**
 * AdminLayout - Layout wrapper per l'area admin
 * Mostra la navbar desktop e il footer fissi
 * Il contenuto della pagina viene renderizzato tramite <Outlet />
 * Il layout mobile (hamburger/aside) viene gestito dalle singole pagine
 */
function AdminLayout() {
  return (
    <>
      <AdminNavbar />
      <div className="admin-content">
        <Outlet />
      </div>
      <AdminFooter />
    </>
  )
}

export default AdminLayout