import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createContratto } from '../../services/dipendentiService'

function NuovoContratto() {
  const [form, setForm] = useState({
    nome_contratto: '',
    codice_cnel: '',
    ore_settimanali_teoriche: 40,
    limite_straordinario_mensile: '',
    soglia_maggiorazione_1: '',
    soglia_maggiorazione_2: ''
  })
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Prepara i dati: converto i campi vuoti in null
    const data = { ...form }
    if (data.limite_straordinario_mensile === '') data.limite_straordinario_mensile = null
    if (data.soglia_maggiorazione_1 === '') data.soglia_maggiorazione_1 = null
    if (data.soglia_maggiorazione_2 === '') data.soglia_maggiorazione_2 = null

    try {
      await createContratto(data)
      navigate('/admin/contratti')
    } catch (err) {
      const message = err.response?.data?.message || 'Errore durante il salvataggio'
      setError(message)
    }
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '600px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => navigate('/admin')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: '1rem'
          }}
        >
          ← Dashboard
        </button>
        <h1 style={{ margin: 0 }}>Inserisci CCNL</h1>
      </div>

      {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Nome Contratto *
          </label>
          <input
            type="text"
            name="nome_contratto"
            value={form.nome_contratto}
            onChange={handleChange}
            required
            placeholder="Es: Metalmeccanici Industry 4.0"
            style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Codice CNEL
          </label>
          <input
            type="text"
            name="codice_cnel"
            value={form.codice_cnel}
            onChange={handleChange}
            placeholder="Es: CCNL_METAL_MECCANICI_2024"
            style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Ore Settimanali Teoriche *
          </label>
          <input
            type="number"
            name="ore_settimanali_teoriche"
            value={form.ore_settimanali_teoriche}
            onChange={handleChange}
            required
            min="0"
            step="1"
            placeholder="Es: 40"
            style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Limite Ore Straordinarie Mensili
          </label>
          <input
            type="number"
            name="limite_straordinario_mensile"
            value={form.limite_straordinario_mensile}
            onChange={handleChange}
            min="0"
            step="1"
            placeholder="Es: 200 (opzionale)"
            style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
          />
          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
            Limite mensile di ore straordinarie per questo CCNL
          </p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Soglia di Maggiorazione 1 (ore giornaliere)
          </label>
          <input
            type="number"
            name="soglia_maggiorazione_1"
            value={form.soglia_maggiorazione_1}
            onChange={handleChange}
            min="0"
            step="0.5"
            placeholder="Es: 8 (inizio maggiorazione 1° scaglione)"
            style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
          />
          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
            Soglia ore per attivare la prima maggiorazione retributiva
          </p>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Soglia di Maggiorazione 2 (ore giornaliere)
          </label>
          <input
            type="number"
            name="soglia_maggiorazione_2"
            value={form.soglia_maggiorazione_2}
            onChange={handleChange}
            min="0"
            step="0.5"
            placeholder="Es: 10 (inizio maggiorazione 2° scaglione)"
            style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
          />
          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
            Soglia ore per attivare la seconda maggiorazione retributiva
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            type="button"
            onClick={() => navigate('/admin/contratti')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Annulla
          </button>
          <button
            type="submit"
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Salva Contratto
          </button>
        </div>
      </form>
    </div>
  )
}

export default NuovoContratto
