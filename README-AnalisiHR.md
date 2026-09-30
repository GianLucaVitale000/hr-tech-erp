# README - AnalisiHR (Modulo HR Tech ERP)

Il presente documento descrive in dettaglio la pagina e il modulo **AnalisiHR** all'interno dell'applicazione **HR Tech ERP**, definendone il ruolo strategico nella gestione delle risorse umane, la collocazione strutturale nell'architettura del progetto e le caratteristiche tecniche degli algoritmi giuslavoristici implementati in conformità al diritto del lavoro italiano e alla contrattazione collettiva (CCNL).

---

## 1. Ruolo nell'Ambito della Gestione HR Aziendale

Il modulo **AnalisiHR** rappresenta il cruscotto di controllo direzionale e di conformità normativa (`frontend-react/src/pages/Admin/AnalisiHR.jsx`) per la direzione risorse umane. Le sue funzioni principali comprendono:

- **Monitoraggio e Prevenzione dell'Assenteismo (Card - Tasso di Assenza Individuale)**: Analisi avanzata del tasso di assenza individuale, scomposizione per causali (malattia, infortunio, permessi retribuiti/non retribuiti, CIG, maternità) e correlazione statistica con i giorni festivi o i giorni di riposo settimanale (es. identificazione di episodi di "malattia breve" a ponte tra fine settimana e festività).
- **Analisi dell'utilizzo dei giustificativi di assenza dal lavoro (Card PR, PNR, CIG, Sindacale / Modalità di lavoro)**: Rilevazione degli episodi di fruizione di permessi retribuiti e non retribuiti e di altre modalità lecite di assenza dalla prestazione lavorativa effettiva (esercizio dei diritti sindacali, cassa integrazione), al fine di monitorare l'incidenza di tali sturmenti sull'andamento dei ritmi della produzione aziendale. Tracciatura mensile delle modalità di lavorazione in presenza, in smart working o in trasferta, a scopi statistici interni e funzionali a razionalizzare le principali decisioni aziendali di business.
- **Controllo del Lavoro Straordinario e Supplementare**: Rilevazione analitica del tempo eccedente l'orario ordinario di lavoro, dunque il supplementare per i lavoratori part-time e lo straordinario per i lavoratori full-time, con particolare attenzione, nel caso del lavoro a tempo parziale, alle dinamiche di stabilizzazione temporale (monitoraggio sull'asse temporale dell'utilizzo continuativo del supplementare nel part-time può ingenerare, secondo la giurisprudenza e la contrattazione collettiva, la necessità di un consolidamento di tali ore (c.d. adeguamento contrattuale) e relativo adeguamento degli istituti contrattuali).
- **Gestione e Residuo di Ferie e Permessi**: Valutazione dell'accumulo e del godimento dei ratei annuali e dei residui storici di ferie, permessi/ROL e permessi ex-festività, assicurando il rispetto del principio costituzionale e legale sull'irrinunciabilità delle ferie (art. 2109 c.c. e D.Lgs. 66/2003) e il corretto smaltimento del residuo nei tempi previsti.

---

## 2. Posizione Strutturale nell'Ambito del Progetto

L'architettura del modulo si articola in una chiara separazione tra backend (servizi API in Laravel) e frontend (componenti React):

- **Backend (PHP / Laravel)**:
  - [`backend-php/app/Http/Controllers/PresenzaController.php`](backend-php/app/Http/Controllers/PresenzaController.php): Controller responsabile della gestione delle presenze, dei fogli presenze mensili e del calcolo dei residui.
  - [`backend-php/app/Services/PermessiFerieService.php`](backend-php/app/Services/PermessiFerieService.php): Servizio di calcolo e maturazione dei ratei di ferie e permessi.
