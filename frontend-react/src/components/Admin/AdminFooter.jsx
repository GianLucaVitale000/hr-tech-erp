import Logo from './Logo'

/**
 * AdminFooter - Footer fisso per l'area admin
 * Utilizza le classi CSS esistenti in admin.css per la formattazione
 */
function AdminFooter() {
  return (
    <footer className="admin-footer">
      <div>
        <Logo className="footer-logo" />
        <span className="hr-text">HR-Tech ERP</span>
        <span>|</span>
        <span className="copyright">© 2026 Tutti i diritti riservati.</span>
      </div>
    </footer>
  )
}

export default AdminFooter