import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import {
  creaComunicazionePresenza,
  getComunicazioniPresenza,
  getPresenze,
  aggiornaStatoMese,
} from '../../services/presenzeService'

const CAUSALI_LABEL = {
  lavoro: '-- Nessuna --',
  ferie: 'Ferie',
  permesso_rol: 'Permesso/ROL',
  permesso_retribuito: 'Permessi Retribuiti (PR)',
  permesso_non_retribuito: 'Permessi Non Retribuiti (PNR)',
  malattia: 'Malattia',
  maternita: 'Maternità',
  infortunio: 'Infortunio',
  assemblea: 'Assemblea',
  sciopero: 'Sciopero',
  cassa_integrazione: 'Cassa Integrazione',
}

const NOMI_MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']

function formattaData(dataIso) {
  if (!dataIso) return ''
  const [anno, mese, giorno] = dataIso.split('-')
  return `${giorno}-${mese}-${anno}`
}

const COLORS = {
  lavoro: '#b7e4c7',
  riposo: '#d1d5db',
  ferie: '#93c5fd',
  permesso_rol: '#93c5fd',
  permesso_retribuito: '#93c5fd',
  permesso_non_retribuito: '#93c5fd',
  malattia: '#fca5a5',
  infortunio: '#fca5a5',
  maternita: '#fca5a5',
  cassa_integrazione: '#fdba74',
}

