import { useState, useEffect, useCallback, useMemo } from 'react'
import { getDipendenti, getAnalisiFerie } from '../../services/dipendentiService'
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

// Arrotonda un valore al quarto d'ora (0.25)
const arrotondaQuartoOra = (h) => Math.round((h || 0) * 4) / 4

// Componente che mostra il riepilogo dell'analisi part-time (range trovato, medie, nuove percentuali)
function RisultatoAnalisiPartTime({ risultato, datiDipendente }) {
  // oreSettimanaliFT: ore CCNL full-time (100%) dalla regola del contratto (es. 39h)
  // oreSettimanaliPT: ore settimanali specifiche del dipendente dall'anagrafica (es. 29.25h)
  const { oreSettimanaliFT, oreSettimanaliPT, percentualePartTime } = datiDipendente

  // Ore PT e supplementari settimanali: valori precisi (NON arrotondati)
  const orePT = oreSettimanaliPT
  const suppSett = risultato.mediaSettimanale

  // Solo il totale finale viene arrotondato al quarto d'ora
  const oreIpoteticheArrotondate = arrotondaQuartoOra(orePT + suppSett)

  const nuovaPercentuale = oreSettimanaliFT > 0
    ? (oreIpoteticheArrotondate / oreSettimanaliFT) * 100
    : 0
  const incrementoPunti = nuovaPercentuale - percentualePartTime
  const formatValue = (v, d = 2) => Number(v || 0).toFixed(d)

  return (
    <>
      <div>
        <strong>Periodo:</strong>{' '}
        <span>{risultato.mesiTrovati.join(' → ')}</span>
      </div>
      <div>
        <strong>Media suppl.:</strong>{' '}
        <span>{formatValue(risultato.mediaMensile)} h/mese</span>
        {' = '}
        <span><strong>{formatValue(suppSett)} h/sett.</strong></span>
      </div>
      <div className="analisi-hr-parttime-divider">
        <div>
          <strong>Tempo Pieno da CCNL :</strong>{' '}
          <span>{formatValue(oreSettimanaliFT)} h/sett.</span>
        </div>
        <div>
          <strong>% Part-Time attuale:</strong>{' '}
          <span className="analisi-hr-parttime-text-yellow">{formatValue(percentualePartTime)}%</span>
          {' = '}
          <span>{formatValue(orePT)} h/sett</span>
        </div>
        <div className="analisi-hr-parttime-divider-dashed">
          <strong>Nuova % Part-Time:</strong>{' '}
          <span>{formatValue(orePT)} + {formatValue(suppSett)} = {formatValue(oreIpoteticheArrotondate)} h/sett</span>
          {' → '}
          <span className="analisi-hr-parttime-text-yellow">
            {formatValue(nuovaPercentuale)}%
          </span>
          <span className="analisi-hr-text-muted"> (</span>
          <span className="analisi-hr-parttime-text-green">
            +{formatValue(incrementoPunti)} pt
          </span>
          <span className="analisi-hr-text-muted">)</span>
        </div>
      </div>
    </>
  )
}