- **Frontend (React / Vite)**:
  - [`frontend-react/src/pages/Admin/AnalisiHR.jsx`](frontend-react/src/pages/Admin/AnalisiHR.jsx): Pagina principale di amministrazione per l'analisi HR.
  - [`frontend-react/src/hooks/useAnalisiHRData.js`](frontend-react/src/hooks/useAnalisiHRData.js): Custom hook che gestisce lo stato, il fetch asincrono dei dati mensili di presenze e ferie per l'intero anno solare, e l'aggregazione dei dati.
  - [`frontend-react/src/utils/analisiHRUtils.js`](frontend-react/src/utils/analisiHRUtils.js): Modulo di utilità contenente gli algoritmi di calcolo giuslavoristico (festività, giorni teorici lavorabili, compensazione ore supplementari/straordinarie, medie di periodo).
  - **Componenti Widget e Card**:
    - [`AnalisiHRSelection.jsx`](frontend-react/src/components/Admin/AnalisiHR/AnalisiHRSelection.jsx): Selezione del dipendente e dell'anno di riferimento (select personalizzata in funzione della data di assunzione del particolare dipendente).
    - [`AnalisiHRWidgets.jsx`](frontend-react/src/components/Admin/AnalisiHR/AnalisiHRWidgets.jsx): Indicatori sintetici annuali (ore ordinarie, straordinarie/eccedenti (il part-time include il regime supplementare, fino a concorrenza del tempo pieno), ferie/permessi(ROL ed ex-festività), PR/PNR (con causali composite e senza causale specifica, ma comunque definibili come assenze legittmate dal datore e non retribuite), INPS/INAIL (istituti quali malattia, infortunio, maternità), CIG, sindacali (in senso lato: assemblee sindacali, astensione lavorativa per sciopero).
    - [`TassoAssenzaCard.jsx`](frontend-react/src/components/Admin/AnalisiHR/TassoAssenzaCard.jsx): Analisi del tasso di assenza e pattern di assenteismo.
    - [`PermessiLavoroCard.jsx`](frontend-react/src/components/Admin/AnalisiHR/PermessiLavoroCard.jsx): Disaggrevazione delle causali di assenza legittima e delle  modalità lavorative della causale lavoro (in sede, smart working, trasferta).
    - [`FeriePermessiCard.jsx`](frontend-react/src/components/Admin/AnalisiHR/FeriePermessiCard.jsx): Monitoraggio ferie e permessi maturati/goduti/residui.
    - [`OreExtraordinarieCard.jsx`](frontend-react/src/components/Admin/AnalisiHR/OreExtraordinarieCard.jsx): Grafici e analisi delle ore supplementari/straordinarie con controllo della continuità temporale (es. su finestre mobili di 3 o più mesi).

---

## 3. Algoritmi e Dinamiche Giuslavoristiche

Gli algoritmi implementati in [`analisiHRUtils.js`](frontend-react/src/utils/analisiHRUtils.js) e [`useAnalisiHRData.js`](frontend-react/src/utils/useAnalisiHRData.js) rispondono a specifici istituti del diritto del lavoro italiano e della contrattazione collettiva:

### A. Calcolo dei Giorni Teorici Lavorabili e Festività/Riposi Settimanali

- **Algoritmo di Gauss**: Utilizzato per il calcolo dinamico della data di Pasqua e della conseguente Festività di Pasquetta per qualsiasi anno solare.
- **Esclusione Festività e Riposi (R1/R2)**: L'algoritmo [`calcolaGiorniTeoriciLavorabili`](frontend-react/src/utils/analisiHRUtils.js:49) sottrae dal calendario solare  sia i giorni di riposo settimanale configurati in anagrafica dipendenti(differenziando i contratti Full-Time per l'indicazione espressa di giorni di riposo personalizzati R1/R2 e ricavando indirettamente i riposi dei Part-Time per effetto della configurazione settimanale dell'orario di lavoro, che deve per legge essere sempre esplicitata nel contratto individuale di assunzione o comunque formalizzata, anche nelle sue modifiche successive) sia le festività nazionali civili e religiose che cadono in giorni lavorativi, secondo lo schema previsto per legge e contrattazione collettiva. L'algoritmo restituisce il numero di giorni teorici lavorabili per ciascun mese e per l'intero anno solare, tenendo conto delle specificità contrattuali del dipendente (ditribuzione del lavoro settimanale su 5 o 6 gg.).

### B. Gestione delle Ore Supplementari e Straordinarie (Compensazione Intra-mese)

- **Part-Time vs Full-Time**:
  - Per i lavoratori **Full-Time**, le ore eccedenti la normale giornata lavorativa (es. oltre le 8 ore giornaliere o 40 settimanali: c.d. tempo pieno) configurano **lavoro straordinario**, soggetto a specifiche maggiorazioni contrattuali.
  - Per i lavoratori **Part-Time**, le ore prestate oltre l'orario contrattualmente ridotto ma entro il limite dell'orario pieno (valore percentuale dell'orario di Full-Time) costituiscono **lavoro supplementare**, disciplinato da rigorosi limiti percentuali annui/mensili previsti dai CCNL e dalla legge (es. D.Lgs. 81/2015).
- **Compensazione Intra-mese**: L'algoritmo [`calcolaSupplementariEStraordinarieMensili`](frontend-react/src/utils/analisiHRUtils.js:71) calcola l'effettiva prestazione lavorativa, anche oltre l'orario concordato, confrontandola con il dovuto giornaliero e settimanale, tenendo conto delle compensazioni tra giorni con deficit di orario e giorni con eccedenza all'interno dello stesso ciclo mensile/settimanale.

### C. Analisi della Continuità delle Ore Supplementari (Finestre Temporali)

- L'funzione [`calcolaMediaSupplementari`](frontend-react/src/utils/analisiHRUtils.js:169) verifica la presenza di prestazioni supplementari continuative su finestre configurabili di mesi consecutivi (es. 3 o più mesi). Questa analisi è fondamentale per intercettare situazioni in cui il lavoratore part-time svolge sistematicamente ore supplementari, evento che la contrattazione collettiva spesso collega al diritto di consolidamento parziale o totale dell'orario o alla rideterminazione della base retributiva.

### D. Rilevazione Anomalie di Assenteismo (Malattie Brevi e Ponti)

- L'algoritmo di rilevazione delle assenze traccia la distribuzione degli eventi sulla ricorrenza settimanale, contribuendo ad identificare l'occorenza di episodi di malattia o infortunio breve (di durata inferiore o uguale a 3 giorni) che si collocano immediatamente a ridosso di giorni non lavorativi (festività o riposi settimanali R1/R2). Questo indicatore statistico supporta il dipartimento HR nell'individuazione di potenziali fenomeni di assenteismo strategico ("fenomeno del ponte").
