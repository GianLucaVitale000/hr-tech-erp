# README - Modulo Approvazione Fogli Ore & Microservizio Export Paghe

Questo documento descrive il funzionamento del modulo **Approvazione Fogli Ore** all'interno dell'ERP HR-Tech e del relativo **Microservizio Python** dedicato all'export dei dati di presenza in formato Excel per il consulente del lavoro o soggetto esterno incaricato dell'elaborazione delle paghe.

---

## 1. Panoramica del Modulo

Il modulo **Approvazione Fogli Ore** permette agli utenti con ruolo **Amministratore (Admin)** di monitorare, verificare, approvare o rifiutare le presenze mensili registrate dai dipendenti tramite il Timesheet. Costituisce il ponte fondamentale tra la raccolta giornaliera delle presenze (tramite timbrature QR, inserimenti manuali o causali di assenza) e il ciclo di elaborazione delle paghe mensili.

---

## 2. Legami con il Timesheet e Ciclo di Vita delle Presenze

Il flusso dei dati parte dal Timesheet del dipendente e attraversa vari stati di avanzamento gestiti dal sistema:

1. **Inserimento (Stato: `bozza`)**:
   Durante il mese, il dipendente compila o registra le proprie presenze e ore lavorative, oppure il sistema acquisisce le timbrature tramite QR code. In questa fase le presenze sono in bozza e modificabili.
2. **Invio Mensile (Stato: `inviato` o `reinviato`)**:
   Alla fine del mese o al completamento del periodo di riferimento, il dipendente (o il sistema in automatico) invia il foglio ore per l'approvazione. Lo stato delle presenze passa a `inviato`. Se un foglio ore viene rifiutato dall'amministratore, il dipendente può correggerlo e reinviarlo (stato `reinviato`).
3. **Approvazione Admin (Stato: `approvato`)**:
   L'amministratore accede alla schermata di gestione (`frontend-react/src/pages/Admin/Approvazioni.jsx`), filtra per dipendente, mese, anno o stato, e procede all'approvazione del blocco mensile. Una volta approvato, lo stato delle presenze passa a `approvato`. Solo le presenze con stato `approvato` vengono incluse negli export ufficiali per le paghe.

---

## 3. Meccanismo di Approvazione da parte dell'Admin

L'interfaccia di amministrazione offre una panoramica tabellare e card (responsive per dispositivi mobili) che aggrega le presenze per dipendente e per mese/anno, mostrando:

- **Totale Giorni Lavorati**
- **Ore Ordinarie**
- **Ore Eccedenti / Supplementari**
- **Ore Straordinarie**
- **Stato corrente** (*Da approvare*, *Da approvare (Reinviato)*, *Approvato*)

L'amministratore può visualizzare il dettaglio giornaliero di ogni dipendente (`/admin/approvazioni/{dipendente_id}/{mese}/{anno}`) e modificare o confermare lo stato dell'intero mese tramite le API dedicate nel backend PHP (`backend-php/app/Http/Controllers/PresenzaController.php`).

---

## 4. Ruolo del Backend PHP

Il backend PHP (`backend-php/`) gestisce la logica di business e l'interfaccia API per il modulo di approvazione fogli ore attraverso il `PresenzaController`:

- **Gestione e Calcolo Timbrature/Presenze**: Fornisce gli endpoint per registrare, calcolare e aggiornare le ore lavorate, ordinarie, straordinarie e le causali di assenza.
- **Gestione del Ciclo di Stato**: Gestisce l'invio mensile dei fogli ore da parte dei dipendenti (metodo `inviaMese`, che supporta gli stati `inviato` e `reinviato` in caso di correzioni successive a un rifiuto) e la revisione da parte degli amministratori (metodo `aggiornaStatoMese`, per approvare, rifiutare o reinviare i fogli ore).
- **Aggregazione e Dashboard Admin**: Espone gli endpoint `inAttesa` e `mesiApprovati` per raggruppare i record mensili dei dipendenti con i relativi totali (giorni, ore ordinarie, straordinarie, ecc.) visualizzati nella schermata di amministrazione (`frontend-react/src/pages/Admin/Approvazioni.jsx`).
- **Persistenza e Validazione**: Salva e aggiorna i dati sul database relazionale MySQL, garantendo che solo i mesi con stato `approvato` siano validati per l'export verso il microservizio Python delle paghe.

---

## 5. Microservizio Python per l'Export Excel Paghe

Una volta che i fogli ore del mese sono stati approvati (`stato = 'approvato'`), l'amministratore può generare l'export ufficiale in formato Excel (`.xlsx`) da inviare al consulente del lavoro.

Il microservizio è implementato in **Python** (`microservice-python/`) utilizzando **FastAPI**, **Pandas** e **OpenPyXL**.

### Architettura e Funzionamento del Microservizio

- **Endpoint FastAPI**: Espone l'endpoint `/export/paghe` (`microservice-python/main.py`), il quale accetta come parametri `mese` e `anno`.
- **Query al Database**: Si collega direttamente al database MySQL (`microservice-python/database.py`) estraendo esclusivamente i record con `p.stato = 'approvato'` per il periodo selezionato.
- **Elaborazione e Calcoli (`microservice-python/services/excel_exporter.py`)**:
  - **Foglio di Riepilogo**: Genera una riga per ogni dipendente contenente i dati anagrafici e contrattuali (Codice Fiscale, IBAN, Data Assunzione, CCNL applicato, Livello, Mansione, Percentuale Part-Time) insieme al riepilogo delle ore mensili suddivise per:
    - Ore Ordinarie
    - Ore Supplementari / Eccedenti
    - Ore Straordinarie
    - Causali di assenza (Ferie, Permessi ROL, Permessi Retribuiti/Non Retribuiti, Malattia, Infortunio, Maternità, Sciopero, Cassa Integrazione).
  - **Foglio di Dettaglio Giornaliero**: Riporta riga per riga la singola giornata di lavoro, la modalità (In sede, Smart Working, Trasferta), i codici paga standardizzati (`MAPPA_CODICI_PAGHE` come `ORD`, `FER`, `ROL`, `MAL`, ecc.) e i link ipertestuali cliccabili verso i giustificativi allegati nel cloud storage (es. certificati di malattia o giustificativi di trasferta).

### Interazione Frontend-Backend-Microservizio

1. L'utente clicca su uno dei bottoni di export nella pagina di approvazione (`📊 Export Excel Paghe (Mese Corrente)` o l'export specifico per i mesi approvati).
2. Il frontend React invia una richiesta HTTP al microservizio Python (`http://localhost:8001/export/paghe?mese=M&anno=A`).
3. Il microservizio genera dinamicamente il file Excel in memoria (`BytesIO`) e lo restituisce come `StreamingResponse` con intestazione `attachment; filename=paghe_M_A.xlsx`, avviando il download automatico del file nel browser dell'amministratore.

---

## 6. Struttura dei File di Riferimento

- **Frontend React**: [`frontend-react/src/pages/Admin/Approvazioni.jsx`](frontend-react/src/pages/Admin/Approvazioni.jsx)
- **Backend PHP (Controller API Presenze)**: [`backend-php/app/Http/Controllers/PresenzaController.php`](backend-php/app/Http/Controllers/PresenzaController.php)
- **Microservizio Python (FastAPI & Exporter)**:
  - [`microservice-python/main.py`](microservice-python/main.py)
  - [`microservice-python/services/excel_exporter.py`](microservice-python/services/excel_exporter.py)
