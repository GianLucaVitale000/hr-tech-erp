import { useState, useEffect } from 'react'
import { useAuth } from '../../context/useAuth'
import { getMioProfilo, getAnalisiFerie } from '../../services/dipendentiService'
import { getPresenze } from '../../services/presenzeService'
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { getFestivitaItaliane } from '../../utils/analisiHRUtils'
import { isRiposoData } from '../../utils/foglioCompleto'

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const [yyyy, mm, dd] = dateStr.split('-')
  return `${dd}-${mm}-${yyyy}`
}

const GIORNI_SETTIMANA_MAP = {
  1: 'lunedì',
  2: 'martedì',
  3: 'mercoledì',
  4: 'giovedì',
  5: 'venerdì',
  6: 'sabato',
  7: 'domenica'
}

function DonutCard({ titolo, valore, totale, colore }) {
  
  return (
    <div className="dashboard-donut-card">
      <div className="dashboard-donut-title" style={{ color: colore }}>{titolo}</div>
      <div className="dashboard-donut-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={[
                { name: 'Valore', value: valore },
                { name: 'Rimanenti', value: Math.max(0, totale - valore) }
              ]}
              cx="50%" cy="50%" innerRadius={30} outerRadius={40}
              fill="#8884d8" dataKey="value" labelLine={false} isAnimationActive={false}
              stroke="var(--donut-stroke)"
              strokeWidth={1}
            >
              {[
                { name: 'Valore', fill: colore },
                { name: 'Rimanenti', fill: 'var(--card-bg)' }
              ].map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: 'var(--text-color)',
          fontSize: '0.75rem', fontWeight: '700'
        }}>
          <div>{valore} gg</div>
        </div>
      </div>
    </div>
  )
}

