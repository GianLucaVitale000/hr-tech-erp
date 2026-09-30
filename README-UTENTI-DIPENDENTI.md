# README - Gestione Utenti e Anagrafica Dipendenti (moduli HR-Tech ERP)

Il presente documento descrive la struttura, la logica e il funzionamento lato utente delle pagine **Gestione Utenti** e **Anagrafica Dipendenti** all'interno dell'applicazione **HR-Tech ERP**, evidenziando come le scelte di progettazione dei form abbiano un impatto diretto sulle dinamiche HR monitorate in **Analisi HR** e sui vincoli applicati al modulo di rilevazione presenze (**Timesheet**).

---

## 1. Posizione Strutturale nel Progetto

Le pagine di amministrazione e gestione del personale si trovano nel frontend React (`frontend-react/src/pages/Admin/`) e sono supportate dai relativi controller e modelli nel backend Laravel (`backend-php/app/Http/Controllers/` e `backend-php/app/Models/`):

- **Gestione Utenti (`Utenti.jsx`, `NuovoUtente.jsx`, `EditUtente.jsx`)**:
  - Gestisce gli account di accesso al sistema (autenticazione, credenziali, ruoli `admin` o `dipendente`).
  - Collega l'utenza di sistema (eventualmente)all'entità anagrafica del dipendente.
- **Anagrafica Dipendenti (`Dipendenti.jsx`, `NuovoDipendente.jsx`, `EditDipendente.jsx`)**:
  - Gestisce i dati lavorativi, contrattuali e giuslavoristici del personale.
  - Interagisce con i modelli relazionali individuati dal CCNL applicato (`Contratto`), alle variazioni delle condizioni contrattuali nel tempo e definite a cura del manager HR, agli orari settimanali (`DipendenteOrarioSettimanale`) e alle regole di calcolo. Va tuttavia precisato che la mappatura del repertorio CNEL non consente di estrarre dati di merito. Si è reso dunque necessario fornire i dati all'applicativo manualmente, con un inserimento puntuale e dinamico a cura del manager HR. Ad esempio,il dato dell'orario settimanale per il dipendente a tempo pieno è spesso oggetto di contrattazione collettiva, oppure la quantificazione dei ratei mensili di ferie, permessi/rol ed ex-festività, a loro volta essenziali per attivare gli algoritmi di calcolo dei contatori di ferie e permessi, sono altresì definiti nel modo più granulare dalla legge e dalle contrattazione collettiva.

---

## 2. Funzionamento e Logica d'Uso

### A. Gestione Utenti

- **Ruolo e Credenziali**: Permette all'amministratore di creare, modificare ed eliminare utenti di sistema definendo l'indirizzo email, la password e il ruolo di autorizzazione (tramite il pacchetto di permessi Laravel Spatie).
- **Relazione Utente-Dipendente**: Un utente con ruolo `dipendente` viene associato al proprio profilo anagrafico lavorativo, consentendogli l'accesso al portale personale (`/dipendente`) per la visualizzazione della dashboard e la compilazione del timesheet.

### B. Anagrafica Dipendenti e Form di Configurazione

I form di creazione e modifica del dipendente (`NuovoDipendente.jsx` e `EditDipendente.jsx`) raccolgono parametri cruciali per la gestione del personale:

1. **Dati Identificativi**: Nome, cognome, codice fiscale, mansione e livello.
2. **Contratto Collettivo (CCNL)**: Associazione al contratto nazionale di riferimento (es. codice CNEL), che determina il numero delle ore settimanali ordinarie a tempo pieno e le regole di maturazione di ferie, ROL e permessi.
3. **Regime Orario (Full-Time / Part-Time)**:
   - Percentuale di part-time (`percentuale_part_time`): 100% per Full-Time, o percentuale ridotta (es. 50%, 75%) per Part-Time.
   - Giorni lavorativi settimanali (`giorni_lavorativi_settimanali`: tipicamente 5 o 6 giorni).
   - Ore settimanali teoriche.
4. **Giorni di Riposo (R1 / R2)**: Definizione dei giorni di riposo settimanale (es. sabato e domenica per la settimana corta a 5 giorni).

---

## 3. Impatto delle Scelte di Form sulle Dinamiche HR e sul Timesheet

Le scelte di strutturazione dei form anagrafici incidono profondamente su due moduli chiave del sistema:

### A. Impatto su Analisi HR

I parametri anagrafici inseriti nei form vengono utilizzati direttamente dagli algoritmi di [`AnalisiHR`](README-AnalisiHR.md):

- **Calcolo dei Giorni Teorici Lavorabili**: I giorni di riposo (`R1`/`R2`, ovvero gli orari settimanali a 0 ore, per i dipendenti part-time) determinano quali giorni dell'anno solare vengono esclusi dal computo teorico lavorabile.
- **Distinzione Straordinari / Ore Supplementari**: La percentuale di part-time e le ore contrattuali definite in anagrafica consentono all'algoritmo di distinguere correttamente tra **lavoro straordinario** (per i Full-Time) e **lavoro supplementare** (per i Part-Time), verificando anche la continuità temporale su finestre di mesi consecutivi.
- **Monitoraggio Assenze e Ratei**: L'associazione al CCNL e la data di assunzione definiscono i ratei maturandi di ferie e permessi (che la contrattazione collettiva talvolta quantifica in funzione dell'anzianità di servizio), confrontati con i dati storici e i residui.
- **Il sesso** del dipendente è utilizzato per determinare quale dipendente può beneficiare dell'assenza per la maternità (c.d. obbligatoria)

### B. Vincoli Applicati al Modulo di Rilevazione Presenze (Timesheet)

La struttura rigida e parametrizzata dei form anagrafici si riflette direttamente sul modulo di inserimento presenze del dipendente (**Timesheet**):

- **Campi e Causali Vincolate**: Il timesheet non permette inserimenti liberi non controllati, ma adatta i campi visibili e le convalide in base al regime orario configurato in anagrafica (es. blocco o evidenziazione delle ore eccedenti per i part-time, validazione delle ore ordinarie giornaliere rispetto al divisore contrattuale).
- **Controllo dei Riposi e Festività**: Le giornate configurate come riposo in anagrafica o corrispondenti a festività nazionali (calcolate con l'algoritmo di Gauss) risultano protette o vincolate nel foglio presenze, impedendo l'inserimento errato di ore ordinarie lavorative in giorni non lavorativi (c.d. mancato riposo), garantendo così la conformità al D.Lgs. 66/2003 sull'orario di lavoro e sui riposi minimi.
