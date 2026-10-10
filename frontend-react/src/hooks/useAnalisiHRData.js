import { useState, useEffect, useMemo } from 'react'
import { getDipendenti, getAnalisiFerie } from '../services/dipendentiService'
import { getPresenze } from '../services/presenzeService'
import { 
  getFestivitaItaliane, 
  rToDayOfWeek, 
  calcolaGiorniTeoriciLavorabili, 
  calcolaSupplementariEStraordinarieMensili 
} from '../utils/analisiHRUtils'
import { isRiposoData } from '../utils/foglioCompleto'

export function useAnalisiHRData() {
  const [dipendenti, setDipendenti] = useState([])
  const [dipendenteSelezionato, setDipendenteSelezionato] = useState('')
  const [annoSelezionato, setAnnoSelezionato] = useState('')
  const [analisiFerie, setAnalisiFerie] = useState(null)
  const [datiMensualiOreExtraordinarie, setDatiMensualiOreExtraordinarie] = useState([])
  const [mesiConsecutiviSelezionati, setMesiConsecutiviSelezionati] = useState(3)
  
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
        const mesiPromises = Array.from({ length: 12 }, (_, i) => 
          getPresenze(parseInt(dipendenteSelezionato), i + 1, parseInt(annoSelezionato))
        )
        
        const risultati = await Promise.all(mesiPromises)
        const tuttePresenze = risultati.flatMap((r) => r.data || [])
        
        if (tuttePresenze.length === 0) {
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

        const giorniAssenza = {
          malattia: new Set(),
          maternita: new Set(),
          infortunio: new Set(),
          cig: new Set(),
          pnr: new Set()
        }

        const assenzePerGiornoSettimana = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
        const assenzeIndividualiPerGiornoSettimana = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
        const malattieBreviPerGiorno = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
        
        const dipendenteObj = dipendenti.find(d => String(d.id) === String(dipendenteSelezionato)) || tuttePresenze[0]?.dipendente

        const isFullTime = Number(dipendenteObj?.percentuale_part_time ?? tuttePresenze[0]?.dipendente?.percentuale_part_time ?? 100) >= 100
        const giorniSettimanali = dipendenteObj?.giorni_lavorativi_settimanali || tuttePresenze[0]?.dipendente?.giorni_lavorativi_settimanali || 5
        const percentualePartTime = Number(dipendenteObj?.percentuale_part_time ?? tuttePresenze[0]?.dipendente?.percentuale_part_time ?? 100)
        
        let oreSettimanaliTeoricheFT = 40
        if (tuttePresenze[0]?.dipendente?.contratto?.ore_settimanali_teoriche) {
          oreSettimanaliTeoricheFT = parseFloat(tuttePresenze[0].dipendente.contratto.ore_settimanali_teoriche)
        }
        
        const festivita = getFestivitaItaliane(annoSelezionato)
        const dateToString = (date) => date.toISOString().split('T')[0]
        const festivitaSet = new Set(festivita.map(dateToString))
        
        const getGiorniDiRiposo = () => {
          const riposi = new Set()
          if (isFullTime) {
            const condizioneAnno = dipendenteObj?.condizioni_contrattuali?.find(c => {
              const inizio = new Date(c.data_inizio).getFullYear()
              const fine = c.data_fine ? new Date(c.data_fine).getFullYear() : 9999
              return parseInt(annoSelezionato) >= inizio && parseInt(annoSelezionato) <= fine
            }) || dipendenteObj

            const r1 = condizioneAnno?.R1 ?? dipendenteObj?.R1 ?? 6
            const r2 = condizioneAnno?.R2 ?? dipendenteObj?.R2 ?? 7

            riposi.add(rToDayOfWeek(r1))
            if (Number(giorniSettimanali) === 5) {
              riposi.add(rToDayOfWeek(r2))
            }
          } else {
            const orari = dipendenteObj?.orari_settimanali || []
            for (let i = 0; i <= 6; i++) {
              const orarioGiorno = orari.find(o => Number(o.giorno_settimana) === i)
              if (!orarioGiorno || parseFloat(orarioGiorno.ore_giornaliere_previste || 0) === 0) {
                riposi.add(i)
              }
            }
            if (riposi.size === 0) {
              if (giorniSettimanali === 5) riposi.add(0).add(6)
              else riposi.add(0)
            }
          }
          return riposi
        }
        
        const riposiSet = getGiorniDiRiposo()
        const giorniTeoriciLavorabili = calcolaGiorniTeoriciLavorabili(annoSelezionato, riposiSet, festivitaSet)
        
        const giorniUniciSet = new Set()
        const causaliAssenza = ['malattia', 'maternita', 'infortunio', 'cassa_integrazione', 'permesso_non_retribuito']
        const causaliAssenzaIndividuale = ['malattia', 'infortunio', 'permesso_non_retribuito']
        
        const modalitaPerMese = {}
        const nomiMesi = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
        
        tuttePresenze.forEach(p => {
          if (p.causale === 'lavoro' || parseFloat(p.ore_ordinarie || 0) > 0) {
            giorniUniciSet.add(p.data)
          }

          if (p.causale === 'ferie' || p.causale === 'permesso_rol') {
            contatori.feriePermessi += parseFloat(p.ore_causale || 0)
          }
          if (p.causale === 'permesso_retribuito') {
            contatori.pr += parseFloat(p.ore_causale || 0)
          }
          if (p.causale === 'permesso_non_retribuito') {
            contatori.pnr += parseFloat(p.ore_causale || 0)
            if (!isRiposoData(dipendenteObj, p.data)) {
              giorniAssenza.pnr.add(p.data)
            }
          }
          if (p.causale === 'malattia') {
            contatori.inps += parseFloat(p.ore_causale || 0)
            if (!isRiposoData(dipendenteObj, p.data)) {
              giorniAssenza.malattia.add(p.data)
            }
          }
          if (p.causale === 'maternita') {
            contatori.inps += parseFloat(p.ore_causale || 0)
            if (!isRiposoData(dipendenteObj, p.data)) {
              giorniAssenza.maternita.add(p.data)
            }
          }
          if (p.causale === 'infortunio') {
            contatori.inail += parseFloat(p.ore_causale || 0)
            if (!isRiposoData(dipendenteObj, p.data)) {
              giorniAssenza.infortunio.add(p.data)
            }
          }
          if (p.causale === 'cassa_integrazione') {
            contatori.cig += parseFloat(p.ore_causale || 0)
            if (!isRiposoData(dipendenteObj, p.data)) {
              giorniAssenza.cig.add(p.data)
            }
          }
          if (p.causale === 'assemblea' || p.causale === 'sciopero') {
            contatori.sindacale += parseFloat(p.ore_causale || 0)
          }
          
          if (p.modalita_lavoro && (p.causale === 'lavoro' || parseFloat(p.ore_ordinarie || 0) > 0 || parseFloat(p.ore_causale || 0) > 0)) {
            const data = new Date(p.data)
            const meseIndex = data.getMonth()
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
          
          if (causaliAssenza.includes(p.causale)) {
            if (!isRiposoData(dipendenteObj, p.data)) {
              const date = new Date(p.data)
              const dayOfWeek = date.getDay()
              assenzePerGiornoSettimana[dayOfWeek]++
            }
          }
          if (causaliAssenzaIndividuale.includes(p.causale)) {
            if (!isRiposoData(dipendenteObj, p.data)) {
              const date = new Date(p.data)
              const dayOfWeek = date.getDay()
              assenzeIndividualiPerGiornoSettimana[dayOfWeek]++
            }
          }
        })

        contatori.giorniLavorati = giorniUniciSet.size

        const nomiMesiArray = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
        const datiMensualiGrafico = []
        const presenzePerMese = {}
        
        risultati.forEach((risultato, meseIndex) => {
          presenzePerMese[nomiMesiArray[meseIndex]] = risultato.data || []
        })
        
        nomiMesiArray.forEach((nomeMese) => {
          const presenzeMese = presenzePerMese[nomeMese] || []
          if (presenzeMese.length === 0) {
            datiMensualiGrafico.push({ name: nomeMese, ordinarie: 0, supplementari: 0, straordinarie: 0 })
            return
          }

          const { ordinarie, supplementari, straordinarie } = calcolaSupplementariEStraordinarieMensili(
            presenzeMese,
            isFullTime,
            oreSettimanaliTeoricheFT,
            percentualePartTime
          )

          datiMensualiGrafico.push({
            name: nomeMese,
            ordinarie: Math.round(ordinarie * 100) / 100,
            supplementari: Math.round(supplementari * 100) / 100,
            straordinarie: Math.round(straordinarie * 100) / 100
          })

          contatori.oreOrdinarie += ordinarie
          if (isFullTime) {
            contatori.oreStraordinarie += straordinarie
          } else {
            contatori.oreEccedenti += (supplementari + straordinarie)
          }
        })

        setDatiMensualiOreExtraordinarie(datiMensualiGrafico)

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
          
          const isBeforeFestivo = festivitaSet.has(dayBeforeStr)
          const isAfterFestivo = festivitaSet.has(dayAfterStr)
          const isBeforeRiposo = riposiSet.has(dayBeforeDayOfWeek)
          const isAfterRiposo = riposiSet.has(dayAfterDayOfWeek)
          
          return isBeforeFestivo || isAfterFestivo || isBeforeRiposo || isAfterRiposo
        }
        
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
              if (currentEpisode.length <= maxDurata) {
                currentEpisode.forEach(episodeDate => {
                  const dayOfWeek = new Date(episodeDate).getDay()
                  if (isVicinoANonLavorativo(episodeDate)) {
                    count++
                    perGiorno[dayOfWeek]++
                  }
                })
              }
              currentEpisode = [sortedDates[i]]
            }
          }
          
          if (currentEpisode.length <= maxDurata) {
            currentEpisode.forEach(episodeDate => {
              const dayOfWeek = new Date(episodeDate).getDay()
              if (isVicinoANonLavorativo(episodeDate)) {
                count++
                perGiorno[dayOfWeek]++
              }
            })
          }
          
          return { total: count, perGiorno }
        }
        
        const { total: malattieBreviVicinoCount, perGiorno: malattieBreviVicinoPerGiorno } = 
          countEpisodiBreviVicinoNonLavorativo(giorniAssenza.malattia, 3)
        const { total: infortuniBreviVicinoCount } = 
          countEpisodiBreviVicinoNonLavorativo(giorniAssenza.infortunio, 3)
        
        const assenzeVicinoFestivi = malattieBreviVicinoCount + infortuniBreviVicinoCount
        Object.keys(malattieBreviVicinoPerGiorno).forEach(day => {
          malattieBreviPerGiorno[parseInt(day)] = malattieBreviVicinoPerGiorno[parseInt(day)]
        })

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
  }, [dipendenteSelezionato, annoSelezionato, dipendenti])

  useEffect(() => {
    if (!dipendenteSelezionato || !annoSelezionato) {
      return
    }

    getAnalisiFerie(parseInt(dipendenteSelezionato), parseInt(annoSelezionato))
      .then((res) => setAnalisiFerie(res.data))
      .catch(() => setAnalisiFerie(null))
  }, [dipendenteSelezionato, annoSelezionato])

  const datiDipendentePerAnalisi = useMemo(() => {
    const dipendente = dipendenti.find(d => String(d.id) === String(dipendenteSelezionato))
    if (!dipendente) {
      return {
        oreSettimanaliFT: 40,
        oreSettimanaliPT: 40,
        percentualePartTime: 100,
        isFullTime: true
      }
    }
    const percentuale = Number(dipendente.percentuale_part_time) || 100
    const oreSettimanaliFT = parseFloat(
      dipendente.contratto?.ore_settimanali_teoriche || 40
    )
    const oreSettimanaliPT = (dipendente.ore_settimanali && parseFloat(dipendente.ore_settimanali) > 0)
      ? parseFloat(dipendente.ore_settimanali)
      : Math.round((oreSettimanaliFT * percentuale / 100) * 100) / 100
    return {
      oreSettimanaliFT,
      oreSettimanaliPT,
      percentualePartTime: percentuale,
      isFullTime: percentuale >= 100
    }
  }, [dipendenti, dipendenteSelezionato])

  const annoCorrente = new Date().getFullYear()
  const dipendenteCorrente = dipendenti.find(
    (dipendente) => dipendenteSelezionato && String(dipendente.id) === String(dipendenteSelezionato)
  )
  
  const rawAnnoAssunzione = dipendenteCorrente?.data_assunzione
    ? parseInt(dipendenteCorrente.data_assunzione.split('-')[0])
    : null
  
  const annoAssunzioneSelezionato = Math.min(
    annoCorrente,
    !isNaN(rawAnnoAssunzione) && rawAnnoAssunzione > 0 
      ? rawAnnoAssunzione 
      : annoCorrente
  )

  const handleDipendenteChange = (e) => {
    const dipendenteId = e.target.value
    setDipendenteSelezionato(dipendenteId)

    if (!dipendenteId) {
      setAnnoSelezionato('')
      return
    }

    const dipendente = dipendenti.find((item) => dipendenteId && String(item.id) === String(dipendenteId))
    const rawAnno = dipendente?.data_assunzione
      ? parseInt(dipendente.data_assunzione.split('-')[0])
      : null
    const annoAssunzione = Math.min(
      annoCorrente,
      !isNaN(rawAnno) && rawAnno > 0 ? rawAnno : annoCorrente
    )

    setAnnoSelezionato(annoAssunzione)
  }

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

  const formatValue = (value, decimals = 2) => {
    if (value === undefined || value === null) return '0'
    return Number(value).toFixed(decimals)
  }

  return {
    dipendenti,
    dipendenteSelezionato,
    setDipendenteSelezionato,
    annoSelezionato,
    setAnnoSelezionato,
    analisiFerie,
    datiMensualiOreExtraordinarie,
    mesiConsecutiviSelezionati,
    setMesiConsecutiviSelezionati,
    datiAnnuali,
    datiDipendentePerAnalisi,
    annoCorrente,
    annoAssunzioneSelezionato,
    handleDipendenteChange,
    getDipendenteInfo,
    formatValue
  }
}
