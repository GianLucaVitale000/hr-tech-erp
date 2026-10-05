import Logo from '../Admin/Logo'

/**
 * DipendenteFooter - Footer fisso per l'area dipendente
 * Utilizza le classi CSS dedicate in dipendente.css per la formattazione
 */
function DipendenteFooter() {
  return (
    <footer className="dipendente-footer">
      <div>
        <Logo className="footer-logo" />
        <span className="hr-text">HR-Tech ERP</span>
        <span>|</span>
        <span className="copyright">© 2026 Tutti i diritti riservati.</span>
        <span>|</span>
        <span className="footer-links">
          <a href="/INFORMATIVA-PRIVACY-DIPENDENTI.pdf" target="_blank" rel="noreferrer">
            Informativa privacy
          </a>
          <a href="/COOKIE-STORAGE-POLICY.pdf" target="_blank" rel="noreferrer">
            Cookie e Web Storage
          </a>
        </span>
      </div>
    </footer>
  )
}

export default DipendenteFooter