function AnalisiHR() {
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

  // Mappa R1/R2 (1-7 dove 7 = domenica) a JavaScript getDay() (0-6 dove 0 = domenica)
  const rToDayOfWeek = (r) => (r === 7 || r === '7') ? 0 : Number(r)

  // Calcola i giorni teorici lavorabili per un anno
  const calcolaGiorniTeoriciLavorabili = useCallback((anno, riposiSet, festivitaSet) => {
    let count = 0
    const startDate = new Date(anno, 0, 1)
    const endDate = new Date(anno, 11, 31)

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay() // 0 = Domenica, 1 = Lunedì, ..., 6 = Sabato
      const dateStr = d.toISOString().split('T')[0]

      // Escludi i giorni di riposo configurati (R1/R2 o part-time a 0h)
      if (riposiSet.has(dayOfWeek)) continue

      // Escludi le festività che cadono in giorni lavorativi
      if (festivitaSet.has(dateStr)) continue

      count++
    }

    return count
  }, [])

  // Calcola supplementari e straordinarie mensili con compensazione intra-mese
  // Algoritmo corretto:
  // - Le assenze giustificate (malattia, ferie, etc) NON generano straordinario
  // - Solo eccedenze dalle ore effettivamente LAVORATE creano straordinario/supplementare
  // - Eccedenza giornaliera = ore_lavorate - ore_contrattuali_giornaliere
  // - Deficit (giorni con assenze parziali) compensati da eccedenze successive
  const calcolaSupplementariEStraordinarieMensili = useCallback((presenzeMese, isFullTime, oreSettimanaliTeoricheFT, percentualePartTime) => {
    if (!oreSettimanaliTeoricheFT || oreSettimanaliTeoricheFT === 0) {
      // Fallback: usa direttamente i valori dal DB
      const totaleOrdinarie = presenzeMese.reduce((sum, p) => sum + parseFloat(p.ore_ordinarie || 0), 0)
      if (isFullTime) {
        const totaleStraordinarie = presenzeMese.reduce((sum, p) => sum + parseFloat(p.ore_straordinarie || 0), 0)
        return { ordinarie: totaleOrdinarie, supplementari: 0, straordinarie: totaleStraordinarie }
      } else {
        const totaleEccedenti = presenzeMese.reduce((sum, p) => sum + parseFloat(p.ore_eccedenti || 0), 0)
        return { ordinarie: totaleOrdinarie, supplementari: totaleEccedenti, straordinarie: 0 }
      }
    }

    // Ore contrattuali giornaliere
    const oreContrattualiGiornaliereFT = oreSettimanaliTeoricheFT / 5
    const oreSettimanaliPT = (oreSettimanaliTeoricheFT * percentualePartTime) / 100
    const oreContrattualiGiornalierePT = oreSettimanaliPT / 5
    
    // Ore ordinarie attese mensili (4.33 settimane)
    const oreOrdinarieAttesePT = oreSettimanaliPT * 4.33
    const oreOrdinarieAtteseFT = oreSettimanaliTeoricheFT * 4.33
    
    // Ordina presenze per data
    const presenzeOrdinate = [...presenzeMese].sort((a, b) => new Date(a.data) - new Date(b.data))
    
    if (presenzeOrdinate.length === 0) {
      return { ordinarie: 0, supplementari: 0, straordinarie: 0 }
    }

    // PASSO 1: Calcola eccedenza/deficit SOLO dalle ore LAVORATE (no assenze)
    const giorniDati = []
    let totaleOrdinarieLavorate = 0
    
    presenzeOrdinate.forEach(p => {
      const oreContrattualiGiornaliere = isFullTime ? oreContrattualiGiornaliereFT : oreContrattualiGiornalierePT
      
      // Ore effettivamente LAVORATE (solo se causale = 'lavoro' o ha ore_ordinarie)
      const oreLavorate = (p.causale === 'lavoro' || p.causale === 'assemblea' || p.causale === 'sciopero') 
        ? parseFloat(p.ore_ordinarie || 0)
        : 0
      
      totaleOrdinarieLavorate += oreLavorate
      
      // Eccedenza/Deficit SOLO dalle ore lavorate
      const eccedenza = Math.max(0, oreLavorate - oreContrattualiGiornaliere)
      const deficit = Math.max(0, oreContrattualiGiornaliere - oreLavorate)
      
      giorniDati.push({
        data: p.data,
        oreLavorate,
        eccedenza,
        deficit,
        haAssenza: !['lavoro', 'assemblea', 'sciopero'].includes(p.causale) && oreLavorate === 0
      })
    })

    // PASSO 2: Raggruppa per settimana (lunedì-domenica)
    const settimaneMap = new Map()
    giorniDati.forEach(giorno => {
      const data = new Date(giorno.data)
      const giornoSettimana = data.getDay() // 0=Dom, 1=Lun, ..., 6=Sab
      const giorniALunedi = giornoSettimana === 0 ? 6 : giornoSettimana - 1
      const dataLunedi = new Date(data)
      dataLunedi.setDate(data.getDate() - giorniALunedi)
      const keySettimana = dataLunedi.toISOString().split('T')[0]
      
      if (!settimaneMap.has(keySettimana)) {
        settimaneMap.set(keySettimana, [])
      }
      settimaneMap.get(keySettimana).push(giorno)
    })

    // PASSO 3: Calcola eccedenze settimanali (SENZA compensazione intra-mese)
    // Le ore straordinarie/supplementari di una settimana NON compensano deficit di altre settimane
    let supplementariTotali = 0

    // Ordina settimane per data
    const settimaneOrdinate = Array.from(settimaneMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    
    settimaneOrdinate.forEach(([, giorniSettimana]) => {
      // Totali SOLO dalle ore lavorate
      const eccedenzaSettimanale = giorniSettimana.reduce((sum, g) => sum + g.eccedenza, 0)
      
      // Eccedenza diretta (nessuna compensazione)
      supplementariTotali += eccedenzaSettimanale
    })

    // PASSO 4: Calcola supplementari e straordinarie finali
    let supplementari = supplementariTotali
    let straordinarie = 0

    if (isFullTime) {
      // Per FT: le eccedenze compensate sono direttamente straordinarie
      straordinarie = supplementariTotali
      supplementari = 0
    } else {
      // Per PT: verificare se si raggiungono le ore ordinarie di FT
      if (totaleOrdinarieLavorate >= oreOrdinarieAtteseFT) {
        // Eccesso oltre le ordinarie FT diventa straordinario
        straordinarie = totaleOrdinarieLavorate - oreOrdinarieAtteseFT
        // Le supplementari sono la parte tra ordinarie PT e ordinarie FT
        supplementari = Math.max(0, oreOrdinarieAtteseFT - oreOrdinarieAttesePT)
      } else if (totaleOrdinarieLavorate >= oreOrdinarieAttesePT) {
        // Solo supplementari (tra ordinarie PT e ordinarie FT)
        supplementari = totaleOrdinarieLavorate - oreOrdinarieAttesePT
      }
    }

    return {
      ordinarie: totaleOrdinarieLavorate,
      supplementari: Math.round(Math.max(0, supplementari) * 100) / 100,
      straordinarie: Math.round(Math.max(0, straordinarie) * 100) / 100
    }
  }, [])

  // Calcola la media delle ore supplementari per un periodo continuativo di N mesi consecutivi
  // Scansiona da sinistra a destra (Gennaio -> Dicembre) e si ferma al primo range trovato
  const calcolaMediaSupplementari = useCallback((datiMensili, numMesi) => {
    if (!datiMensili || datiMensili.length === 0) {
      return { trovato: false, mediaMensile: 0, mediaSettimanale: 0, mesiTrovati: [] }
    }

    const ORE_SETTIMANALI_MEDIE = 4.33

    // Scansiona da sinistra a destra cercando il primo range di N mesi consecutivi con supplementari > 0
    for (let i = 0; i <= datiMensili.length - numMesi; i++) {
      const range = datiMensili.slice(i, i + numMesi)
      const tuttiConSupplementari = range.every(m => (m.supplementari || 0) > 0)

      if (tuttiConSupplementari) {
        const sommaSupplementari = range.reduce((sum, m) => sum + (m.supplementari || 0), 0)
        const mediaMensile = sommaSupplementari / numMesi
        const mediaSettimanale = mediaMensile / ORE_SETTIMANALI_MEDIE

        return {
          trovato: true,
          mediaMensile: Math.round(mediaMensile * 100) / 100,
          mediaSettimanale: Math.round(mediaSettimanale * 100) / 100,
          mesiTrovati: range.map(m => m.name)
        }
      }
    }

    return { trovato: false, mediaMensile: 0, mediaSettimanale: 0, mesiTrovati: [] }
  }, [])

  // Deriva i dati del dipendente selezionato (ore CCNL e % part-time) per il calcolo del nuovo part-time
  // - oreSettimanaliFT: ore CCNL full-time (= 100%) dalla regola del contratto
  // - oreSettimanaliPT: ore settimanali specifiche del dipendente (anagrafica)
  // - percentualePartTime: % part-time attuale (anagrafica)
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
    // Ore CCNL full-time: SEMPRE dalla regola del contratto (regola_calcolo_contratto.ore_settimanali_teoriche)
    const oreSettimanaliFT = parseFloat(
      dipendente.contratto?.ore_settimanali_teoriche || 40
    )
    // Ore settimanali specifiche del dipendente (anagrafica): usate come fallback se > 0
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
        
        
        
        // Aggrega tutti i dati - solo da mesi approvati
        const tuttePresenze = risultati.flatMap((r) => {
          
          return r.data || []
        })
        
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
            assenzePerGiornoSettimana: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
            assenzeIndividualiPerGiornoSettimana: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
            malattieBreviPerGiorno: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
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
        
        const dipendenteObj = dipendenti.find(d => String(d.id) === String(dipendenteSelezionato)) || tuttePresenze[0]?.dipendente

        const isFullTime = Number(dipendenteObj?.percentuale_part_time ?? tuttePresenze[0]?.dipendente?.percentuale_part_time ?? 100) >= 100
        const giorniSettimanali = dipendenteObj?.giorni_lavorativi_settimanali || tuttePresenze[0]?.dipendente?.giorni_lavorativi_settimanali || 5
        const percentualePartTime = Number(dipendenteObj?.percentuale_part_time ?? tuttePresenze[0]?.dipendente?.percentuale_part_time ?? 100)
        
        // Estrai ore settimanali teoriche dal CCNL (regola di calcolo)
        let oreSettimanaliTeoricheFT = 40 // default: 40h settimanali
        if (tuttePresenze[0]?.dipendente?.contratto?.ore_settimanali_teoriche) {
          oreSettimanaliTeoricheFT = parseFloat(tuttePresenze[0].dipendente.contratto.ore_settimanali_teoriche)
        }
        
        // Ottieni festività per correlazione
        const festivita = getFestivitaItaliane(annoSelezionato)
        const dateToString = (date) => date.toISOString().split('T')[0]
        const festivitaSet = new Set(festivita.map(dateToString))
        
        // Determina i giorni di riposo del dipendente (utilizzando R1, R2 storicizzati/attuali per FT o orari settimanali a 0 per PT)
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
            // Part-time: verifica quali giorni nella distribuzione dell'orario settimanale sono a 0 o assenti
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

        // Calcola giorni teorici lavorabili dal calendario
        const giorniTeoriciLavorabili = calcolaGiorniTeoriciLavorabili(annoSelezionato, riposiSet, festivitaSet)
        
        // Set per tracciare giorni unici lavorati
        const giorniUniciSet = new Set()

        // Tipologie di assenza da considerare per analisi comportamentale
        const causaliAssenza = ['malattia', 'maternita', 'infortunio', 'cassa_integrazione', 'permesso_non_retribuito']
        // Tipologie di assenza individuale (escludendo CIG e maternita) per il grafico a barre
        const causaliAssenzaIndividuale = ['malattia', 'infortunio', 'permesso_non_retribuito']
        
        // Aggregazione per modalità di lavoro per mese
        const modalitaPerMese = {}
        const nomiMesi = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
        
        tuttePresenze.forEach(p => {
          // Nota: Ore ordinarie, straordinarie e eccedenti verranno calcolate 
          // in base alle medie mensili nel nuovo loop (datiMensualiGrafico)

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

        // CALCOLO DATI MENSILI PER GRAFICO ORE STRAORDINARIE/ECCEDENTI
        const nomiMesiArray = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
        const datiMensualiGrafico = []
        
        // Raggruppa presenze per mese
        const presenzePerMese = {}
        risultati.forEach((risultato, meseIndex) => {
          const presenzeMese = risultato.data || []
          const nomeMese = nomiMesiArray[meseIndex]
          
          presenzePerMese[nomeMese] = presenzeMese
        })
        
        // Per ogni mese, calcola supplementari/straordinarie
        nomiMesiArray.forEach((nomeMese) => {
          const presenzeMese = presenzePerMese[nomeMese] || []
          
          if (presenzeMese.length === 0) {
            // Mese senza dati
            datiMensualiGrafico.push({
              name: nomeMese,
              ordinarie: 0,
              supplementari: 0,
              straordinarie: 0
            })
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

          // Aggiorna i totali annuali
          contatori.oreOrdinarie += ordinarie
          if (isFullTime) {
            contatori.oreStraordinarie += straordinarie
          } else {
            contatori.oreEccedenti += (supplementari + straordinarie)
          }
        })

        // Aggiorna lo stato con i dati mensili
        setDatiMensualiOreExtraordinarie(datiMensualiGrafico)

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
  }, [dipendenteSelezionato, annoSelezionato, calcolaGiorniTeoriciLavorabili, getFestivitaItaliane, calcolaSupplementariEStraordinarieMensili, dipendenti])

  useEffect(() => {
    if (!dipendenteSelezionato || !annoSelezionato) {
      return
    }

    getAnalisiFerie(parseInt(dipendenteSelezionato), parseInt(annoSelezionato))
      .then((res) => setAnalisiFerie(res.data))
      .catch(() => setAnalisiFerie(null))
  }, [dipendenteSelezionato, annoSelezionato])

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

  const annoCorrente = new Date().getFullYear()
  const dipendenteCorrente = dipendenti.find(
    (dipendente) => dipendenteSelezionato && String(dipendente.id) === String(dipendenteSelezionato)
  )
  
  // Estrai anno di assunzione in modo sicuro, con fallback a annoCorrente solo se dati non disponibili
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

    // Se non è selezionato alcun dipendente, resetta anche l'anno
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

    // SEMPRE imposta l'anno all'anno di assunzione del dipendente selezionato
    setAnnoSelezionato(annoAssunzione)
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


  const datiAssenzeChart = [
    { name: 'Malattia', value: datiAnnuali.giorniAssenzaTotali.malattia, color: '#ef4444' },
    { name: 'Maternità', value: datiAnnuali.giorniAssenzaTotali.maternita, color: '#8b5cf6' },
    { name: 'Infortunio', value: datiAnnuali.giorniAssenzaTotali.infortunio, color: '#f59e0b' },
    { name: 'CIG', value: datiAnnuali.giorniAssenzaTotali.cig, color: '#6b7280' },
    { name: 'PNR', value: datiAnnuali.giorniAssenzaTotali.pnr, color: '#10b981' }
  ].filter(item => item.value > 0)

  const datiPRPNRChart = [
    { name: 'PR', value: datiAnnuali.pr, color: '#3b82f6' },
    { name: 'PNR', value: datiAnnuali.pnr, color: '#10b981' },
    { name: 'CIG', value: datiAnnuali.cig, color: '#6b7280' },
    { name: 'Sind', value: datiAnnuali.sindacale, color: '#f59e0b' }
  ].filter(item => item.value > 0)

  return (
    <div className="analisi-hr-container">
      <h1 className="analisi-hr-title">Analisi HR</h1>

      {/* Selezione Dipendente e Anno */}
      <div className="analisi-hr-selection">
        <div>
          <label className="analisi-hr-label">
            Dipendente
          </label>
          <select className="analisi-hr-select"
            value={dipendenteSelezionato}
            onChange={handleDipendenteChange}
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
          <label className="analisi-hr-label">
            Periodo ({annoAssunzioneSelezionato} - {annoCorrente})
          </label>
          <select className="analisi-hr-select analisi-hr-select-small"
            value={annoSelezionato}
            onChange={(e) => {
              const selectedYear = e.target.value ? parseInt(e.target.value) : ''
              // Previeni la selezione di anni precedenti all'assunzione
              if (selectedYear && selectedYear < annoAssunzioneSelezionato) {
                setAnnoSelezionato(annoAssunzioneSelezionato)
              } else {
                setAnnoSelezionato(selectedYear)
              }
            }}
            disabled={!dipendenteSelezionato}
          >
            {Array.from({ length: Math.max(0, annoCorrente - annoAssunzioneSelezionato + 1) }, (_, i) => {
              const y = annoAssunzioneSelezionato + i
              return <option key={y} value={y}>{y}</option>
            })}
          </select>
        </div>
      </div>

      {/* Widget con contatori annuali - Ricalco esatto fogli presenze */}
      <div className="analisi-hr-widgets">
        {/* Ore Ordinarie */}
        <div className="analisi-hr-widget">
          <div className="analisi-hr-widget-title">Ore Ordinarie</div>
          <div className="analisi-hr-widget-value">{formatValue(datiAnnuali.oreOrdinarie)} ore</div>
          <div className="analisi-hr-widget-subtitle">Totale annuale</div>
        </div>
        
        {/* Straordinari / Eccedenti */}
        {datiAnnuali.isFullTime && (
          <div className="analisi-hr-widget">
            <div className="analisi-hr-widget-title">Straordinari</div>
            <div className="analisi-hr-widget-value">{formatValue(datiAnnuali.oreStraordinarie)} ore</div>
            <div className="analisi-hr-widget-subtitle">Tempo Pieno</div>
          </div>
        )}
        {!datiAnnuali.isFullTime && (
          <div className="analisi-hr-widget">
            <div className="analisi-hr-widget-title">Ore Eccedenti</div>
            <div className="analisi-hr-widget-value">{formatValue(datiAnnuali.oreEccedenti)} ore</div>
            <div className="analisi-hr-widget-subtitle">Part-time</div>
          </div>
        )}
        
        {/* Giorni Lavorati - Donut Chart */}
        <div className="analisi-hr-widget">
          <div className="analisi-hr-widget-title">Giorni Lavorati</div>
          <div className="analisi-hr-widget-content analisi-hr-widget-donut">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Lavorati', value: datiAnnuali.giorniLavorati, color: '#3b82f6' },
                    { 
                      name: 'Non lavorati', 
                      value: Math.max(0, datiAnnuali.giorniTeoriciLavorabili - datiAnnuali.giorniLavorati), 
                      color: '#4b5563'
                    }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={40}
                  fill="#8884d8"
                  dataKey="value"
                  labelLine={false}
                  isAnimationActive={false}
                >
                  {[
                    { color: '#3b82f6' },
                    { color: '#4b5563' }
                  ].map((entry, index) => (
                    <Cell key={`cell-giorni-${index}`} fill={entry.color} />
                  ))}
                </Pie> 
              </PieChart>
            </ResponsiveContainer>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              color: 'var(--color-text)',
              fontSize: '0.65rem',
              fontWeight: '700',
              paddingLeft: '6px',
              paddingRight: '6px'
            }}>
              {datiAnnuali.giorniLavorati} gg
            </div>
          </div>
        </div>
        
        {/* Giorni Teorici Lavorabili */}
        <div className="analisi-hr-widget">
          <div className="analisi-hr-widget-title">Giorni Teorici</div>
          <div className="analisi-hr-widget-value">{datiAnnuali.giorniTeoriciLavorabili} gg</div>
          <div className="analisi-hr-widget-subtitle">{datiAnnuali.giorniSettimanali} gg./sett.</div>
        </div>
        
        {/* Ferie/Permessi - UNIFICATO */}
        <div className="analisi-hr-widget">
          <div className="analisi-hr-widget-title">Ferie/Permessi</div>
          <div className="analisi-hr-widget-value">{formatValue(datiAnnuali.feriePermessi)} ore</div>
          <div className="analisi-hr-widget-subtitle">Goduto aggregato</div>
        </div>
        
        {/* PR */}
        <div className="analisi-hr-widget">
          <div className="analisi-hr-widget-title">PR</div>
          <div className="analisi-hr-widget-value">{formatValue(datiAnnuali.pr)} ore</div>
          <div className="analisi-hr-widget-subtitle">Permessi Retribuiti</div>
        </div>
        
        {/* PNR */}
        <div className="analisi-hr-widget">
          <div className="analisi-hr-widget-title">PNR</div>
          <div className="analisi-hr-widget-value">{formatValue(datiAnnuali.pnr)} ore</div>
          <div className="analisi-hr-widget-subtitle">Permessi Non Retribuiti</div>
        </div>
        
        {/* INPS */}
        <div className="analisi-hr-widget">
          <div className="analisi-hr-widget-title">INPS</div>
          <div className="analisi-hr-widget-value">{formatValue(datiAnnuali.inps)} ore</div>
          <div className="analisi-hr-widget-subtitle">Malattia + Maternità</div>
        </div>
        
        {/* INAIL */}
        <div className="analisi-hr-widget">
          <div className="analisi-hr-widget-title">INAIL</div>
          <div className="analisi-hr-widget-value">{formatValue(datiAnnuali.inail)} ore</div>
          <div className="analisi-hr-widget-subtitle">Infortunio</div>
        </div>
        
        {/* CIG */}
        <div className="analisi-hr-widget">
          <div className="analisi-hr-widget-title">CIG</div>
          <div className="analisi-hr-widget-value">{formatValue(datiAnnuali.cig)} ore</div>
          <div className="analisi-hr-widget-subtitle">Cassa Integrazione</div>
        </div>
        
        {/* Sindacale */}
        <div className="analisi-hr-widget">
          <div className="analisi-hr-widget-title">Sindacale</div>
          <div className="analisi-hr-widget-value">{formatValue(datiAnnuali.sindacale)} ore</div>
          <div className="analisi-hr-widget-subtitle">Assemblea + Sciopero</div>
        </div>
      </div>

      {/* Prima riga: Card 1 e Card 2 */}
      <div className="analisi-hr-row-center">
        {/* Card 1: Tasso di assenza individuale */}
        <div className="analisi-hr-card">
          <div className="analisi-hr-card-header-sm">
            <span className="analisi-hr-card-title">Tasso di Assenza Individuale</span>
          </div>
          <hr className="analisi-hr-card-divider" />
          <div className="analisi-hr-card-body">
            {/* Tasso di assenteismo e grafico distribuzione per giorno - allineati orizzontalmente */}
            <div className="analisi-hr-flex-center">
              {/* Tasso percentuale */}
              <div className="analisi-hr-big-number-center"> 
                <div className="analisi-hr-big-number">
                  {datiAnnuali.giorniTeoriciLavorabili > 0 ? 
                    formatValue((datiAnnuali.totaleGiorniAssenza / datiAnnuali.giorniTeoriciLavorabili * 100), 1) + '%' : '0%'
                  }
                </div>
                
                {datiAnnuali.assenzeVicinoFestivi > 0 && (
                  <div className="analisi-hr-warning-text">
                    gg. "assenza ponte" su festivi/riposi: {datiAnnuali.assenzeVicinoFestivi}
                  </div>
                )}
              </div>
              
              {/* Grafico a barre distribuzione per giorno della settimana */}
              <div className="analisi-hr-chart-small">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getBarChartGiorniSettimana()} layout="vertical" activeBar={{ fillOpacity: 1 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={35} tick={{ fontSize: 10, fill: '#9ca3af' }} interval={0} />
                    <Bar dataKey="Assenze" fill="#3b82f6" barSize={12} />
                    <Tooltip
                      cursor={false}
                      wrapperStyle={{ opacity: 1 }}
                      contentStyle={{ backgroundColor: '#374151', border: '1px solid #4b5563', color: 'white', fontSize: '0.75rem' }}
                      formatter={(value) => [value, 'Assenze']}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Grafico a torta con composizione assenze */}
            <div className="analisi-hr-flex-column-center">
              <div className="analisi-hr-chart-medium">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={datiAssenzeChart}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ percent, x, y, payload }) => (
                        <text 
                          x={x} 
                          y={y} 
                          fontSize={12}
                          fill={payload.color}
                          textAnchor="middle"
                          dominantBaseline="central"
                        >
                          {`${(percent * 100).toFixed(0)}%`}
                        </text>
                      )}
                    >
                      {datiAssenzeChart.map((entry, index) => (
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
              <div className="analisi-hr-legend-grid">
                <div className="analisi-hr-legend-item">
                  <div className="analisi-hr-legend-color" style={{ backgroundColor: '#ef4444'}} />
                  <span>Malattia: {datiAnnuali.giorniAssenzaTotali.malattia} gg.</span>
                </div>
                <div className="analisi-hr-legend-item">
                  <div className="analisi-hr-legend-color" style={{ backgroundColor: '#6b7280'}} />
                  <span>CIG: {datiAnnuali.giorniAssenzaTotali.cig} gg.</span>
                </div>
                <div className="analisi-hr-legend-item">
                  <div className="analisi-hr-legend-color" style={{ backgroundColor: '#8b5cf6'}} />
                  <span>Maternità: {datiAnnuali.giorniAssenzaTotali.maternita} gg.</span>
                </div>
                <div className="analisi-hr-legend-item">
                  <div className="analisi-hr-legend-color" style={{ backgroundColor: '#10b981'}} />
                  <span>PNR: {datiAnnuali.giorniAssenzaTotali.pnr} gg.</span>
                </div>
                <div className="analisi-hr-legend-item">
                  <div className="analisi-hr-legend-color" style={{ backgroundColor: '#f59e0b'}} />
                  <span>Infortunio: {datiAnnuali.giorniAssenzaTotali.infortunio} gg.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Ripartizione PR, PNR, CIG, Sindacale */}
        <div className="analisi-hr-card">
          <div className="analisi-hr-card-header-sm">
            <span className="analisi-hr-card-title">PR, PNR, CIG, Sind / Modalità lavoro</span>
          </div>
          <hr className="analisi-hr-card-divider" />
          <div className="analisi-hr-card-body">
            {/* Totale ore e percentuale - affiancati orizzontalmente */}
            {(() => {
              const totale = datiAnnuali.pr + datiAnnuali.pnr + datiAnnuali.cig + datiAnnuali.sindacale
              const percentuale = datiAnnuali.giorniTeoriciLavorabili > 0 ?
                ((totale) / (datiAnnuali.giorniTeoriciLavorabili * 8) * 100) : 0
              return (
                <div className="analisi-hr-flex-space-around">
                  <div className="analisi-hr-text-center">
                    <div className="analisi-hr-text-value">
                      {formatValue(totale)} h
                    </div>
                    <div className="analisi-hr-text-label">
                      Tot. anno
                    </div>
                  </div>
                  <div className="analisi-hr-text-center">
                    <div className="analisi-hr-text-value">
                      {formatValue(percentuale, 1)}%
                    </div>
                    <div className="analisi-hr-text-label">
                      % su h lavorabili
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Grafico a torta */}
            <div className="analisi-hr-flex-row-center">
              <div className="analisi-hr-chart-180">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={datiPRPNRChart}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={55}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ percent, x, y, payload }) => (
                        <text 
                          x={x} 
                          y={y} 
                          fontSize={12}
                          fill={payload.color}
                          textAnchor="middle"
                          dominantBaseline="central"
                        >
                          {`${(percent * 100).toFixed(0)}%`}
                        </text>
                      )}
                    >
                      {datiPRPNRChart.map((entry, index) => (
                        <Cell key={`cell-pr-pnr-cig-sind-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      cursor={false}
                      wrapperStyle={{ backgroundColor: '#374151', opacity: 1, zIndex: 100 }}
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null
                        return (
                          <div style={{ backgroundColor: '#374151', border: '1px solid #4b5563', padding: '0.5rem', borderRadius: '4px' }}>
                            {payload.map((entry, index) => (
                              <div key={index} style={{ color: entry.payload.color }}>
                                {entry.payload.name}: {formatValue(entry.value, 2)} h
                              </div>
                            ))}
                          </div>
                        )
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="analisi-hr-legend-flex">
                <div className="analisi-hr-legend-item">
                  <div className="analisi-hr-legend-color" style={{ backgroundColor: '#3b82f6'}} />
                  <span>PR: {formatValue(datiAnnuali.pr)} h</span>
                </div> 
                <div className="analisi-hr-legend-item">
                  <div className="analisi-hr-legend-color" style={{ backgroundColor: '#10b981'}} />
                  <span>PNR: {formatValue(datiAnnuali.pnr)} h</span>
                </div>
                <div className="analisi-hr-legend-item">
                  <div className="analisi-hr-legend-color" style={{ backgroundColor: '#6b7280'}} />
                  <span>CIG: {formatValue(datiAnnuali.cig)} h</span>
                </div>
                <div className="analisi-hr-legend-item">
                  <div className="analisi-hr-legend-color" style={{ backgroundColor: '#f59e0b'}} />
                  <span>Sind: {formatValue(datiAnnuali.sindacale)} h</span>
                </div>
              </div>
            </div>

            {/* Grafico istogramma modalità di lavoro per mese */}
            <div className="analisi-hr-chart-bar">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datiAnnuali.modalitaLavoroPerMese} margin={{ top: 2, right: 0, left: 0, bottom: 0 }} activeBar={{ fillOpacity: 1 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                  <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 8 }} />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 10 }} hide />
                  <Tooltip
                    cursor={false}
                    content={({ payload }) => (
                      <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'white', padding: '8px 12px', fontSize: '0.75rem', zIndex: 1000 }}>
                        {payload.map((entry, index) => (
                          <div key={index} style={{ color: entry.fill || 'white' }}>{`${entry.name}: ${formatValue(entry.value, 2)} h`}</div>
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
                        wrapperStyle={{ color: '#9ca3af', fontSize: '0.6rem', marginBottom: 0 }}
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
      <div className="analisi-hr-row-wrap">
        {/* Card 3: Ferie/Permessi */}
        <div className="analisi-hr-card">
          <div className="analisi-hr-card-header">
            <span className="analisi-hr-card-title">Ferie/Permessi</span>
          </div>
          <hr className="analisi-hr-card-divider" />
          <div className="analisi-hr-card-body-short">
            {!dipendenteSelezionato || !annoSelezionato || !analisiFerie ? <p className="analisi-hr-text-gray">Seleziona un dipendente per visualizzare i dati.</p> : (
              <div className="analisi-hr-flex-column-gap">
                <div className="analisi-hr-grid-2cols">
                  <div><strong>Ferie: </strong> <span>{formatValue(analisiFerie.ferie.maturate)} mat. / {formatValue(analisiFerie.ferie.godute)} god.</span></div>
                  <div><strong>Residuo: </strong> <span>{formatValue(analisiFerie.ferie.residue)} ore</span></div>
                  <div><strong>Min. 2 settimane:</strong> <span>{formatValue(analisiFerie.ferie.percentuale_due_settimane, 1)}%</span></div>
                  <div><strong>Smaltimento legale:</strong> <span>{formatValue(analisiFerie.ferie.percentuale_smaltimento, 1)}%</span></div>
                  <div><strong>situazione ferie:</strong> <span className="analisi-hr-text-status" style={{ color: analisiFerie.ferie.stato === 'regolare' ? '#34d399' : '#fbbf24' }}>{analisiFerie.ferie.stato}</span></div>
                  <div><strong>ROL + Ex-fest.: </strong> <span>{formatValue(analisiFerie.permessi_rol_ex_festivita.maturati)} maturati / {formatValue(analisiFerie.permessi_rol_ex_festivita.goduti)} goduti</span></div>
                  <div><strong>Residuo:</strong> <span>{formatValue(analisiFerie.permessi_rol_ex_festivita.residui)} ore</span></div>
                </div>
                <div className="analisi-hr-chart-220">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analisiFerie.mensile.map((mese) => ({
                        name: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'][mese.mese - 1],
                        ferie: mese.ferie_godute,
                        permessi: mese.permessi_goduti
                      }))}
                      margin={{ top: 8, right: 8, left: -18, bottom: 4 }}
                      barGap={2}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                      <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#9ca3af" tick={{ fontSize: 10 }} width={42} />
                      <Tooltip
                        cursor={false}
                        wrapperStyle={{ opacity: 1 }}
                        contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--card-value-color)', fontSize: '0.75rem' }}
                        formatter={(value, name) => [formatValue(value, 2) + ' ore', name === 'ferie' || name === 'Ferie' ? 'Ferie' : 'Permessi/ROL-ex festività']}
                      />
                      <Legend wrapperStyle={{ fontSize: '0.7rem', marginBottom: 0 }} />
                      <Bar dataKey="ferie" name="Ferie" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="permessi" name="Permessi/ROL-ex festività" fill="#10b981" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card 4: Ore Straordinarie / Eccedenti */}
        <div className="analisi-hr-card">
          <div className="analisi-hr-card-header">
            <span className="analisi-hr-card-title">{datiAnnuali.isFullTime ? 'Ore Straordinarie' : 'Ore Eccedenti'}</span>
          </div>
          <hr className="analisi-hr-card-divider" />
          <div className="analisi-hr-card-body-chart">
            {!dipendenteSelezionato || !annoSelezionato || datiMensualiOreExtraordinarie.length === 0 ? (
              <div className="analisi-hr-flex-center">
                <p className="analisi-hr-text-gray">Seleziona un dipendente per visualizzare i dati.</p>
              </div>
            ) : (
              <div className="analisi-hr-flex-column-gap" style={{flex: 1}}>
                {/* Totali annuali */}
                <div className="analisi-hr-grid-2cols-sm">
                  {datiAnnuali.isFullTime ? (
                    <div><strong>Straordinarie:</strong> <span>{formatValue(datiAnnuali.oreStraordinarie)} h</span></div>
                  ) : (
                    <>
                      <div><strong>Supplementari:</strong> <span>{formatValue(datiMensualiOreExtraordinarie.reduce((s, m) => s + m.supplementari, 0))} h</span></div>
                      <div><strong>Straordinarie:</strong> <span>{formatValue(datiMensualiOreExtraordinarie.reduce((s, m) => s + m.straordinarie, 0))} h</span></div>
                    </>
                  )}
                </div>

                {/* Grafico istogramma ore straordinarie/eccedenti mensili */}
                <div className="analisi-hr-chart-280">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={datiMensualiOreExtraordinarie}
                      margin={{ top: 8, right: 8, left: -18, bottom: 4 }}
                      barGap={0}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                      <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#9ca3af" tick={{ fontSize: 10 }} width={42} />
                      <Tooltip
                        cursor={false}
                        wrapperStyle={{ opacity: 1 }}
                        contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--card-value-color)', fontSize: '0.75rem' }}
                        formatter={(value, name) => {
                          let label = ''
                          if (name === 'ordinarie') label = 'Ordinarie'
                          else if (name === 'supplementari') label = 'Supplementari'
                          else if (name === 'straordinarie') label = 'Straordinarie'
                          return [formatValue(value, 2) + ' h', label]
                        }}
                        labelFormatter={(label) => `${label}`}
                      />
                      <Legend wrapperStyle={{ fontSize: '0.7rem', marginBottom: 0 }} />
                      <Bar dataKey="ordinarie" name="Ordinarie" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                      {!datiAnnuali.isFullTime && (
                        <Bar dataKey="supplementari" name="Supplementari" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                      )}
                      <Bar dataKey="straordinarie" name="Straordinarie" fill="#ef4444" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Analisi supplementari continuativi: visibile solo per part-time */}
                {!datiAnnuali.isFullTime && (
                <div className="analisi-hr-margin-top-sm">
                  <div className="analisi-hr-flex-center-sm">
                    <label htmlFor="mesi-consecutivi-select" className="analisi-hr-label-sm">
                      Mesi consecutivi con supplementari:
                    </label>
                    <select
                      id="mesi-consecutivi-select"
                      value={mesiConsecutiviSelezionati}
                      onChange={(e) => setMesiConsecutiviSelezionati(Number(e.target.value))}
                      className="analisi-hr-select-pt"
                    >
                      {Array.from({ length: 11 }, (_, i) => i + 2).map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>

                  {(() => {
                    const risultato = calcolaMediaSupplementari(
                      datiMensualiOreExtraordinarie,
                      mesiConsecutiviSelezionati
                    )

                    if (!risultato.trovato) {
                      return (
                        <div className="analisi-hr-message analisi-hr-message-gray">
                          Nessun periodo continuativo di {mesiConsecutiviSelezionati} mesi con ore supplementari.
                        </div>
                      )
                    }

                    return (
                      <div className="analisi-hr-parttime-result">
                        <RisultatoAnalisiPartTime
                          risultato={risultato}
                          datiDipendente={datiDipendentePerAnalisi}
                        />
                      </div>
                    )
                  })()}
                </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalisiHR
