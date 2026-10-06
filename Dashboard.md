# Dashboard: Documentazione delle Dashboard Dipendente e Admin

Questo documento descrive in dettaglio l'architettura, le caratteristiche, i contenuti delle pagine principali e il **routing (connessioni con gli altri moduli)** delle due dashboard del sistema ERP HR: la **Dashboard Dipendente** e la **Dashboard di Amministrazione (Admin)**.

---

## 1. Architettura e Funzione Strutturale delle Dashboard

Le dashboard costituiscono i **nodi centrali (hub di navigazione e sintesi)** dell'applicazione React (`frontend-react`). La loro funzione strutturale è duplice:

1. **Sintesi Visiva (KPI e Widget):** Aggregare dati complessi provenienti dai servizi backend (ore lavorate, ferie, permessi, presenze, anomalie, contratti) offrendo una panoramica immediata dello stato lavorativo o gestionale.
2. **Smistamento e Routing (Hub di Navigazione):** Fungere da punto di partenza privilegiato per accedere a tutti gli altri moduli specialistici del sistema (es. timesheet, approvazioni, anagrafiche, contratti, analisi HR).

---

## 2. Dashboard Dipendente (`/dipendente`)

La **Dashboard Dipendente** è l'area riservata al personale dipendente per monitorare la propria posizione lavorativa, il saldo di ferie e permessi, l'andamento delle presenze annuali e accedere rapidamente agli strumenti di timbratura e compilazione del foglio ore.

### 2.1 Contenuti della Pagina Principale

La pagina principale è strutturata nei seguenti blocchi logici:

- **Card Profilo e Dati Contrattuali:** Mostra le informazioni anagrafiche dell'utente loggato (`user.name`, `codice_fiscale`), il CCNL applicato, il livello, la qualifica, il regime orario (Tempo Pieno o Part-time) e la distribuzione dei riposi settimanali.
- **Riepilogo Ferie, Permessi e ROL (con Grafici Donut):**
  - **Ferie:** Visualizza il saldo dell'anno precedente, le ore maturate nell'anno corrente, quelle godute e il saldo residuo aggiornato al mese precedente
  - **Permessi / ROL / Ex Festività:** Mostra i contatori analoghi relativi ai permessi retribuiti e ROL.
- **Statistiche Presenze Annuali:** Calcola i giorni teorici lavorabili dall'inizio dell'anno fino alla data odierna, confrontandoli con i giorni effettivamente lavorati e i giorni di malattia registrati.
- **Accesso Rapido:** la navbar (aside nella versione mobile) espone i link diretti per l'apertura del Timesheet mensile ove registrare le presenze e una modale infomrativa per la gestione della registrazione delle presenze a mezzo QR Code (implementata solo per i dipendenti a tempo pieno: i dipendenti part-time possono registrare le presenze solo manualmente, essendo vincolati alla distribuzione settimanale puntuale dell'orario di lavoro).

### 2.2 Routing e Connessioni con gli Altri Moduli

La Dashboard Dipendente si collega direttamente ai seguenti moduli tramite il router principale (`frontend-react/src/App.jsx`) e i componenti di navigazione (`DipendenteNavbar` / `DipendenteLayout`):

| Modulo / Pagina di Destinazione | Path Rotta (`/dipendente/...`) | Funzione del Modulo Connesso |
| :--- | :--- | :--- |
| **Foglio Presenze (Timesheet)** | `/dipendente/timesheet` | Permette al dipendente di visualizzare e compilare il foglio presenze mensile, inserire giustificativi, ore ordinarie, straordinari e consultare lo storico mensile. |
| **Autenticazione / Login** | `/login` | Gestisce l'uscita (`logout`) e il ritorno alla schermata di autenticazione tramite il contesto `AuthContext`. |

---

## 3. Dashboard di Amministrazione / Admin (`/admin`)

La **Dashboard di Amministrazione** è l'hub operativo e di controllo per gli HR Manager, i gestori e gli amministratori di sistema. Fornisce una visuale macro e micro sull'intero parco dipendenti, sulle presenze aziendali approvate o meno e sugli invii delle presenze in sospeso provenineti dai dipendenti.

### 3.1 Contenuti della Pagina Principale

La pagina principale (`frontend-react/src/pages/Admin/Dashboard.jsx`) è organizzata in sezioni di controllo avanzato:

- **Widget KPI Globali:** Indicatori sintetici sullo stato aziendale globale (totale dipendenti attivi, ripartiti per tipologia e relativa visualizzazione con diagramma a torta, indicatore mensile di produttività, ripartito per tipologia di contratto a tempo pieno o a tempo parziale e per distribuzione settimanale dei riposi).
- **Selezionatore e Filtri Dipendenti:** nel modulo AnalisiHR (link in navbar, o aside in versione mobile), strumenti di ricerca e filtraggio rapido per singolo dipendente al fine di esaminare posizioni specifiche con una serie di dati visualizzati.
- **Riepilogo Presenze e Anomalie:** link in navbar (o aside in versione mobile)per l'accesso alla sezione Approvazione Fogli ore, per il monitoraggio in tempo reale delle timbrature, segnalazione di eventuali disallineamenti o straordinari non approvati.
- **Accesso ai Sottomoduli Gestionali:** link in navbar (o aside in versione mobile) per la gestione di anagrafiche e dati contrattuali dei dipendenti e delle anagrafiche utenti.

### 3.2 Routing e Connessioni con gli Altri Moduli

La Dashboard Admin funge da punto di smistamento centrale per tutti i moduli amministrativi del sistema ERP HR:

| Modulo / Pagina di Destinazione | Path Rotta (`/admin/...`) | Funzione del Modulo Connesso |
| :--- | :--- | :--- |
| **Gestione Dipendenti** | `/admin/dipendenti` | Elenco completo dei dipendenti con funzionalità di ricerca, inserimento (`/admin/dipendenti/nuovo`) e modifica anagrafica/contrattuale (`/admin/dipendenti/edit/:id`). |
| **Approvazione Fogli Ore** | `/admin/approvazioni` | Modulo per la verifica, validazione o rigetto dei fogli ore mensili inviati dai dipendenti, con calcolo dei totali e delle competenze. |
| **Gestione Contratti e CCNL** | `/admin/contratti` | Gestione dei CCNL applicati, delle regole di calcolo delle retribuzioni, dei ratei di ferie/permessi e delle condizioni contrattuali. |
| **Analisi HR** | `/admin/analisi-hr` | Cruscotto analitico avanzato per statistiche su tassi di assenza, straordinari, ferie godute e reportistica aggregata. |
| **Gestione Utenti e Ruoli** | `/admin/utenti` | Amministrazione degli account utente di sistema, dei ruoli e dei permessi di accesso (Admin, Dipendente). |
| **Dettaglio Mese / Report** | `/admin/dettaglio-mese` | Visualizzazione approfondita delle presenze mensili aggregate per dipartimento o dipendente. |

---

## 4. Sintesi dei Flussi di Navigazione

``` text
[ Login (/login) ]
       │
       ├─► Se Ruolo Dipendente ──► [ Dashboard Dipendente (/dipendente) ]
       │                                  │
       │                                  ├─► [ Timesheet (/dipendente/timesheet) ]
       │                                  └─► [ QR Code / Profilo ]
       │
       └─► Se Ruolo Admin ──────► [ Dashboard Admin (/admin) ]
                                          │
                                          ├─► [ Dipendenti (/admin/dipendenti) ]
                                          ├─► [ Approvazioni (/admin/approvazioni) ]
                                          ├─► [ Contratti (/admin/contratti) ]
                                          ├─► [ Analisi HR (/admin/analisihr) ]
                                          └─► [ Utenti (/admin/utenti) ]
```