function DipendenteDashboard() {
  const { user } = useAuth()
  const [profilo, setProfilo] = useState(null)
  const [analisiFerie, setAnalisiFerie] = useState(null)
  const [presenzeAnno, setPresenzeAnno] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const oggi = new Date()
    const annoCorrente = oggi.getFullYear()

    const fetchData = async () => {
      try {
        setLoading(true)
        const profiloRes = await getMioProfilo()
        const dip = profiloRes.data
        setProfilo(dip)

        if (dip && dip.id) {
          const ferieRes = await getAnalisiFerie(dip.id, annoCorrente)
          setAnalisiFerie(ferieRes.data)

          const meseCorrente = oggi.getMonth() + 1
          let tuttePresenze = []
          for (let m = 1; m <= meseCorrente; m++) {
            try {
              const presRes = await getPresenze(dip.id, m, annoCorrente)
              if (presRes.data && Array.isArray(presRes.data)) {
                tuttePresenze = [...tuttePresenze, ...presRes.data]
              }
            } catch (e) {
              console.error(`Errore caricamento presenze mese ${m}:`, e)
            }
          }
          setPresenzeAnno(tuttePresenze)
        }
      } catch (err) {
        console.error('Errore caricamento dati dashboard dipendente:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const oggi = new Date()
  const annoCorrente = oggi.getFullYear()

  const calcolaTeoriciAnnoCorrente = (dip) => {
    if (!dip) return 0
    const startDate = new Date(annoCorrente, 0, 1)
    const endDate = new Date()
    const festivitaSet = new Set(getFestivitaItaliane(annoCorrente).map(f => f.toISOString().split('T')[0]))
    
    const riposiSet = new Set()
    const giorniSettimanali = dip.giorni_lavorativi_settimanali || 5
    if (giorniSettimanali === 5) {
      riposiSet.add(0)
      riposiSet.add(6)
    } else if (giorniSettimanali === 6) {
      riposiSet.add(0)
    }

    let count = 0
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay()
      const dateStr = d.toISOString().split('T')[0]

      if (riposiSet.has(dayOfWeek)) continue
      if (festivitaSet.has(dateStr)) continue
      count++
    }
    return count
  }

  const giorniTeoriciLavorabili = calcolaTeoriciAnnoCorrente(profilo)
  const percentualePartTime = Number(profilo?.percentuale_part_time ?? 100)
  const isPartTime = percentualePartTime < 100
  const oreDistribuiteSettimanali = (profilo?.orari_settimanali || [])
    .reduce((totale, giorno) => totale + Number(giorno.ore_giornaliere_previste || 0), 0)
  const oreSettimanaliBase = (() => {
    if (isPartTime && oreDistribuiteSettimanali > 0 && percentualePartTime > 0) {
      return oreDistribuiteSettimanali * 100 / percentualePartTime
    }

    const oreRegola = Number(profilo?.regola_calcolo?.ore_settimanali_teoriche)
    if (oreRegola > 0) return oreRegola

    const orePersonalizzate = Number(profilo?.ore_settimanali)
    if (orePersonalizzate > 0) return orePersonalizzate

    const oreContrattuali = Number(profilo?.contratto?.ore_settimanali_teoriche)
    if (oreContrattuali > 0) return oreContrattuali

    return 40
  })()
  const oreSettimanaliTempoPieno = oreSettimanaliBase
  const oreSettimanali = (() => {
    const orePersonalizzate = Number(profilo?.ore_settimanali)
    if (orePersonalizzate > 0) return orePersonalizzate

    const orePartTime = Number(profilo?.ore_settimanali_part_time)
    if (orePartTime > 0) return orePartTime

    const oreRegola = Number(profilo?.regola_calcolo?.ore_settimanali_teoriche)
    if (oreRegola > 0) return oreRegola

    const oreContrattuali = Number(profilo?.contratto?.ore_settimanali_teoriche)
    return oreContrattuali > 0 ? oreContrattuali : null
  })()
  const oreSettimanaliPartTime = oreSettimanaliBase * percentualePartTime / 100
  const ordineSettimanaLunedi = [1, 2, 3, 4, 5, 6, 0]
  const orariSettimanali = [...(profilo?.orari_settimanali || [])]
    .sort((a, b) => (
      ordineSettimanaLunedi.indexOf(Number(a.giorno_settimana)) -
      ordineSettimanaLunedi.indexOf(Number(b.giorno_settimana))
    ))
  const formatOrario = (orario) => orario ? String(orario).slice(0, 5) : '--:--'

  const oggiStr = oggi.toISOString().split('T')[0]
  const inizioAnnoStr = `${annoCorrente}-01-01`
  const presenzeFinoOggi = presenzeAnno.filter(p => p.data <= oggiStr)

  const giorniMalattia = presenzeFinoOggi.filter(p => 
    p.causale === 'malattia' && 
    Number(p.ore_causale || 0) > 0 && 
    !isRiposoData(profilo, p.data)
  ).length
  const giorniLavorati = presenzeFinoOggi.filter(p => p.causale === 'lavoro' && Number(p.ore_ordinarie || 0) > 0).length

  const mesePrecedenteDate = new Date(oggi.getFullYear(), oggi.getMonth(), 0)

  let ferieResiduoAnnoPrecedente = 0
  let ferieMaturateAnnoCorrente = 0
  let ferieGoduteAnnoCorrente = 0
  let ferieResiduoAggiornato = 0

  let permessiResiduoAnnoPrecedente = 0
  let permessiMaturatiAnnoCorrente = 0
  let permessiGodutiAnnoCorrente = 0
  let permessiResiduoAggiornato = 0

  if (analisiFerie && analisiFerie.ferie) {
    ferieResiduoAnnoPrecedente = Number(analisiFerie.ferie.residuo_anno_precedente) || 0
    ferieMaturateAnnoCorrente = Number(analisiFerie.ferie.maturate) || 0
    ferieGoduteAnnoCorrente = Number(analisiFerie.ferie.godute) || 0
    ferieResiduoAggiornato = Number(analisiFerie.ferie.residue) || 0
  }

  if (analisiFerie && analisiFerie.permessi_rol_ex_festivita) {
    permessiResiduoAnnoPrecedente = Number(analisiFerie.permessi_rol_ex_festivita.residuo_anno_precedente) || 0
    permessiMaturatiAnnoCorrente = Number(analisiFerie.permessi_rol_ex_festivita.maturati) || 0
    permessiGodutiAnnoCorrente = Number(analisiFerie.permessi_rol_ex_festivita.goduti) || 0
    permessiResiduoAggiornato = Number(analisiFerie.permessi_rol_ex_festivita.residui) || 0
  }

  return (
    <div className="dashboard-container">
      <h1 className="page-title">Dashboard Dipendente</h1>

      {loading ? (
        <p className="text-primary">Caricamento dati in corso...</p>
      ) : profilo ? (
        <div className="dashboard-page-wrapper">
          <div className="dashboard-profile-row">
            {/* Riepilogo anagrafica originario in testa */}
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
              <div>
                <strong>CCNL applicato:</strong> {profilo.contratto?.codice_cnel || '-'}
              </div>
              {formatDate(profilo.data_scadenza_contratto) && (
                <div>
                  <strong>Scadenza Contratto:</strong> {formatDate(profilo.data_scadenza_contratto)}
                </div>
              )}
              {isPartTime && (
                <div>
                  <strong>Ore Settimanali (full-time):</strong> {oreSettimanaliTempoPieno.toFixed(2)} h
                </div>
              )}
              {profilo.percentuale_part_time !== undefined && profilo.percentuale_part_time !== null && (
                <div>
                  <strong>Regime Orario:</strong> {Number(profilo.percentuale_part_time) === 100 ? 'Tempo Pieno' : `${profilo.percentuale_part_time}%`}
                </div>
              )}
              {isPartTime && (
                <div>
                  <strong>Ore Settimanali:</strong> {oreSettimanaliPartTime.toFixed(2)} h
                </div>
              )}
              {profilo.giorni_lavorativi_settimanali !== undefined && profilo.giorni_lavorativi_settimanali !== null && (
                <div>
                  <strong>GG. Lav. Settimanali:</strong> {profilo.giorni_lavorativi_settimanali}
                </div>
              )}
            </div>

            {isPartTime ? (
              <div className="weekly-hours-card weekly-schedule-card">
                <div className="weekly-hours-card-title">Calendario settimanale</div>
                {orariSettimanali.length > 0 ? (
                  <div className="weekly-schedule-list">
                    {orariSettimanali.map((orario) => {
                      const giorno = GIORNI_SETTIMANA_MAP[
                        Number(orario.giorno_settimana) === 0 ? 7 : Number(orario.giorno_settimana)
                      ]
                      const ore = Number(orario.ore_giornaliere_previste || 0)
                      const indiceRiposo = orariSettimanali
                        .filter((giornoOrario) => Number(giornoOrario.ore_giornaliere_previste || 0) === 0)
                        .findIndex((giornoOrario) => (
                          Number(giornoOrario.giorno_settimana) === Number(orario.giorno_settimana)
                        ))
                      const riposoLabel = indiceRiposo >= 0 && indiceRiposo < 2
                        ? `Riposo (R${indiceRiposo + 1})`
                        : 'Riposo'
                      return (
                        <div className="weekly-schedule-row" key={orario.giorno_settimana}>
                          <span className="weekly-schedule-day">{giorno}</span>
                          <span className="weekly-schedule-hours">{ore.toFixed(2)} h</span>
                          <span className="weekly-schedule-shifts">
                            {ore > 0
                              ? `${formatOrario(orario.turno1_dalle)}-${formatOrario(orario.turno1_alle)}${orario.turno2_dalle || orario.turno2_alle ? ` / ${formatOrario(orario.turno2_dalle)}-${formatOrario(orario.turno2_alle)}` : ''}`
                              : riposoLabel}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="weekly-schedule-empty">Distribuzione oraria non configurata</div>
                )}
              </div>
            ) : oreSettimanali !== null ? (
              <div className="weekly-hours-card">
                <div className="weekly-hours-card-title">Orario di lavoro</div>
                <div className="weekly-hours-card-value">{oreSettimanali.toFixed(2)} h</div>
                <div className="weekly-hours-card-subtitle">Settimanali</div>
              </div>
            ) : null}
          </div>

          {/* Contenitore a due colonne */}
          <div className="dashboard-grid-container">
            
            {/* Prima colonna: Riepilogo Presenze e Malattie con i donut */}
            <div >
              <h2 className="analisi-hr-card-title">
                Presenze / Malattie <br /> (dal {formatDate(inizioAnnoStr)} al {formatDate(oggiStr)})
              </h2>
              <div className="dashboard-donut-container"> 
                <DonutCard
                  titolo="Giorni Malattia"
                  valore={giorniMalattia}
                  totale={giorniTeoriciLavorabili}
                  colore="#ef4444"
                />
                <DonutCard
                  titolo="Giorni Lavorati"
                  valore={giorniLavorati}
                  totale={giorniTeoriciLavorabili}
                  colore="#10b981"
                />
              </div>
            </div>

            {/* Seconda colonna: Ferie e Permessi */}
            <div>
              <h2 className="analisi-hr-card-title">
                Ferie & Permessi <br /> (aggiornato a {mesePrecedenteDate.toLocaleDateString('it-IT', { month: 'numeric', year: 'numeric' })})
              </h2>
              <div className="dashboard-donut-card">
                
                <div style={{ display: 'flex', flexDirection: 'row', flex: 1 }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'row', justifyContent: 'space-around' }}>

                    <div>
                      <h3 className="analisi-hr-card-title" style={{ textAlign: 'left', marginBottom: '0.5rem' }}>Ferie</h3>
                      <div style={{ fontSize: '0.75rem', lineHeight: '1.4rem', textAlign: 'left' }}>
                        <div>Saldo A.P.: {ferieResiduoAnnoPrecedente.toFixed(2)} h</div>
                        <div>Maturato: {ferieMaturateAnnoCorrente.toFixed(2)} h</div>
                        <div>Goduto: {ferieGoduteAnnoCorrente.toFixed(2)} h</div>
                        <div>Residuo: <span style={{ backgroundColor: '#fff200', color: 'blue', padding: '0.1rem 0.5rem', borderRadius: '8px', fontWeight: 'bold' }}>{ferieResiduoAggiornato.toFixed(2)} h</span></div>
                      </div>
                    </div>

                    <div>
                      <h3 className="analisi-hr-card-title" style={{ textAlign: 'left', marginBottom: '0.5rem' }}>Permessi</h3>
                      <div style={{ fontSize: '0.75rem', lineHeight: '1.4rem', textAlign: 'left' }}>
                        <div>Saldo A.P.: {permessiResiduoAnnoPrecedente.toFixed(2)} h</div>
                        <div>Maturato: {permessiMaturatiAnnoCorrente.toFixed(2)} h</div>
                        <div>Goduto: {permessiGodutiAnnoCorrente.toFixed(2)} h</div>
                        <div>Residuo: <span style={{ backgroundColor: '#fff200', color: 'blue', padding: '0.1rem 0.35em', borderRadius: '8px', fontWeight: 'bold'}}>{permessiResiduoAggiornato.toFixed(2)} h</span></div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      ) : (
        <p className="text-primary">Nessun dato anagrafico disponibile.</p>
      )}

    </div>
  )
}

export default DipendenteDashboard
