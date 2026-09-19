// Arrotonda un valore al quarto d'ora (0.25)
export const arrotondaQuartoOra = (h) => Math.round((h || 0) * 4) / 4

// Calcola la data di Pasqua per un dato anno (algoritmo di Gauss)
export const calcolaPasqua = (anno) => {
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
}

// Ottieni tutte le festività italiane per un dato anno
export const getFestivitaItaliane = (anno) => {
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
}

// Mappa R1/R2 (1-7 dove 7 = domenica) a JavaScript getDay() (0-6 dove 0 = domenica)
export const rToDayOfWeek = (r) => (r === 7 || r === '7') ? 0 : Number(r)

// Calcola i giorni teorici lavorabili per un anno
export const calcolaGiorniTeoriciLavorabili = (anno, riposiSet, festivitaSet) => {
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
}

// Calcola supplementari e straordinarie mensili con compensazione intra-mese
export const calcolaSupplementariEStraordinarieMensili = (presenzeMese, isFullTime, oreSettimanaliTeoricheFT, percentualePartTime) => {
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

  const giorniDati = []
  let totaleOrdinarieLavorate = 0
  
  presenzeOrdinate.forEach(p => {
    const oreContrattualiGiornaliere = isFullTime ? oreContrattualiGiornaliereFT : oreContrattualiGiornalierePT
    
    const oreLavorate = (p.causale === 'lavoro' || p.causale === 'assemblea' || p.causale === 'sciopero') 
      ? parseFloat(p.ore_ordinarie || 0)
      : 0
    
    totaleOrdinarieLavorate += oreLavorate
    
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

  let supplementariTotali = 0
  const settimaneOrdinate = Array.from(settimaneMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  
  settimaneOrdinate.forEach(([, giorniSettimana]) => {
    const eccedenzaSettimanale = giorniSettimana.reduce((sum, g) => sum + g.eccedenza, 0)
    supplementariTotali += eccedenzaSettimanale
  })

  let supplementari = supplementariTotali
  let straordinarie = 0

  if (isFullTime) {
    straordinarie = supplementariTotali
    supplementari = 0
  } else {
    if (totaleOrdinarieLavorate >= oreOrdinarieAtteseFT) {
      straordinarie = totaleOrdinarieLavorate - oreOrdinarieAtteseFT
      supplementari = Math.max(0, oreOrdinarieAtteseFT - oreOrdinarieAttesePT)
    } else if (totaleOrdinarieLavorate >= oreOrdinarieAttesePT) {
      supplementari = totaleOrdinarieLavorate - oreOrdinarieAttesePT
    }
  }

  return {
    ordinarie: totaleOrdinarieLavorate,
    supplementari: Math.round(Math.max(0, supplementari) * 100) / 100,
    straordinarie: Math.round(Math.max(0, straordinarie) * 100) / 100
  }
}

// Calcola la media delle ore supplementari per un periodo continuativo di N mesi consecutivi
export const calcolaMediaSupplementari = (datiMensili, numMesi) => {
  if (!datiMensili || datiMensili.length === 0) {
    return { trovato: false, mediaMensile: 0, mediaSettimanale: 0, mesiTrovati: [] }
  }

  const ORE_SETTIMANALI_MEDIE = 4.33

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
}