const CAUSALI_BLU = ['ferie', 'permesso_rol', 'permesso_retribuito', 'permesso_non_retribuito']
const CAUSALI_ROSSO = ['malattia', 'infortunio', 'maternita']
const GIORNI_SETTIMANA = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
const MODALITA_LABEL = {
  in_sede: 'In sede',
  smart_working: 'SW',
  trasferta: 'Trasf.',
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function normalizeDateKey(value) {
  if (!value) return ''
  if (value instanceof Date) return toDateKey(value)
  return String(value).slice(0, 10)
}

function DettaglioMese() {
  const { dipendenteId, mese, anno } = useParams()
  const navigate = useNavigate()
  const [presenze, setPresenze] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [comunicazioni, setComunicazioni] = useState([])
  const [selectedPresenza, setSelectedPresenza] = useState(null)
  const [showRifiutoModal, setShowRifiutoModal] = useState(false)
  const [messaggioRifiuto, setMessaggioRifiuto] = useState('')
  const [savingCommunication, setSavingCommunication] = useState(false)
  const [communicationError, setCommunicationError] = useState('')

  useEffect(() => {
    let active = true

    const loadData = async () => {
      setLoading(true)
      setLoadError('')

      try {
        const presenzeResponse = await getPresenze(dipendenteId, mese, anno)
        if (active) setPresenze(presenzeResponse.data)
      } catch (error) {
        if (active) {
          setLoadError(error.response?.data?.message || 'Impossibile caricare le presenze.')
        }
      } finally {
        if (active) setLoading(false)
      }

      try {
        const comunicazioniResponse = await getComunicazioniPresenza({
          dipendente_id: dipendenteId,
          mese,
          anno,
        })
        if (active) setComunicazioni(comunicazioniResponse.data)
      } catch (error) {
        // Le comunicazioni sono opzionali: non devono impedire la visualizzazione delle presenze.
        console.error('Impossibile caricare le comunicazioni del foglio ore:', error)
      }
    }

    loadData()
    return () => {
      active = false
    }
  }, [dipendenteId, mese, anno])

  const handleAzione = async (stato) => {
    if (stato === 'rifiutato') {
      setCommunicationError('')
      setShowRifiutoModal(true)
      return
    }
    await aggiornaStatoMese(parseInt(dipendenteId), parseInt(mese), parseInt(anno), stato)
    navigate('/admin/approvazioni')
  }

  const confermaRifiuto = async () => {
    if (!messaggioRifiuto.trim()) {
      setCommunicationError('Inserisci la motivazione del rifiuto.')
      return
    }

    setSavingCommunication(true)
    setCommunicationError('')
    try {
      const response = await creaComunicazionePresenza({
        dipendente_id: parseInt(dipendenteId),
        mese: parseInt(mese),
        anno: parseInt(anno),
        messaggio: messaggioRifiuto.trim(),
      })
      setComunicazioni((current) => [response.data, ...current])
      await aggiornaStatoMese(parseInt(dipendenteId), parseInt(mese), parseInt(anno), 'rifiutato')
      navigate('/admin/approvazioni')
    } catch (error) {
      setCommunicationError(error.response?.data?.message || 'Impossibile salvare la comunicazione.')
    } finally {
      setSavingCommunication(false)
    }
  }

  const nomeDipendente = presenze[0]?.dipendente?.user?.name || ''
  const percentualePartTime = presenze[0]?.dipendente?.percentuale_part_time || 0
  const isFullTime = Number(percentualePartTime) === 100
  const oreExtraLabel = isFullTime ? 'Ore Straordinarie' : 'Ore Eccedenti'

  const totaleOrdinarie = presenze.reduce((acc, p) => acc + parseFloat(p.ore_ordinarie || 0), 0)
  const totaleEccedenti = presenze.reduce((acc, p) => acc + parseFloat(p.ore_eccedenti || 0), 0)
  const totaleStraordinarie = presenze.reduce((acc, p) => acc + parseFloat(p.ore_straordinarie || 0), 0)
  const stato = presenze[0]?.stato || ''

  const presenzaPerData = useMemo(
    () => Object.fromEntries(
      presenze.map((presenza) => [normalizeDateKey(presenza.data), presenza]),
    ),
    [presenze],
  )

  const orariSettimanali = useMemo(
    () => presenze[0]?.dipendente?.orari_settimanali || [],
    [presenze],
  )
  const orePerGiorno = useMemo(
    () => Object.fromEntries(
      orariSettimanali.map((orario) => [
        orario.giorno_settimana,
        Number(orario.ore_giornaliere_previste || 0),
      ]),
    ),
    [orariSettimanali],
  )

  const getDayCategory = useCallback((date) => {
    const presenza = presenzaPerData[toDateKey(date)]
    const orePreviste = orePerGiorno[date.getDay()] ?? (date.getDay() === 0 || date.getDay() === 6 ? 0 : 8)
    if (!presenza) return orePreviste > 0 ? 'lavoro' : 'riposo'

    const oreLavorate = Number(presenza.ore_ordinarie || 0)
    const oreCausale = Number(presenza.ore_causale || 0)
    if (oreLavorate > 0 && oreLavorate >= oreCausale) return 'lavoro'
    if (CAUSALI_ROSSO.includes(presenza.causale)) return presenza.causale
    if (presenza.causale === 'cassa_integrazione') return 'cassa_integrazione'
    if (CAUSALI_BLU.includes(presenza.causale)) return presenza.causale
    return presenza.causale || 'lavoro'
  }, [orePerGiorno, presenzaPerData])

  const calendarEvents = useMemo(() => {
    const lastDay = new Date(Number(anno), Number(mese), 0)
    const events = []
    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      const date = new Date(Number(anno), Number(mese) - 1, day)
      const presenza = presenzaPerData[toDateKey(date)]
      const oreExtra = isFullTime ? presenza?.ore_straordinarie : presenza?.ore_eccedenti
      const oreTotali = Number(presenza?.ore_ordinarie || 0) + Number(oreExtra || 0)
      if (presenza && oreTotali > 0) {
        events.push({
          date: toDateKey(date),
          allDay: true,
          title: `${MODALITA_LABEL[presenza.modalita_lavoro] || 'Modalità non indicata'} · ${oreTotali.toFixed(2)} h`,
          className: `dettaglio-mese-calendar-work-event dettaglio-mese-calendar-mode-${presenza.modalita_lavoro || 'non-indicata'}`,
        })
      }
    }
    return events
  }, [anno, mese, isFullTime, presenzaPerData])

  const handleDayCellMount = useCallback(({ date, el }) => {
    const isCurrentMonth = date.getFullYear() === Number(anno)
      && date.getMonth() === Number(mese) - 1
    if (!isCurrentMonth) {
      el.style.removeProperty('background-color')
      return
    }

    const category = getDayCategory(date)
    el.style.setProperty('background-color', COLORS[category] || COLORS.lavoro, 'important')
  }, [anno, getDayCategory, mese])

  if (loading) return <p className="dettaglio-mese-loading">Caricamento...</p>
  if (loadError) return <p className="dettaglio-mese-loading">{loadError}</p>

  const getStatoLabel = () => {
    switch(stato) {
      case 'inviato':
      case 'rifiutato':
        return 'Da approvare'
      case 'reinviato':
        return 'Da approvare (Reinviato)'
      case 'approvato':
        return 'Approvato'
      default:
        return stato || 'Sconosciuto'
    }
  }

  const getStatoBoxClass = () => {
    switch(stato) {
      case 'inviato':
      case 'rifiutato':
        return 'dettaglio-mese-info-box-stato'
      case 'reinviato':
        return 'dettaglio-mese-info-box-stato-reinviato'
      case 'approvato':
        return 'dettaglio-mese-info-box-stato-approvato'
      default:
        return 'dettaglio-mese-info-box-stato'
    }
  }

  return (
    <div className="dettaglio-mese-container">
      <button
        onClick={() => navigate('/admin/approvazioni')}
        className="dettaglio-mese-back-button"
      >
        ← Torna alla lista
      </button>

      <h1 className="dettaglio-mese-title">{nomeDipendente} <hr /> {NOMI_MESI[parseInt(mese) - 1]} {anno}</h1>

      <div className="dettaglio-mese-info-container">
        <div className="dettaglio-mese-info-box dettaglio-mese-info-box-ore-ordinarie">
          <strong>Ore Ordinarie:</strong> {Number(totaleOrdinarie).toFixed(2)}
        </div>
        {!isFullTime && (
          <div className="dettaglio-mese-info-box dettaglio-mese-info-box-ore-eccedenti">
            <strong>Ore Eccedenti:</strong> {Number(totaleEccedenti).toFixed(2)}
          </div>
        )}
        {isFullTime && (
          <div className="dettaglio-mese-info-box dettaglio-mese-info-box-straordinari">
            <strong>Straordinari:</strong> {Number(totaleStraordinarie).toFixed(2)}
          </div>
        )}
        <div className={`dettaglio-mese-info-box ${getStatoBoxClass()}`}>
          <strong>Stato:</strong> {getStatoLabel()}
        </div>
      </div>

      <section className="dettaglio-mese-calendar-section">
        <h2>Presenze del mese</h2>
        <p>Click/Tap sul giorno per i dettagli</p>
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          initialDate={`${anno}-${String(mese).padStart(2, '0')}-01`}
          headerToolbar={false}
          firstDay={1}
          fixedWeekCount={false}
          height="auto"
          dayHeaderContent={({ date }) => GIORNI_SETTIMANA[date.getDay()]}
          dayCellDidMount={handleDayCellMount}
          events={calendarEvents}
          dateClick={({ date }) => setSelectedPresenza(presenzaPerData[toDateKey(date)] || { data: toDateKey(date) })}
        />
        <div className="dettaglio-mese-calendar-legend">
          <span><i className="calendar-color lavoro" /> Lavoro</span>
          <span><i className="calendar-color riposo" /> Riposo</span>
          <span><i className="calendar-color ferie" /> Ferie/Permessi</span>
          <span><i className="calendar-color malattia" /> INPS/INAIL</span>
          <span><i className="calendar-color cassa" />CIG</span>
        </div>
      </section>

      {(stato === 'inviato' || stato === 'rifiutato' || stato === 'reinviato') && (
        <div className="dettaglio-mese-actions">
          <button
            onClick={() => handleAzione('approvato')}
            className="dettaglio-mese-button dettaglio-mese-button-approva"
          >
            ✓ Approva Mese
          </button>
          <button
            onClick={() => handleAzione('rifiutato')}
            className="dettaglio-mese-button dettaglio-mese-button-rifiuta"
          >
            ✕ Rifiuta Mese
          </button>
        </div>
      )}

      {selectedPresenza && (
        <div className="dettaglio-mese-modal-overlay" onClick={() => setSelectedPresenza(null)}>
          <div className="dettaglio-mese-modal" onClick={(event) => event.stopPropagation()}>
            <div className="dettaglio-mese-modal-header">
              <h2>Dettaglio {formattaData(selectedPresenza.data)}</h2>
              <button type="button" onClick={() => setSelectedPresenza(null)} aria-label="Chiudi">×</button>
            </div>
            {selectedPresenza.id ? (
              <>
                <p><strong>Causale:</strong> {CAUSALI_LABEL[selectedPresenza.causale] || selectedPresenza.causale}</p>
                <p><strong>Ore ordinarie:</strong> {Number(selectedPresenza.ore_ordinarie || 0).toFixed(2)}</p>
                <p><strong>Ore causale:</strong> {Number(selectedPresenza.ore_causale || 0).toFixed(2)}</p>
                <p>
                  <strong>{oreExtraLabel}:</strong>{' '}
                  {Number(selectedPresenza[isFullTime ? 'ore_straordinarie' : 'ore_eccedenti'] || 0).toFixed(2)}
                </p>
              </>
            ) : (
              <p>Nessuna presenza registrata per questa giornata.</p>
            )}
          </div>
        </div>
      )}

      {showRifiutoModal && (
        <div className="dettaglio-mese-modal-overlay">
          <div className="dettaglio-mese-modal">
            <div className="dettaglio-mese-modal-header">
              <h2>Motivazione del rifiuto</h2>
              <button type="button" onClick={() => setShowRifiutoModal(false)} aria-label="Chiudi">×</button>
            </div>
            <p>La comunicazione sarà visibile sulla dashboard del dipendente.</p>
            {comunicazioni.length > 0 && (
              <p>Questo mese contiene già {comunicazioni.length} comunicazione/i precedenti.</p>
            )}
            <textarea
              value={messaggioRifiuto}
              onChange={(event) => setMessaggioRifiuto(event.target.value)}
              rows={5}
              maxLength={5000}
              placeholder="Inserisci la motivazione..."
            />
            {communicationError && <p className="dettaglio-mese-modal-error">{communicationError}</p>}
            <button type="button" onClick={confermaRifiuto} disabled={savingCommunication}>
              {savingCommunication ? 'Salvataggio...' : 'Invia comunicazione e rifiuta'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DettaglioMese