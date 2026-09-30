# README - Modulo Timesheet Dipendenti (Registrazione Presenze)

Il modulo **Timesheet** (Registrazione Presenze) rappresenta il punto di accesso operativo principale per il dipendente all'interno dell'applicativo HR Tech ERP. Questo modulo consente la gestione e la rendicontazione giornaliera dell'attività lavorativa, delle assenze, dei permessi, delle trasferte e delle timbrature tramite QR Code, costituendo la fonte primaria dei dati che verranno successivamente verificati dal manager (tramite il modulo di approvazione) e processati per il calcolo delle paghe.

---

## 1. Rapporto del Modulo con le Altre Parti dell'Applicativo

Il modulo Timesheet si interfaccia strettamente con diversi sottosistemi dell'ERP:

1. **Gestione Anagrafica Dipendenti & Contratti (`README-UTENTI-DIPENDENTI.md`, `README-GESTIONE-CCNL.md`)**:
   - **Profilo Full-Time / Part-Time**: Definisce la tipologia di orario applicata (es. percentuale part-time, ore ordinarie massime giornaliere).
   - **Distribuzione Oraria Settimanale**: Utilizza gli orari settimanali associati (`orari_settimanali`) per determinare il monte ore previsto per ciascun giorno della settimana.
   - **Riposi (R1 / R2)**: Legge i giorni di riposo contrattuale (es. Sabato e Domenica o turni specifici) per evidenziare visivamente i giorni festivi/riposo e guidare la validazione.
   - **Scadenza Contratto**: Blocca l'inserimento o la modifica delle presenze qualora la data selezionata superi la data di scadenza del contratto del dipendente.

2. **Modulo Approvazione Fogli Ore (`README-ApprovazioneFogliOre.md`)**:
   - Una volta completato e validato l'intero mese, il dipendente invia il foglio presenze al Manager (`Invia al Manager`).
   - Il foglio passa attraverso stati definiti (`bozza` -> `inviato` -> `approvato` o `rifiutato`/`reinviato`). Quando il foglio è `inviato` o `approvato`, le righe salvate vengono bloccate per impedire alterazioni post-invio.

3. **Modulo Analisi HR & Elaborazione Paghe (`README-AnalisiHR.md`)**:
   - I dati inseriti e approvati costituiscono il dataset consolidato per il calcolo delle competenze, degli straordinari, dei ratei ferie/permessi e per la generazione dei flussi di esportazione per l'elaborazione paghe (es. tracciati Uniemens / foglio presenze riassuntivo).

---

## 2. Filtri e Vincoli Implementati (Pre-filtraggio per l'Elaborazione Paghe)

Per ridurre drasticamente gli errori a monte e anticipare il lavoro di filtraggio prima della fase di elaborazione paghe, il sistema implementa una serie rigorosa di **vincoli e validazioni automatiche**:

1. **Validazione della Completezza del Foglio (`isFoglioCompleto`)**:
   - L'invio al manager è condizionato dal completamento di tutti i giorni lavorativi del mese. Il sistema segnala eventuali giorni mancanti o anomalie (es. giorni lavorativi con 0 ore registrate).

2. **Controllo Limiti Orari e Straordinari**:
   - **Full-Time vs Part-Time**: Per i dipendenti part-time, le ore eccedenti rispetto all'orario ordinario giornaliero vengono distinte dagli straordinari puri dei full-time.
   - **Soglia di Sicurezza Straordinari**: Segnalazione visiva automatica in caso di superamento di 4 ore straordinarie giornaliere. Questo in applicazione della normativa vigente, segnatamente il d.lgs. 66/2003 e successive modifiche, che stabilisce il limite delle 11 ore lavorative gioranaliere di ininterrotto riposo (da cui si deduce che le ore straordinarie non possono superare le 4 ore giornaliere).
   - **Somma Ore Causali**: Controllo che la somma tra ore ordinarie e ore di causale (es. permessi ROL, PR, PNR) non superi il monte ore giornaliero previsto dalla distribuzione settimanale.

