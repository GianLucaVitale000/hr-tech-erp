// Una riga è "significativa" quando ha un id (salvata sul DB) oppure quando
// ha valori inseriti localmente dall'utente (ore > 0 o modalità specificata).
export function haDatiSignificativi(riga) {
  if (!riga) return false
  if (riga.id !== null && riga.id !== undefined) return true
  return (
    parseFloat(riga.ore_ordinarie) > 0 ||
    parseFloat(riga.ore_causale) > 0 ||
    parseFloat(riga.ore_straordinarie) > 0 ||
    (riga.modalita_lavoro !== null && riga.modalita_lavoro !== undefined)
  )
}

/**
 * Determina i giorni che il dipendente è tenuto a compilare nel mese.
 * Per i dipendenti a tempo pieno (giorni_lavorativi_settimanali = 5),
 * sabato e domenica NON sono obbligatori.
 * Per i dipendenti part-time o con schedule non definito, tutti i giorni
 * dal giorno di assunzione alla data fine sono obbligatori.
 */
function giorniObbligatori(dipendente, anno, mese, giorni) {
  const ym = `${anno}-${String(mese).padStart(2, '0')}`
  const ultimoDelMese = `${ym}-${String(new Date(anno, mese, 0).getDate()).padStart(2, '0')}`

  // dataFine: sempre l'ultimo del mese (l'utente compila tutto il mese e invia alla fine)
  let dataFine = ultimoDelMese
  if (
    dipendente.tipo_contratto === 'determinato' &&
    dipendente.data_scadenza_contratto &&
    dipendente.data_scadenza_contratto >= `${ym}-01` &&
    dipendente.data_scadenza_contratto < dataFine
  ) {
    dataFine = dipendente.data_scadenza_contratto
  }

  // dataInizio: il giorno di assunzione se cade entro il mese corrente, altrimenti il 1°
  let dataInizio = `${ym}-01`
  if (dipendente.data_assunzione && dipendente.data_assunzione > dataInizio && dipendente.data_assunzione <= ultimoDelMese) {
    dataInizio = dipendente.data_assunzione
  }

  // Per FT 5/7, sabato (6) e domenica (0) non sono obbligatori
  const escludiWeekend = dipendente.giorni_lavorativi_settimanali === 5

  return giorni.filter(g => {
    const ds = `${ym}-${String(g).padStart(2, '0')}`
    if (ds < dataInizio || ds > dataFine) return false
    if (escludiWeekend) {
      const dow = new Date(ds).getDay()
      if (dow === 0 || dow === 6) return false // Dom o Sab non obbligatori
    }
    return true
  })
}

/**
 * Verifica completezza del foglio presenze.
 *
 * Regole:
 *  - Tutti i giorni "obbligatori" (dal giorno di assunzione fino a oggi /
 *    scadenza contratto) devono avere una riga significativa.
 *  - Se il dipendente ha `giorni_lavorativi_settimanali` valorizzato, si
 *    verifica che nessuna serie di giorni consecutivi lavorati superi quel
 *    valore. Se lo supera, viene emesso un WARNING (non blocca) perché
 *    probabilmente sono stati saltati dei riposi.
 *  - Se `giorni_lavorativi_settimanali` non è valorizzato, il check di
 *    consecutività non viene eseguito.
 *
 * @returns {{ completo: boolean, message?: string, warning?: string }}
 */
export function isFoglioCompleto(dipendente, anno, mese, giorni, righe) {
  if (!dipendente) {
    return { completo: false, message: 'Anagrafica dipendente mancante' }
  }

  const obbligatori = giorniObbligatori(dipendente, anno, mese, giorni)

  // CHECK 1: copertura
  const mancanti = obbligatori.filter(g => {
    const ds = `${anno}-${String(mese).padStart(2, '0')}-${String(g).padStart(2, '0')}`
    return !haDatiSignificativi(righe[ds])
  })
  if (mancanti.length > 0) {
    return {
      completo: false,
      message: `Compilazione presenze non completata: - ${mancanti.length} giorn${mancanti.length === 1 ? 'o' : 'i'}`,
    }
  }

  // CHECK 2: consecutività (warning soft)
  // Per un FT 5/7, il fine settimana è un "reset naturale": anche se l'utente
  // compila i feriali senza soluzione di continuità per più settimane, il
  // contatore si azzera al sabato e alla domenica. Per gli altri (6/7, PT)
  // il contatore continua attraverso tutti i giorni significativi consecutivi.
  // Iteriamo TUTTI i giorni del mese (non solo obbligatori) in modo che il
  // fine settimana, anche se non obbligatorio, faccia da reset.
  const maxConsecutivi = dipendente.giorni_lavorativi_settimanali
  if (maxConsecutivi && maxConsecutivi > 0) {
    let consecutivi = 0
    let maxRilevato = 0
    const èFT5 = maxConsecutivi === 5
    for (const g of giorni) {
      const ds = `${anno}-${String(mese).padStart(2, '0')}-${String(g).padStart(2, '0')}`
      // Escludo i giorni fuori dal range di interesse (prima di dataInizio
      // o dopo dataFine) dal conteggio consecutivi.
      if (ds < `${anno}-${String(mese).padStart(2, '0')}-01` || ds > `${anno}-${String(mese).padStart(2, '0')}-${String(new Date(anno, mese, 0).getDate()).padStart(2, '0')}`) continue
      const dow = new Date(ds).getDay() // 0=Dom, 6=Sab
      const isWeekend = dow === 0 || dow === 6
      if (èFT5 && isWeekend) {
        // Per FT 5/7: il weekend resetta sempre il contatore,
        // anche se l'utente ha compilato tutto il mese senza interruzioni.
        consecutivi = 0
      } else if (haDatiSignificativi(righe[ds])) {
        consecutivi++
        if (consecutivi > maxRilevato) maxRilevato = consecutivi
      } else if (isWeekend) {
        // Weekend non valorizzato: il dipendente riposa → reset contatore
        consecutivi = 0
      }
      // Giorno feriale non valorizzato: CHECK 1 ha già fallito → non arriviamo qui
    }
    if (maxRilevato > maxConsecutivi) {
      return {
        completo: true,
        warning: `Sembra che tu abbia saltato dei riposi: ${maxRilevato} giorni lavorativi consecutivi su un massimo di ${maxConsecutivi} previsto dal contratto`,
      }
    }
  }

  return { completo: true }
}
