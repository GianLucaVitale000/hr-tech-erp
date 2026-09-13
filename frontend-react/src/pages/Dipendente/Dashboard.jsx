import { useState, useEffect } from 'react'
import { useAuth } from '../../context/useAuth'
import { getMioProfilo } from '../../services/dipendentiService'

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const [yyyy, mm, dd] = dateStr.split('-')
  return `${dd}-${mm}-${yyyy}`
}

function DipendenteDashboard() {
  const { user } = useAuth()
  const [profilo, setProfilo] = useState(null)
  const [loading, setLoading] = useState(true)

  // Carica il profilo del dipendente loggato
  useEffect(() => {
    getMioProfilo()
      .then((res) => setProfilo(res.data))
      .catch((err) => console.error('Errore caricamento profilo:', err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="dashboard-container">
      <h1 className="page-title">Dashboard Dipendente</h1>

      {/* Riepilogo anagrafica */}
      {loading ? (
        <p className="text-primary">Caricamento dati anagrafici...</p>
      ) : profilo ? (
        <div className="profile-card">
          {user?.name && (
            <div>
              <strong>Nome:</strong> {user.name}
            </div>
          )}
          {profilo.codice_fiscale && (
            <div>
              <strong>Codice Fiscale:</strong> {profilo.codice_fiscale}
            </div>
          )}
          {profilo.tipo_contratto && (
            <div>
              <strong>Tipo Contratto:</strong>{' '}
              {profilo.tipo_contratto === 'indeterminato'
                ? 'Indeterminato'
                : 'Determinato'}
            </div>
          )}
          {formatDate(profilo.data_scadenza_contratto) && (
            <div>
              <strong>Scadenza Contratto:</strong> {formatDate(profilo.data_scadenza_contratto)}
            </div>
          )}
          {profilo.percentuale_part_time !== undefined && profilo.percentuale_part_time !== null && (
            <div>
              <strong>Regime Orario:</strong> {Number(profilo.percentuale_part_time) === 100 ? 'Tempo Pieno' : `${profilo.percentuale_part_time}%`}
            </div>
          )}
          {profilo.giorni_lavorativi_settimanali !== undefined && profilo.giorni_lavorativi_settimanali !== null && (
            <div>
              <strong>Giorni Settimanali:</strong> {profilo.giorni_lavorativi_settimanali}
            </div>
          )}
          {profilo.ore_giornaliere && (
            <div>
              <strong>Ore Giornaliere:</strong> {profilo.ore_giornaliere}
            </div>
          )}
        </div>
      ) : (
        <p className="text-primary">Nessun dato anagrafico disponibile.</p>
      )}

    </div>
  )
}

export default DipendenteDashboard