3. **Gestione Causali e Vincoli Obbligatori**:
   - **Malattia**: Richiede obbligatoriamente l'inserimento del numero di protocollo del certificato INPS e l'intervallo di date tramite modale dedicata.
   - **Cassa Integrazione (CIG)**: Richiede l'indicazione della percentuale (da 1 a 100%) e l'intervallo temporale. Questo, per garantire il tracciamento delle ore effettivamente lavorate e delle ore coperte da CIG, in conformità con le normative INPS.
   - **Infortunio e Trasferta**: Richiedono il caricamento obbligatorio di un documento giustificativo (file PDF, JPG, PNG) direttamente associato alla riga.
   - **Causali con Modalità**: Per tutte le causali di lavoro, anche parziale, è obbligatorio specificare la modalità di lavoro (`in_sede`, `smart_working`, `trasferta`).

4. **Blocco Contenuto per Stati Avanzati**:
   - Impedisce il salvataggio o la modifica di righe già salvate o di mesi già approvati/inviati, garantendo l'integrità dei dati storici.

---

## 3. Struttura Frontend Differenziata (Desktop vs Mobile)

L'interfaccia utente è progettata con un approccio *Responsive First*, adattandosi perfettamente al dispositivo in uso:

### **Struttura Desktop (`desktop-table`)**

- **Tabella Tabulare Estesa**: Visualizza l'intero mese in un'unica schermata tabulare (`presenze-table`).
- **Colonne Dedicate**:
  - Giorno e nome del giorno abbreviato (es. *1 - Lun*).
  - Ore Ordinarie, Ore Eccedenti (Part-Time) / Straordinarie (Full-Time).
  - Selezione Causale (con note di protocollo o upload allegati inline).
  - Ore Causale.
  - Modalità di lavoro (Radio button: In sede, SW, Trasferta) con toggle integrato per QR Code, legato alla selezione della modalità In sede.
  - Stato timbrature QR (Ingresso/Uscita) e pulsante di salvataggio puntuale per singola riga.

### **Struttura Mobile (`mobile-day-card` & `mobile-day-selector`)**

- **Selettore Data a Calendario**: Un selettore rapido ad alto touch-target (`mobile-date-input`) che permette di saltare immediatamente al giorno desiderato del mese.
- **Card Giorno Singolo**: Invece della tabella, viene presentata una card verticale ottimizzata per schermi piccoli (`card-giorno`) che racchiude tutti i campi del singolo giorno in blocchi verticali ben distanziati.
- **Pulsanti di Selezione Modalità Touch-Friendly**: I radio button della modalità di lavoro sono trasformati in pulsanti a blocco larghi (`card-mode-btn`) per agevolare il tap con il pollice.

---

## 4. Soluzioni UX/UI per Agevolare l'Inserimento Ore

L'esperienza utente (UX) e l'interfaccia (UI) sono state ottimizzate per ridurre al minimo lo sforzo di compilazione del dipendente:

1. **Riconoscimento Automatico dei Giorni di Riposo (`isRiposo`)**:
   - I giorni festivi e di riposo (R1/R2) sono evidenziati visivamente (`rg-row-riposo` / `card-giorno-riposo`), orientando l'attenzione del dipendente sui soli giorni lavorativi.

2. **Calcolo Automatico delle Ore da Timbratura QR Code**:
   - L'attivazione della spunta **QR Code** apre un flusso assistito in cui il dipendente può generare un token dinamico (tramite Kiosk o smartphone). Una volta effettuate le timbrature di ingresso e uscita, il sistema **calcola automaticamente** le ore ordinarie e straordinarie sottraendo la pausa configurata, disabilitando la modifica manuale errata e riducendo l'inserimento a zero frizione.

3. **Feedback Visivo in Tempo Reale e Totali Sintetizzati (`totals-row`)**:
   - Una barra superiore suddivisa in gruppi di badge colorati (Blu per ordinarie, Ambra per straordinari/eccedenti, Verde per ferie/permessi, Giallo/Rosso/Indigo per INPS, INAIL e CIG) offre un riscontro visivo immediato del bilancio mensile accumulato.

4. **Gestione Modali Contestuali per Eventi Complessi**:
   - Invece di sovrastimolare la schermata principale con campi complessi, l'inserimento di eventi prolungati come la Malattia o la Cassa Integrazione attiva modali guidate focalizzate (`ModaleMalattia`, `ModaleCassaIntegrazione`, `ModaleQrSettings`), semplificando il flusso cognitivo dell'utente.
