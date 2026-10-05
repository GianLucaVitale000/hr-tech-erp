import { useEffect, useState } from 'react'
import { createPrivacyAcknowledgment, getPrivacyAcknowledgments } from '../../services/dipendentiService'

const initialForm = {
  document_version: '1.0',
  document_date: '2026-10-05',
  acknowledged_at: '',
  archive_method: 'external_signed_document',
  archive_reference: '',
  notes: '',
  admin_confirmation: false,
}

function PrivacyAcknowledgmentModal({ user, onClose, onSaved }) {
  const [history, setHistory] = useState([])
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const dipendente = user.dipendente

  useEffect(() => {
    getPrivacyAcknowledgments(dipendente.id)
      .then(({ data }) => setHistory(data))
      .catch(() => setError('Impossibile caricare lo storico privacy.'))
      .finally(() => setLoading(false))
  }, [dipendente.id])

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const { data } = await createPrivacyAcknowledgment(dipendente.id, form)
      setHistory((current) => [data, ...current])
      setForm(initialForm)
      onSaved()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Impossibile registrare la presa visione.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="privacy-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="privacy-modal" role="dialog" aria-modal="true" aria-labelledby="privacy-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="privacy-modal-header">
          <h2 id="privacy-modal-title">Informativa privacy dipendenti</h2>
          <button type="button" className="privacy-modal-close" onClick={onClose} aria-label="Chiudi">×</button>
        </div>

        <p className="privacy-modal-user">
          <strong>{user.name}</strong> · {user.email}
        </p>

        {error && <p className="privacy-modal-error">{error}</p>}

        <form onSubmit={handleSubmit} className="privacy-modal-form">
          <div className="privacy-modal-grid">
            <label>
              Versione
              <input name="document_version" value={form.document_version} onChange={handleChange} required maxLength={50} />
            </label>
            <label>
              Data documento
              <input type="date" name="document_date" value={form.document_date} onChange={handleChange} required />
            </label>
            <label>
              Data sottoscrizione
              <input type="date" name="acknowledged_at" value={form.acknowledged_at} onChange={handleChange} required />
            </label>
          </div>
          <label>
            Modalità di archiviazione
            <select name="archive_method" value={form.archive_method} onChange={handleChange}>
              <option value="external_signed_document">Documento firmato archiviato esternamente</option>
            </select>
          </label>
          <label>
            Riferimento archivio esterno
            <input name="archive_reference" value={form.archive_reference} onChange={handleChange} required maxLength={255} placeholder="Es. FASC-2026-0042" />
          </label>
          <label>
            Note
            <textarea name="notes" value={form.notes} onChange={handleChange} maxLength={5000} rows={3} />
          </label>
          <label className="privacy-modal-confirmation">
            <input type="checkbox" name="admin_confirmation" checked={form.admin_confirmation} onChange={handleChange} required />
            <span>Confermo di aver acquisito e archiviato la dichiarazione firmata di consegna e presa visione.</span>
          </label>
          <div className="privacy-modal-actions">
            <button type="button" className="privacy-modal-button secondary" onClick={onClose}>Annulla</button>
            <button type="submit" className="privacy-modal-button primary" disabled={saving}>
              {saving ? 'Salvataggio...' : 'Registra presa visione'}
            </button>
          </div>
        </form>

        <section className="privacy-modal-history">
          <h3>Storico registrazioni</h3>
          {loading ? <p>Caricamento...</p> : history.length === 0 ? <p>Nessuna registrazione.</p> : (
            <ul>
              {history.map((entry) => (
                <li key={entry.id}>
                  <strong>Informativa privacy dipendenti v{entry.document_version}</strong>
                  <span>Sottoscritta il {entry.acknowledged_at} · Registrata il {entry.created_at?.slice(0, 10)} da {entry.recorder?.name || 'Admin'}</span>
                  <span>Archivio: {entry.archive_reference}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

export default PrivacyAcknowledgmentModal
