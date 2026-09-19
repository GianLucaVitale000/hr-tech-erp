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
      </div>
    </footer>
  )
}

export default DipendenteFooter
