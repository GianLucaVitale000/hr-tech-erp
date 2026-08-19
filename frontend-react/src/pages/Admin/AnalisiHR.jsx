import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDipendenti } from '../../services/dipendentiService'
import { getPresenze } from '../../services/presenzeService'

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

function AnalisiHR() {
  const navigate = useNavigate()
  const [dipendenti, setDipendenti] = useState([])
  const [dipendenteSelezionato, setDipendenteSelezionato] = useState('')
  const [annoSelezionato, setAnnoSelezionato] = useState(new Date().getFullYear())
  const [datiAnnuali, setDatiAnnuali] = useState({
    oreOrdinarie: 0,
    oreStraordinarie: 0,
    oreEccedenti: 0,
    feriePermessi: 0,
    pr: 0,
    pnr: 0,
    inps: 0,
    inail: 0,
    cig: 0,
    sindacale: 0,
    giorniLavorati: 0,
    giorniTeoriciLavorabili: 0,
    isFullTime: true,
    mesiConDati: 0,
    giorniSettimanali: 5,
    giorniAssenzaTotali: { malattia: 0, maternita: 0, infortunio: 0, cig: 0, pnr: 0 },
    totaleGiorniAssenza: 0,
    assenzePerGiornoSettimana: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    assenzeIndividualiPerGiornoSettimana: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    malattieBreviPerGiorno: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    assenzeVicinoFestivi: 0,
    modalitaLavoroPerMese: []
  })

  // Calcola la data di Pasqua per un dato anno (algoritmo di Gauss)
  const calcolaPasqua = useCallback((anno) => {
    const a = anno % 19
    const b = Math.floor(anno / 100)
    const c = anno % 100
    const d = Math.floor(b / 4)
    const e = b % 4
    const f = Math.floor((b + 8) / 25)
    const g = Math.floor((b - f + 1) / 3)
    const h = (19 * a + b - d - g + 15) % 30
    const i = Math.floor(c / 4)
    const k = c % 4
    const l = (32 + 2 * e + 2 * i - h - k) % 7
    const m = Math.floor((a + 11 * h + 22 * l) / 451)
    const mese = Math.floor((h + l - 7 * m + 114) / 31)
    const giorno = ((h + l - 7 * m + 114) % 31) + 1
    return new Date(anno, mese - 1, giorno)
  }, [])

  // Ottieni tutte le festività italiane per un dato anno
  const getFestivitaItaliane = useCallback((anno) => {
    const pasqua = calcolaPasqua(anno)
    const pasquetta = new Date(pasqua)
    pasquetta.setDate(pasqua.getDate() + 1)

    return [
      new Date(anno, 0, 1),   // Capodanno
      new Date(anno, 0, 6),   // Epifania
      pasqua,                // Pasqua
      pasquetta,             // Pasquetta
      new Date(anno, 3, 25), // Liberazione
      new Date(anno, 4, 1),  // Festa dei Lavoratori
      new Date(anno, 5, 2),  // Repubblica
      new Date(anno, 7, 15), // Ferragosto
      new Date(anno, 10, 1), // Ognissanti
      new Date(anno, 11, 8), // Immacolata
      new Date(anno, 11, 25), // Natale
      new Date(anno, 11, 26)  // Santo Stefano
    ]
  }, [calcolaPasqua])

  // Calcola i giorni teorici lavorabili per un anno
  const calcolaGiorniTeoriciLavorabili = useCallback((anno, giorniSettimanali) => {
    const festivita = getFestivitaItaliane(anno)
    const dateToString = (date) => date.toISOString().split('T')[0]
    const festivitaSet = new Set(festivita.map(dateToString))

    let count = 0
    const startDate = new Date(anno, 0, 1)
    const endDate = new Date(anno, 11, 31)

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay() // 0 = Domenica, 1 = Lunedì, ..., 6 = Sabato
      const dateStr = dateToString(new Date(d))

      // Escludi sempre le domeniche
      if (dayOfWeek === 0) continue

      // Per 5 giorni (Lun-Ven): escludi anche il sabato
      if (giorniSettimanali === 5 && dayOfWeek === 6) continue

      // Escludi le festività che cadono in giorni lavorativi
      if (festivitaSet.has(dateStr)) continue

      count++
    }

    return count
  }, [getFestivitaItaliane])

  // Recupera i dipendenti
  useEffect(() => {
    getDipendenti()
      .then((res) => setDipendenti(res.data))
      .catch(() => console.error('Errore nel caricamento dipendenti'))
  }, [])

  // Recupera e aggrega i dati annuali quando dipendente o anno cambiano
  useEffect(() => {
    const fetchDatiAnnuali = async () => {
      if (!dipendenteSelezionato || dipendenteSelezionato === '' || !annoSelezionato || annoSelezionato === '') {
        // Resetta ai valori di default se non c'è dipendente/anno selezionato
        setDatiAnnuali({
          oreOrdinarie: 0,
          oreStraordinarie: 0,
          oreEccedenti: 0,
          feriePermessi: 0,
          pr: 0,
          pnr: 0,
          inps: 0,
          inail: 0,
          cig: 0,
          sindacale: 0,
          giorniLavorati: 0,
          giorniTeoriciLavorabili: 0,
          isFullTime: true,
          mesiConDati: 0,
          giorniSettimanali: 5,
          giorniAssenzaTotali: { malattia: 0, maternita: 0, infortunio: 0, cig: 0, pnr: 0 },
          totaleGiorniAssenza: 0,
          assenzePerGiornoSettimana: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
          assenzeIndividualiPerGiornoSettimana: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
          malattieBreviPerGiorno: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
          assenzeVicinoFestivi: 0,
          modalitaLavoroPerMese: []
        })
        return
      }
      
      try {
        // Recupera i dati per tutti i 12 mesi
        const mesiPromises = Array.from({ length: 12 }, (_, i) => 
          getPresenze(parseInt(dipendenteSelezionato), i + 1, parseInt(annoSelezionato))
        )
        
        const risultati = await Promise.all(mesiPromises)
        
        // Aggrega tutti i dati
        const tuttePresenze = risultati.flatMap(r => r.data || [])
        
        if (tuttePresenze.length === 0) {
          // Nessun dato trovato, resetta ai default
          setDatiAnnuali({
            oreOrdinarie: 0,
            oreStraordinarie: 0,
            oreEccedenti: 0,
            feriePermessi: 0,
            pr: 0,
            pnr: 0,
            inps: 0,
            inail: 0,
            cig: 0,
            sindacale: 0,
            giorniLavorati: 0,
            giorniTeoriciLavorabili: 0,
            isFullTime: true,
            mesiConDati: 0,
            giorniSettimanali: 5,
            giorniAssenzaTotali: { malattia: 0, maternita: 0, infortunio: 0, cig: 0, pnr: 0 },
            totaleGiorniAssenza: 0,
            assenzePerGiornoSettimana: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
            malattieBreviPerGiorno: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
            assenzeVicinoFestivi: 0
          })
          return
        }

        // Calcola i contatori annuali
        const contatori = {
          oreOrdinarie: 0,
          oreStraordinarie: 0,
          oreEccedenti: 0,
          feriePermessi: 0,
          pr: 0,
          pnr: 0,
          inps: 0,
          inail: 0,
          cig: 0,
          sindacale: 0,
          giorniLavorati: 0
        }

        // Contatori per giorni di assenza (per grafico a torta e tasso di assenteismo)
        const giorniAssenza = {
          malattia: new Set(),
          maternita: new Set(),
          infortunio: new Set(),
          cig: new Set(),
          pnr: new Set()
        }

        // Contatori per analisi comportamentale
        const assenzePerGiornoSettimana = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
        const assenzeIndividualiPerGiornoSettimana = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
        const malattieBreviPerGiorno = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
        
        const isFullTime = Number(tuttePresenze[0]?.dipendente?.percentuale_part_time) === 100
        const giorniSettimanali = tuttePresenze[0]?.dipendente?.giorni_lavorativi_settimanali || 5
        
        // Calcola giorni teorici lavorabili dal calendario
        const giorniTeoriciLavorabili = calcolaGiorniTeoriciLavorabili(annoSelezionato, giorniSettimanali)
        
        // Set per tracciare giorni unici lavorati
        const giorniUniciSet = new Set()
        
        // Ottieni festività per correlazione
        const festivita = getFestivitaItaliane(annoSelezionato)
        const dateToString = (date) => date.toISOString().split('T')[0]
        const festivitaSet = new Set(festivita.map(dateToString))
        
        // Determina i giorni di riposo del dipendente
        const getGiorniDiRiposo = () => {
          if (isFullTime) {
            // Tempo pieno: riposi standard basati su giorniSettimanali
            if (giorniSettimanali === 5) {
              return new Set([0, 6]) // Domenica e Sabato
            } else if (giorniSettimanali === 6) {
              return new Set([0]) // Solo Domenica
            }
          }
          
          // Part-time: analizza distribuzione oraria - giorni senza lavoro sono riposi
          const giorniConLavoro = new Set()
          tuttePresenze.forEach(p => {
            if (p.causale === 'lavoro' || parseFloat(p.ore_ordinarie || 0) > 0) {
              const date = new Date(p.data)
              const dayOfWeek = date.getDay()
              giorniConLavoro.add(dayOfWeek)
            }
          })
          
          // I riposi sono i giorni senza nessun record di lavoro
          const riposi = new Set()
          for (let i = 0; i <= 6; i++) {
            if (!giorniConLavoro.has(i)) {
              riposi.add(i)
            }
          }
          return riposi
        }
        
        const riposiSet = getGiorniDiRiposo()

        // Tipologie di assenza da considerare per analisi comportamentale
        const causaliAssenza = ['malattia', 'maternita', 'infortunio', 'cassa_integrazione', 'permesso_non_retribuito']
        // Tipologie di assenza individuale (escludendo CIG e maternita) per il grafico a barre
        const causaliAssenzaIndividuale = ['malattia', 'infortunio', 'permesso_non_retribuito']
        
        // Aggregazione per modalità di lavoro per mese
        const modalitaPerMese = {}
        const nomiMesi = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
        
        tuttePresenze.forEach(p => {
          // Ore ordinarie
          contatori.oreOrdinarie += parseFloat(p.ore_ordinarie || 0)
          
          // Ore straordinarie/eccedenti
          if (!isFullTime) {
            contatori.oreEccedenti += parseFloat(p.ore_eccedenti || 0)
          } else {
            contatori.oreStraordinarie += parseFloat(p.ore_straordinarie || 0)
          }

          // Giorni lavorati - conta giorni unici con causale lavoro o ore ordinarie > 0
          if (p.causale === 'lavoro' || parseFloat(p.ore_ordinarie || 0) > 0) {
            giorniUniciSet.add(p.data)
          }

          // Ferie/Permessi - unificato (ferie + permesso_rol)
          if (p.causale === 'ferie' || p.causale === 'permesso_rol') {
            contatori.feriePermessi += parseFloat(p.ore_causale || 0)
          }
          
          // PR (permesso_retribuito)
          if (p.causale === 'permesso_retribuito') {
            contatori.pr += parseFloat(p.ore_causale || 0)
          }
          
          // PNR (permesso_non_retribuito) - assenteismo
          if (p.causale === 'permesso_non_retribuito') {
            contatori.pnr += parseFloat(p.ore_causale || 0)
            giorniAssenza.pnr.add(p.data)
          }
          
          // INPS: separa malattia e maternita per grafico
          if (p.causale === 'malattia') {
            contatori.inps += parseFloat(p.ore_causale || 0)
            giorniAssenza.malattia.add(p.data)
          }
          if (p.causale === 'maternita') {
            contatori.inps += parseFloat(p.ore_causale || 0)
            giorniAssenza.maternita.add(p.data)
          }
          
          // INAIL (infortunio) - assenteismo
          if (p.causale === 'infortunio') {
            contatori.inail += parseFloat(p.ore_causale || 0)
            giorniAssenza.infortunio.add(p.data)
          }
          
          // CIG (cassa_integrazione) - assenteismo
          if (p.causale === 'cassa_integrazione') {
            contatori.cig += parseFloat(p.ore_causale || 0)
            giorniAssenza.cig.add(p.data)
          }
          
          // Sindacale (assemblea + sciopero) - NON assenteismo
          if (p.causale === 'assemblea' || p.causale === 'sciopero') {
            contatori.sindacale += parseFloat(p.ore_causale || 0)
          }
          
          // Aggregazione modalità di lavoro per mese
          if (p.modalita_lavoro && (p.causale === 'lavoro' || parseFloat(p.ore_ordinarie || 0) > 0 || parseFloat(p.ore_causale || 0) > 0)) {
            const data = new Date(p.data)
            const meseIndex = data.getMonth() // 0-11
            const nomeMese = nomiMesi[meseIndex]
            const oreTotali = parseFloat(p.ore_ordinarie || 0) + parseFloat(p.ore_causale || 0)
            
            if (!modalitaPerMese[nomeMese]) {
              modalitaPerMese[nomeMese] = { name: nomeMese, in_sede: 0, smart_working: 0, trasferta: 0 }
            }
            
            if (p.modalita_lavoro === 'in_sede') {
              modalitaPerMese[nomeMese].in_sede += oreTotali
            } else if (p.modalita_lavoro === 'smart_working') {
              modalitaPerMese[nomeMese].smart_working += oreTotali
            } else if (p.modalita_lavoro === 'trasferta') {
              modalitaPerMese[nomeMese].trasferta += oreTotali
            }
          }
          
          // Analisi comportamentale: contare assenze per giorno della settimana
          if (causaliAssenza.includes(p.causale)) {
            const date = new Date(p.data)
            const dayOfWeek = date.getDay() // 0=Dom, 1=Lun, 2=Mar, 3=Mer, 4=Gio, 5=Ven, 6=Sab
            assenzePerGiornoSettimana[dayOfWeek]++
          }
          // Contare solo assenze individuali (escludendo CIG e maternita) per il grafico a barre
          if (causaliAssenzaIndividuale.includes(p.causale)) {
            const date = new Date(p.data)
            const dayOfWeek = date.getDay()
            assenzeIndividualiPerGiornoSettimana[dayOfWeek]++
          }
        })

        // Imposta il conteggio dei giorni unici
        contatori.giorniLavorati = giorniUniciSet.size

        // Calcola giorni di assenza per tipologia e totale
        const giorniAssenzaTotali = {
          malattia: giorniAssenza.malattia.size,
          maternita: giorniAssenza.maternita.size,
          infortunio: giorniAssenza.infortunio.size,
          cig: giorniAssenza.cig.size,
          pnr: giorniAssenza.pnr.size
        }
        const totaleGiorniAssenza = 
          giorniAssenzaTotali.malattia +
          giorniAssenzaTotali.maternita +
          giorniAssenzaTotali.infortunio +
          giorniAssenzaTotali.cig +
          giorniAssenzaTotali.pnr

        // Funzione per verificare se una data è vicina a un festivo o riposo
        const isVicinoANonLavorativo = (dateStr) => {
          const date = new Date(dateStr)
          const dayBefore = new Date(date)
          dayBefore.setDate(dayBefore.getDate() - 1)
          const dayAfter = new Date(date)
          dayAfter.setDate(dayAfter.getDate() + 1)
          
          const dayBeforeStr = dateToString(dayBefore)
          const dayAfterStr = dateToString(dayAfter)
          const dayBeforeDayOfWeek = dayBefore.getDay()
          const dayAfterDayOfWeek = dayAfter.getDay()
          
          // Controlla se il giorno prima o dopo è festivo
          const isBeforeFestivo = festivitaSet.has(dayBeforeStr)
          const isAfterFestivo = festivitaSet.has(dayAfterStr)
          
          // Controlla se il giorno prima o dopo è riposo del dipendente
          const isBeforeRiposo = riposiSet.has(dayBeforeDayOfWeek)
          const isAfterRiposo = riposiSet.has(dayAfterDayOfWeek)
          
          // Assenza è vicina se adiacente a festivo OPPURE riposo
          // Questo copre tutti i casi: festivo, riposo, e combinazioni (ponti)
          return isBeforeFestivo || isAfterFestivo || isBeforeRiposo || isAfterRiposo
        }
        
        // Funzione helper per contare episodi brevi (fino a 3 giorni) vicini a non lavorativo
        const countEpisodiBreviVicinoNonLavorativo = (dateSet, maxDurata = 3) => {
          const sortedDates = Array.from(dateSet).sort()
          if (sortedDates.length === 0) return { total: 0, perGiorno: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 } }
          
          let currentEpisode = [sortedDates[0]]
          const perGiorno = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
          let count = 0
          
          for (let i = 1; i < sortedDates.length; i++) {
            const prevDate = new Date(currentEpisode[currentEpisode.length - 1])
            const currentDate = new Date(sortedDates[i])
            const diffDays = (currentDate - prevDate) / (1000 * 60 * 60 * 24)
            
            if (diffDays === 1) {
              currentEpisode.push(sortedDates[i])
            } else {
              // Fine episodio: conta se breve e vicino a non lavorativo
              if (currentEpisode.length <= maxDurata) {
                currentEpisode.forEach(episodeDate => {
                  const episodeDateObj = new Date(episodeDate)
                  const dayOfWeek = episodeDateObj.getDay()
                  if (isVicinoANonLavorativo(episodeDate)) {
                    count++
                    perGiorno[dayOfWeek]++
                  }
                })
              }
              currentEpisode = [sortedDates[i]]
            }
          }
          
          // Controlla l'ultimo episodio
          if (currentEpisode.length <= maxDurata) {
            currentEpisode.forEach(episodeDate => {
              const episodeDateObj = new Date(episodeDate)
              const dayOfWeek = episodeDateObj.getDay()
              if (isVicinoANonLavorativo(episodeDate)) {
                count++
                perGiorno[dayOfWeek]++
              }
            })
          }
          
          return { total: count, perGiorno }
        }
        
        // Calcola malattie brevi vicine a non lavorativo (fino a 3 giorni)
        const { total: malattieBreviVicinoCount, perGiorno: malattieBreviVicinoPerGiorno } = 
          countEpisodiBreviVicinoNonLavorativo(giorniAssenza.malattia, 3)
        
        // Calcola infortuni brevi vicini a non lavorativo (fino a 3 giorni)
        const { total: infortuniBreviVicinoCount } = 
          countEpisodiBreviVicinoNonLavorativo(giorniAssenza.infortunio, 3)
        
        // Somma malattie e infortuni brevi vicini
        const assenzeVicinoFestivi = malattieBreviVicinoCount + infortuniBreviVicinoCount
        
        // Aggiorna malattieBreviPerGiorno con i giorni VICINI a non lavorativo
        Object.keys(malattieBreviVicinoPerGiorno).forEach(day => {
          malattieBreviPerGiorno[parseInt(day)] = malattieBreviVicinoPerGiorno[parseInt(day)]
        })

        // Converti modalitaPerMese in array ordinato per i 12 mesi
        const modalitaLavoroPerMeseArray = nomiMesi.map(nomeMese => ({
          name: nomeMese,
          in_sede: modalitaPerMese[nomeMese]?.in_sede || 0,
          smart_working: modalitaPerMese[nomeMese]?.smart_working || 0,
          trasferta: modalitaPerMese[nomeMese]?.trasferta || 0
        }))

        setDatiAnnuali(() => ({
          ...contatori,
          giorniTeoriciLavorabili,
          isFullTime,
          giorniSettimanali,
          mesiConDati: risultati.filter(r => (r.data || []).length > 0).length,
          giorniAssenzaTotali,
          totaleGiorniAssenza,
          assenzePerGiornoSettimana,
          assenzeIndividualiPerGiornoSettimana,
          malattieBreviPerGiorno,
          assenzeVicinoFestivi,
          modalitaLavoroPerMese: modalitaLavoroPerMeseArray
        }))
      } catch (err) {
        console.error('Errore nel recupero dati presenze:', err)
        // In caso di errore, resetta ai default
        setDatiAnnuali({
          oreOrdinarie: 0,
          oreStraordinarie: 0,
          oreEccedenti: 0,
          feriePermessi: 0,
          pr: 0,
          pnr: 0,
          inps: 0,
          inail: 0,
          cig: 0,
          sindacale: 0,
          giorniLavorati: 0,
          giorniTeoriciLavorabili: 0,
          isFullTime: true,
          mesiConDati: 0,
          giorniSettimanali: 5,
          giorniAssenzaTotali: { malattia: 0, maternita: 0, infortunio: 0, cig: 0, pnr: 0 },
          totaleGiorniAssenza: 0,
          assenzePerGiornoSettimana: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
          assenzeIndividualiPerGiornoSettimana: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
          malattieBreviPerGiorno: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
          assenzeVicinoFestivi: 0,
          modalitaLavoroPerMese: []
        })
      }
    }

    fetchDatiAnnuali()
  }, [dipendenteSelezionato, annoSelezionato, calcolaGiorniTeoriciLavorabili, getFestivitaItaliane])

  const getDipendenteInfo = (d) => {
    const nome = d.user?.name || `${d.cognome} ${d.nome}`
    const ccnl = d.contratto?.codice_cnel || 'N/D'
    const tipoTempo = (d.percentuale_part_time ?? 100) >= 100 ? 'Tempo Pieno' : 'Part-Time'
    const giorni = d.giorni_lavorativi_settimanali === 6 ? '/ 6 gg.' : '/ 5 gg.'
    
    const oggi = new Date()
    const dataScadenza = d.data_scadenza_contratto ? new Date(d.data_scadenza_contratto) : null
    const tipoContratto = d.tipo_contratto || 'indeterminato'
    
    let stato = 'in forze'
    if (tipoContratto === 'determinato' && dataScadenza && oggi > dataScadenza) {
      stato = 'cessato'
    } else if (dataScadenza && oggi > dataScadenza) {
      stato = 'cessato'
    }
    
    return `${nome} (${ccnl}) - ${tipoTempo} ${giorni} - ${stato}`
  }

  // Formatta il valore numerico
  const formatValue = (value, decimals = 2) => {
    if (value === undefined || value === null) return '0'
    return Number(value).toFixed(decimals)
  }

  // Genera dati per grafico distribuzione assenze per giorno della settimana
  const getBarChartGiorniSettimana = () => {
    const giorni = [
      { name: 'Dom', day: 0 },
      { name: 'Lun', day: 1 },
      { name: 'Mar', day: 2 },
      { name: 'Mer', day: 3 },
      { name: 'Gio', day: 4 },
      { name: 'Ven', day: 5 },
      { name: 'Sab', day: 6 }
    ]
    
    return giorni.map(g => ({
      name: g.name,
      Assenze: datiAnnuali.assenzeIndividualiPerGiornoSettimana[g.day] || 0,
      MalattieBrevi: datiAnnuali.malattieBreviPerGiorno[g.day] || 0
    }))
  }

  // Dati per il grafico a barre (da implementare con dati reali)
  const barChartData = [
    { name: 'Gen', Ferie: 12, Permessi: 8, Festività: 4 },
    { name: 'Feb', Ferie: 10, Permessi: 6, Festività: 3 },
    { name: 'Mar', Ferie: 15, Permessi: 10, Festività: 5 },
    { name: 'Apr', Ferie: 8, Permessi: 4, Festività: 2 },
    { name: 'Mag', Ferie: 18, Permessi: 12, Festività: 6 },
    { name: 'Giu', Ferie: 20, Permessi: 14, Festività: 4 }
  ]

  // Stile per i widget
  const widgetStyle = {
    backgroundColor: '#374151',
    border: '1px solid #4b5563',
    borderRadius: '8px',
    padding: '1rem 1.5rem',
    color: 'white',
    minWidth: '180px',
    maxWidth: '220px',
    textAlign: 'center'
  }

  const widgetTitleStyle = {
    fontSize: '0.875rem',
    color: '#9ca3af',
    marginBottom: '0.5rem',
    fontWeight: '500'
  }

  const widgetValueStyle = {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#f3f4f6'
  }

  const widgetSubtitleStyle = {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginTop: '0.25rem'
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', minHeight: '100vh', backgroundColor: '#1f2937' }}>
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
        {'←'} Dashboard
      </button>

      <h1 style={{ margin: '0 0 2rem 0', lineHeight: '1.2', color: 'white' }}>Analisi HR</h1>

      {/* Selezione Dipendente e Anno */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div>
          <label style={{ color: 'white', marginBottom: '0.5rem', display: 'block' }}>
            Seleziona Dipendente
          </label>
          <select
            value={dipendenteSelezionato}
            onChange={(e) => setDipendenteSelezionato(e.target.value)}
            style={{
              padding: '0.5rem',
              borderRadius: '4px',
              backgroundColor: 'white',
              color: 'black',
              width: '250px'
            }}
          >
            <option value="">-- Seleziona un dipendente --</option>
            {dipendenti.map((d) => (
              <option key={d.id} value={d.id}>
                {getDipendenteInfo(d)}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label style={{ color: 'white', marginBottom: '0.5rem', display: 'block' }}>
            Seleziona Anno
          </label>
          <select
            value={annoSelezionato || ''}
            onChange={(e) => setAnnoSelezionato(e.target.value ? parseInt(e.target.value) : '')}
            style={{
              padding: '0.5rem',
              borderRadius: '4px',
              backgroundColor: 'white',
              color: 'black',
              width: '150px'
            }}
          >
            <option value="">-- Seleziona un anno --</option>
            {Array.from({ length: 5 }, (_, i) => {
              const y = new Date().getFullYear() - 2 + i
              return <option key={y} value={y}>{y}</option>
            })}
          </select>
        </div>
      </div>

      {/* Widget con contatori annuali - Ricalco esatto fogli presenze */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {/* Ore Ordinarie */}
        <div style={widgetStyle}>
          <div style={widgetTitleStyle}>Ore Ordinarie</div>
          <div style={widgetValueStyle}>{formatValue(datiAnnuali.oreOrdinarie)} ore</div>
          <div style={widgetSubtitleStyle}>Totale annuale</div>
        </div>
        
        {/* Straordinari / Eccedenti */}
        {datiAnnuali.isFullTime && (
          <div style={widgetStyle}>
            <div style={widgetTitleStyle}>Straordinari</div>
            <div style={widgetValueStyle}>{formatValue(datiAnnuali.oreStraordinarie)} ore</div>
            <div style={widgetSubtitleStyle}>Tempo Pieno</div>
          </div>
        )}
        {!datiAnnuali.isFullTime && (
          <div style={widgetStyle}>
            <div style={widgetTitleStyle}>Ore Eccedenti</div>
            <div style={widgetValueStyle}>{formatValue(datiAnnuali.oreEccedenti)} ore</div>
            <div style={widgetSubtitleStyle}>Part-time</div>
          </div>
        )}
        
        {/* Giorni Lavorati */}
        <div style={widgetStyle}>
          <div style={widgetTitleStyle}>Giorni Lavorati</div>
          <div style={widgetValueStyle}>{datiAnnuali.giorniLavorati} gg</div>
          <div style={widgetSubtitleStyle}>Giorni effettivi</div>
        </div>
        
        {/* Giorni Teorici Lavorabili */}
        <div style={widgetStyle}>
          <div style={widgetTitleStyle}>Giorni Teorici</div>
          <div style={widgetValueStyle}>{datiAnnuali.giorniTeoriciLavorabili} gg</div>
          <div style={widgetSubtitleStyle}>{datiAnnuali.giorniSettimanali} gg./sett.</div>
        </div>
        
        {/* Ferie/Permessi - UNIFICATO */}
        <div style={widgetStyle}>
          <div style={widgetTitleStyle}>Ferie/Permessi</div>
          <div style={widgetValueStyle}>{formatValue(datiAnnuali.feriePermessi)} ore</div>
          <div style={widgetSubtitleStyle}>Goduto aggregato</div>
        </div>
        
        {/* PR */}
        <div style={widgetStyle}>
          <div style={widgetTitleStyle}>PR</div>
          <div style={widgetValueStyle}>{formatValue(datiAnnuali.pr)} ore</div>
          <div style={widgetSubtitleStyle}>Permessi Retribuiti</div>
        </div>
        
        {/* PNR */}
        <div style={widgetStyle}>
          <div style={widgetTitleStyle}>PNR</div>
          <div style={widgetValueStyle}>{formatValue(datiAnnuali.pnr)} ore</div>
          <div style={widgetSubtitleStyle}>Permessi Non Retribuiti</div>
        </div>
        
        {/* INPS */}
        <div style={widgetStyle}>
          <div style={widgetTitleStyle}>INPS</div>
          <div style={widgetValueStyle}>{formatValue(datiAnnuali.inps)} ore</div>
          <div style={widgetSubtitleStyle}>Malattia + Maternità</div>
        </div>
        
        {/* INAIL */}
        <div style={widgetStyle}>
          <div style={widgetTitleStyle}>INAIL</div>
          <div style={widgetValueStyle}>{formatValue(datiAnnuali.inail)} ore</div>
          <div style={widgetSubtitleStyle}>Infortunio</div>
        </div>
        
        {/* CIG */}
        <div style={widgetStyle}>
          <div style={widgetTitleStyle}>CIG</div>
          <div style={widgetValueStyle}>{formatValue(datiAnnuali.cig)} ore</div>
          <div style={widgetSubtitleStyle}>Cassa Integrazione</div>
        </div>
        
        {/* Sindacale */}
        <div style={widgetStyle}>
          <div style={widgetTitleStyle}>Sindacale</div>
          <div style={widgetValueStyle}>{formatValue(datiAnnuali.sindacale)} ore</div>
          <div style={widgetSubtitleStyle}>Assemblea + Sciopero</div>
        </div>
      </div>

      {/* Prima riga: Card 1 e Card 2 */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {/* Card 1: Tasso di assenza individuale */}
        <div style={{ backgroundColor: '#374151', color: 'white', border: '1px solid #4b5563', maxWidth: '500px', width: '100%' }}>
          <div style={{ backgroundColor: '#1f2937', borderBottom: '1px solid #4b5563', padding: '1rem 1.5rem' }}>
            <span style={{ color: 'white', fontSize: '1.1rem', fontWeight: '600' }}>Tasso di Assenza Individuale</span>
          </div>
          <hr style={{ backgroundColor: '#4b5563', border: 'none', height: '1px', margin: '0' }} />
          <div style={{ padding: '1.5rem', color: '#d1d5db', height: '400px', display: 'flex', flexDirection: 'column' }}>
            {/* Tasso di assenteismo e grafico distribuzione per giorno - allineati orizzontalmente */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              {/* Tasso percentuale */}
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f3f4f6' }}>
                  {datiAnnuali.giorniTeoriciLavorabili > 0 ?
                    formatValue((datiAnnuali.totaleGiorniAssenza / datiAnnuali.giorniTeoriciLavorabili * 100), 1) + '%' : '0%'
                  }
                </div>
                
                {datiAnnuali.assenzeVicinoFestivi > 0 && (
                  <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.5rem' }}>
                    gg. "assenza ponte" su festivi/riposi: {datiAnnuali.assenzeVicinoFestivi}
                  </div>
                )}
              </div>
              
              {/* Grafico a barre distribuzione per giorno della settimana */}
              <div style={{ width: '150px', height: '80px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getBarChartGiorniSettimana()} layout="vertical" activeBar={{ fillOpacity: 1 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={35} tick={{ fontSize: 10, fill: '#9ca3af' }} interval={0} />
                    <Bar dataKey="Assenze" fill="#3b82f6" barSize={12} />
                    <Tooltip
                      wrapperStyle={{ opacity: 1 }}
                      contentStyle={{ backgroundColor: '#374151', border: '1px solid #4b5563', color: 'white', fontSize: '0.75rem' }}
                      formatter={(value) => [value, 'Assenze']}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Grafico a torta con composizione assenze */}
            <div style={{ height: '180px', marginTop: '0.5rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Malattia', value: datiAnnuali.giorniAssenzaTotali.malattia, color: '#ef4444' },
                      { name: 'Maternità', value: datiAnnuali.giorniAssenzaTotali.maternita, color: '#8b5cf6' },
                      { name: 'Infortunio', value: datiAnnuali.giorniAssenzaTotali.infortunio, color: '#f59e0b' },
                      { name: 'CIG', value: datiAnnuali.giorniAssenzaTotali.cig, color: '#6b7280' },
                      { name: 'PNR', value: datiAnnuali.giorniAssenzaTotali.pnr, color: '#10b981' }
                    ].filter(item => item.value > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={55}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelStyle={{ fontSize: 9, fill: '#ffffff' }}
                  >
                    {[
                      { name: 'Malattia', value: datiAnnuali.giorniAssenzaTotali.malattia, color: '#ef4444' },
                      { name: 'Maternità', value: datiAnnuali.giorniAssenzaTotali.maternita, color: '#8b5cf6' },
                      { name: 'Infortunio', value: datiAnnuali.giorniAssenzaTotali.infortunio, color: '#f59e0b' },
                      { name: 'CIG', value: datiAnnuali.giorniAssenzaTotali.cig, color: '#6b7280' },
                      { name: 'PNR', value: datiAnnuali.giorniAssenzaTotali.pnr, color: '#10b981' }
                    ].filter(item => item.value > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    wrapperStyle={{ opacity: 1 }}
                    contentStyle={{ backgroundColor: '#374151', border: '1px solid #4b5563', color: 'white' }}
                    formatter={(value) => [value, 'Giorni']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legenda */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem', fontSize: '0.55rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#ef4444', borderRadius: '2px' }} />
                <span>Malattia: {datiAnnuali.giorniAssenzaTotali.malattia} gg.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#8b5cf6', borderRadius: '2px' }} />
                <span>Maternità: {datiAnnuali.giorniAssenzaTotali.maternita} gg.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#f59e0b', borderRadius: '2px' }} />
                <span>Infortunio: {datiAnnuali.giorniAssenzaTotali.infortunio} gg.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#6b7280', borderRadius: '2px' }} />
                <span>CIG: {datiAnnuali.giorniAssenzaTotali.cig} gg.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '2px' }} />
                <span>PNR: {datiAnnuali.giorniAssenzaTotali.pnr} gg.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Ripartizione PR, PNR, CIG, Sindacale */}
        <div style={{ backgroundColor: '#374151', color: 'white', border: '1px solid #4b5563', maxWidth: '500px', width: '100%' }}>
          <div style={{ backgroundColor: '#1f2937', borderBottom: '1px solid #4b5563', padding: '1rem 1.5rem' }}>
            <span style={{ color: 'white', fontSize: '1.1rem', fontWeight: '600' }}>PR, PNR, CIG, Sindacale / Modalità lavoro</span>
          </div>
          <hr style={{ backgroundColor: '#4b5563', border: 'none', height: '1px', margin: '0' }} />
          <div style={{ padding: '1.5rem', color: '#d1d5db', height: '400px', display: 'flex', flexDirection: 'column' }}>
            {/* Totale ore e percentuale - affiancati orizzontalmente */}
            {(() => {
              const totale = datiAnnuali.pr + datiAnnuali.pnr + datiAnnuali.cig + datiAnnuali.sindacale
              const percentuale = datiAnnuali.giorniTeoriciLavorabili > 0 ?
                ((totale) / (datiAnnuali.giorniTeoriciLavorabili * 8) * 100) : 0
              return (
                <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '1rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f3f4f6' }}>
                      {formatValue(totale)} ore
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                      Tot. anno
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f3f4f6' }}>
                      {formatValue(percentuale, 1)}%
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                      % su ore lavorabili
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Grafico a torta */}
            <div style={{ height: '200px', marginTop: '0.5rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'PR', value: datiAnnuali.pr, color: '#3b82f6' },
                      { name: 'PNR', value: datiAnnuali.pnr, color: '#10b981' },
                      { name: 'CIG', value: datiAnnuali.cig, color: '#6b7280' },
                      { name: 'Sindacale', value: datiAnnuali.sindacale, color: '#f59e0b' }
                    ].filter(item => item.value > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={45}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelStyle={{ fontSize: 8, fill: '#ffffff' }}
                  >
                    {[
                      { name: 'PR', value: datiAnnuali.pr, color: '#3b82f6' },
                      { name: 'PNR', value: datiAnnuali.pnr, color: '#10b981' },
                      { name: 'CIG', value: datiAnnuali.cig, color: '#6b7280' },
                      { name: 'Sindacale', value: datiAnnuali.sindacale, color: '#f59e0b' }
                    ].filter(item => item.value > 0).map((entry, index) => (
                      <Cell key={`cell-pr-pnr-cig-sind-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    wrapperStyle={{ backgroundColor: '#374151', opacity: 1, zIndex: 100 }}
                    contentStyle={{ backgroundColor: '#374151', border: '1px solid #4b5563', color: 'white' }}
                    itemStyle={{ color: 'white' }}
                    labelStyle={{ color: 'white' }}
                    formatter={(value, name) => [`${name}: ${value} ore`]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legenda */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem', fontSize: '0.55rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#3b82f6', borderRadius: '2px' }} />
                <span>PR: {formatValue(datiAnnuali.pr)} ore</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '2px' }} />
                <span>PNR: {formatValue(datiAnnuali.pnr)} ore</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#6b7280', borderRadius: '2px' }} />
                <span>CIG: {formatValue(datiAnnuali.cig)} ore</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#f59e0b', borderRadius: '2px' }} />
                <span>Sindacale: {formatValue(datiAnnuali.sindacale)} ore</span>
              </div>
            </div>

            {/* Grafico istogramma modalità di lavoro per mese */}
            <div style={{ height: '200px', marginTop: '1rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datiAnnuali.modalitaLavoroPerMese} margin={{ top: 20, right: 30, left: 0, bottom: 0 }} activeBar={{ fillOpacity: 1 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                  <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 8 }} />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 10 }} hide />
                  <Tooltip
                    content={({ payload }) => (
                      <div style={{ backgroundColor: '#374151', border: '1px solid #4b5563', color: 'white', padding: '8px 12px', fontSize: '0.75rem', zIndex: 1000 }}>
                        {payload.map((entry, index) => (
                          <div key={index} style={{ color: 'white' }}>{`${entry.name}: ${entry.value} ore`}</div>
                        ))}
                      </div>
                    )}
                    wrapperStyle={{ zIndex: 1000 }}
                  />
                  {(() => {
                    const totaleInSede = datiAnnuali.modalitaLavoroPerMese.reduce((sum, m) => sum + (m.in_sede || 0), 0)
                    const totaleSmartWorking = datiAnnuali.modalitaLavoroPerMese.reduce((sum, m) => sum + (m.smart_working || 0), 0)
                    const totaleTrasferta = datiAnnuali.modalitaLavoroPerMese.reduce((sum, m) => sum + (m.trasferta || 0), 0)
                    const totaleLavorato = totaleInSede + totaleSmartWorking + totaleTrasferta
                    const pctInSede = totaleLavorato > 0 ? (totaleInSede / totaleLavorato * 100) : 0
                    const pctSmartWorking = totaleLavorato > 0 ? (totaleSmartWorking / totaleLavorato * 100) : 0
                    const pctTrasferta = totaleLavorato > 0 ? (totaleTrasferta / totaleLavorato * 100) : 0
                    return (
                      <Legend
                        wrapperStyle={{ color: '#9ca3af', fontSize: '0.6rem' }}
                        formatter={(value) => {
                          if (value === 'In Sede') return <span style={{ color: '#3b82f6' }}>{`In Sede: ${pctInSede.toFixed(1)}%`}</span>
                          if (value === 'SW') return <span style={{ color: '#10b981' }}>{`SW: ${pctSmartWorking.toFixed(1)}%`}</span>
                          if (value === 'Trasferta') return <span style={{ color: '#f59e0b' }}>{`Trasferta: ${pctTrasferta.toFixed(1)}%`}</span>
                          return value
                        }}
                      />
                    )
                  })()}
                  <Bar dataKey="in_sede" stackId="modalita" fill="#3b82f6" name="In Sede">
                  </Bar>
                  <Bar dataKey="smart_working" stackId="modalita" fill="#10b981" name="SW">
                  </Bar>
                  <Bar dataKey="trasferta" stackId="modalita" fill="#f59e0b" name="Trasferta">
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legenda modalità lavoro */}
            
          </div>
        </div>
      </div>

      {/* Seconda riga: Card 3 e Card 4 */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        {/* Card 3: Ferie/Permessi */}
        <div style={{ backgroundColor: '#374151', color: 'white', border: '1px solid #4b5563', maxWidth: '500px', width: '100%' }}>
          <div style={{ backgroundColor: '#1f2937', borderBottom: '1px solid #4b5563', padding: '1rem 1.5rem' }}>
            <span style={{ color: 'white', fontSize: '1.1rem', fontWeight: '600' }}>Ferie/Permessi</span>
          </div>
          <hr style={{ backgroundColor: '#4b5563', border: 'none', height: '1px', margin: '0' }} />
          <div style={{ padding: '1.5rem', color: '#d1d5db', height: '400px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                <p>Analisi utilizzo ferie e permessi</p>
                {datiAnnuali && (
                  <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    Ferie/Permessi: {formatValue(datiAnnuali.feriePermessi)} ore
                  </p>
                )}
              </div>
            </div>
            <div style={{ height: '200px', marginTop: '1rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} activeBar={{ fillOpacity: 1 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip wrapperStyle={{ opacity: 1 }} contentStyle={{ backgroundColor: '#374151', border: '1px solid #4b5563', color: 'white' }} />
                  <Legend wrapperStyle={{ color: '#9ca3af' }} />
                  <Bar dataKey="Ferie" fill="#3b82f6" />
                  <Bar dataKey="Permessi" fill="#10b981" />
                  <Bar dataKey="Festività" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Card 4: Ore Straordinarie / Eccedenti */}
        <div style={{ backgroundColor: '#374151', color: 'white', border: '1px solid #4b5563', maxWidth: '500px', width: '100%' }}>
          <div style={{ backgroundColor: '#1f2937', borderBottom: '1px solid #4b5563', padding: '1rem 1.5rem' }}>
            <span style={{ color: 'white', fontSize: '1.1rem', fontWeight: '600' }}>{datiAnnuali.isFullTime ? 'Ore Straordinarie' : 'Ore Eccedenti'}</span>
          </div>
          <hr style={{ backgroundColor: '#4b5563', border: 'none', height: '1px', margin: '0' }} />
          <div style={{ padding: '1.5rem', color: '#d1d5db', height: '400px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                <p>Totale ore {datiAnnuali.isFullTime ? 'straordinarie' : 'eccedenti'}</p>
                {datiAnnuali && (
                  <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    {datiAnnuali.isFullTime ? 
                      `Straordinari: ${formatValue(datiAnnuali.oreStraordinarie)} ore` :
                      `Eccedenti: ${formatValue(datiAnnuali.oreEccedenti)} ore (PT)`
                    }
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalisiHR
