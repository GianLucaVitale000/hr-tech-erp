# Modulo Timesheet Dipendenti (Registrazione Presenze)

Il modulo **Timesheet** (Registrazione Presenze) è il punto di accesso operativo principale per il dipendente all'interno dell'applicativo HR-Tech ERP. Consente la gestione e la rendicontazione giornaliera dell'attività lavorativa, delle assenze, dei permessi, delle trasferte e delle timbrature tramite QR Code. Costituisce la fonte primaria dei dati che vengono successivamente verificati dal manager (modulo di approvazione) e processati per il calcolo delle paghe.

La **timbratura con QR Code** è un'estensione del foglio presenze: opera sulle singole righe del timesheet mensile e ne calcola automaticamente le ore. Per questo è documentata in questo stesso file (sezione 6).

---

## Indice

- [1. Rapporto con le altre parti dell'applicativo](#1-rapporto-con-le-altre-parti-dellapplicativo)
- [2. Filtri e vincoli implementati](#2-filtri-e-vincoli-implementati)
- [3. Struttura frontend differenziata (Desktop vs Mobile)](#3-struttura-frontend-differenziata-desktop-vs-mobile)
- [4. Soluzioni UX/UI per agevolare l'inserimento ore](#4-soluzioni-uxui-per-agevolare-linserimento-ore)
- [5. Stati del foglio presenze](#5-stati-del-foglio-presenze)
- [6. Timbratura con QR Code](#6-timbratura-con-qr-code)
  - [6.1 Panoramica](#61-panoramica)
  - [6.2 Architettura del sistema](#62-architettura-del-sistema)
  - [6.3 Prerequisiti e regole di business](#63-prerequisiti-e-regole-di-business)
  - [6.4 Flusso operativo](#64-flusso-operativo)
  - [6.5 Endpoint API](#65-endpoint-api)
  - [6.6 Esempi di richiesta e risposta](#66-esempi-di-richiesta-e-risposta)
  - [6.7 Configurazione degli ambienti](#67-configurazione-degli-ambienti)
  - [6.8 Considerazioni sulla sicurezza](#68-considerazioni-sulla-sicurezza)
  - [6.9 Sviluppo e testing](#69-sviluppo-e-testing)
  - [6.10 Checklist per la produzione](#610-checklist-per-la-produzione)

---

## 1. Rapporto con le altre parti dell'applicativo

Il modulo Timesheet si interfaccia strettamente con diversi sottosistemi dell'ERP:

1. **Gestione Anagrafica Dipendenti & Contratti** (`README-UTENTI-DIPENDENTI.md`, `README-GESTIONE-CCNL.md`):
   - **Profilo Full-Time / Part-Time**: definisce la tipologia di orario applicata (es. percentuale part-time, ore ordinarie massime giornaliere). Determina inoltre l'accesso alla timbratura QR (vedi [6.3](#63-prerequisiti-e-regole-di-business)).
   - **Distribuzione Oraria Settimanale**: utilizza gli orari settimanali associati (`orari_settimanali`) per determinare il monte ore previsto per ciascun giorno della settimana.
   - **Riposi (R1 / R2)**: legge i giorni di riposo contrattuale (es. sabato e domenica o turni specifici) per evidenziare visivamente i giorni festivi/riposo e guidare la validazione.
   - **Scadenza Contratto**: blocca l'inserimento o la modifica delle presenze qualora la data selezionata superi la data di scadenza del contratto del dipendente.

2. **Modulo Approvazione Fogli Ore** (`README-ApprovazioneFogliOre.md`):
   - Una volta completato e validato l'intero mese, il dipendente invia il foglio presenze al Manager (`Invia al Manager`).
   - Il foglio attraversa stati definiti (vedi [sezione 5](#5-stati-del-foglio-presenze)). Quando è `inviato` o `approvato`, le righe salvate vengono bloccate per impedire alterazioni post-invio.

3. **Modulo Analisi HR & Elaborazione Paghe** (`README-AnalisiHR.md`):
   - I dati inseriti e approvati costituiscono il dataset consolidato per il calcolo delle competenze, degli straordinari, dei ratei ferie/permessi e per la generazione dei flussi di esportazione per l'elaborazione paghe (es. tracciati Uniemens / foglio presenze riassuntivo).

4. **Sistema di rilevazione QR Code / Kiosk**:
   - Fornisce le timbrature di ingresso e uscita che alimentano automaticamente le ore delle righe abilitate (vedi [sezione 6](#6-timbratura-con-qr-code)).

---

## 2. Filtri e vincoli implementati

Per ridurre drasticamente gli errori a monte e anticipare il lavoro di filtraggio prima della fase di elaborazione paghe, il sistema implementa una serie rigorosa di **vincoli e validazioni automatiche**.

1. **Validazione della completezza del foglio (`isFoglioCompleto`)**:
   - L'invio al manager è condizionato dal completamento di tutti i giorni lavorativi del mese. Il sistema segnala eventuali giorni mancanti o anomalie (es. giorni lavorativi con 0 ore registrate).

2. **Controllo limiti orari e straordinari**:
   - **Full-Time vs Part-Time**: per i dipendenti part-time, le ore eccedenti rispetto all'orario ordinario giornaliero vengono distinte dagli straordinari puri dei full-time.
   - **Soglia di sicurezza straordinari**: segnalazione visiva automatica in caso di superamento di 4 ore straordinarie giornaliere. Ciò in applicazione della normativa vigente, segnatamente il d.lgs. 66/2003 e successive modifiche, che stabilisce il limite delle 11 ore di riposo giornaliero consecutivo (da cui si deduce che le ore straordinarie non possono superare le 4 ore giornaliere).
   - **Somma ore causali**: controllo che la somma tra ore ordinarie e ore di causale (es. permessi ROL, PR, PNR) non superi il monte ore giornaliero previsto dalla distribuzione settimanale.

3. **Gestione causali e vincoli obbligatori**:
   - **Malattia**: richiede obbligatoriamente il numero di protocollo del certificato INPS e l'intervallo di date, tramite modale dedicata.
   - **Cassa Integrazione (CIG)**: richiede la percentuale (da 1 a 100%) e l'intervallo temporale. Questo per garantire il tracciamento delle ore effettivamente lavorate e delle ore coperte da CIG, in conformità con le normative INPS.
   - **Infortunio e Trasferta**: richiedono il caricamento obbligatorio di un documento giustificativo (file PDF, JPG, PNG) direttamente associato alla riga.
   - **Causali con modalità**: per tutte le causali di lavoro, anche parziale, è obbligatorio specificare la modalità di lavoro (`in_sede`, `smart_working`, `trasferta`).

4. **Blocco contenuto per stati avanzati**:
   - Impedisce il salvataggio o la modifica di righe già salvate o di mesi già approvati/inviati, garantendo l'integrità dei dati storici.

5. **Vincoli specifici della timbratura QR Code**:
   - Attivabile solo per dipendenti a tempo pieno, con causale `lavoro` e modalità `in_sede`, validati sia a livello frontend sia backend (dettagli in [6.3](#63-prerequisiti-e-regole-di-business)).

---

## 3. Struttura frontend differenziata (Desktop vs Mobile)

L'interfaccia utente è progettata con un approccio *Responsive First*, adattandosi al dispositivo in uso.

### Struttura Desktop (`desktop-table`)

- **Tabella estesa**: visualizza l'intero mese in un'unica schermata tabulare (`presenze-table`).
- **Colonne dedicate**:
  - Giorno e nome del giorno abbreviato (es. *1 - Lun*).
  - Ore Ordinarie; Ore Eccedenti (Part-Time) / Straordinarie (Full-Time).
  - Selezione Causale (con note di protocollo o upload allegati inline).
  - Ore Causale.
  - Modalità di lavoro (radio button: In sede, SW, Trasferta) con toggle integrato per il QR Code, legato alla selezione della modalità In sede.
  - Stato timbrature QR (Ingresso/Uscita) e pulsante di salvataggio puntuale per singola riga.

### Struttura Mobile (`mobile-day-card` e `mobile-day-selector`)

- **Selettore data a calendario**: selettore rapido ad alto touch-target (`mobile-date-input`) che permette di saltare immediatamente al giorno desiderato del mese.
- **Card giorno singolo**: al posto della tabella, una card verticale ottimizzata per schermi piccoli (`card-giorno`) che racchiude tutti i campi del singolo giorno in blocchi verticali ben distanziati.
- **Pulsanti di modalità touch-friendly**: i radio button della modalità di lavoro diventano pulsanti a blocco larghi (`card-mode-btn`) per agevolare il tap con il pollice.

---

## 4. Soluzioni UX/UI per agevolare l'inserimento ore

L'esperienza utente è ottimizzata per ridurre al minimo lo sforzo di compilazione del dipendente.

1. **Riconoscimento automatico dei giorni di riposo (`isRiposo`)**:
   - I giorni festivi e di riposo (R1/R2) sono evidenziati visivamente (`rg-row-riposo` / `card-giorno-riposo`), orientando l'attenzione del dipendente sui soli giorni lavorativi.

2. **Calcolo automatico delle ore da timbratura QR Code**:
   - L'attivazione della spunta **QR Code** apre un flusso assistito in cui il dipendente genera un token dinamico (da usare al Kiosk o tramite smartphone). Una volta effettuate le timbrature di ingresso e uscita, il sistema **calcola automaticamente** le ore ordinarie e straordinarie sottraendo la pausa configurata, disabilitando la modifica manuale errata e riducendo l'inserimento a zero frizione.

3. **Feedback visivo in tempo reale e totali sintetizzati (`totals-row`)**:
   - Una barra superiore suddivisa in gruppi di badge colorati offre un riscontro immediato del bilancio mensile accumulato: blu per le ordinarie, ambra per straordinari/eccedenti, verde per ferie/permessi, giallo/rosso/indigo per INPS, INAIL e CIG.

4. **Modali contestuali per eventi complessi**:
   - Invece di sovraccaricare la schermata principale con campi complessi, l'inserimento di eventi prolungati come Malattia o Cassa Integrazione, o la configurazione del QR, attiva modali guidate e focalizzate (`ModaleMalattia`, `ModaleCassaIntegrazione`, `ModaleQrSettings`), semplificando il flusso cognitivo dell'utente.

---

## 5. Stati del foglio presenze

```text
bozza ──► inviato ──► approvato
              │
              └──► rifiutato / reinviato
```

| Stato | Descrizione | Righe modificabili |
| :--- | :--- | :---: |
| `bozza` | Foglio in compilazione da parte del dipendente | Sì |
| `inviato` | Inviato al Manager tramite `Invia al Manager` | No |
| `approvato` | Validato dal Manager, dati consolidati per le paghe | No |
| `rifiutato` / `reinviato` | Respinto dal Manager e rinviato dal dipendente dopo la correzione | Secondo il flusso di approvazione |

---

## 6. Timbratura con QR Code

### 6.1 Panoramica

Il modulo QR Code, integrato nel sistema HR-Tech ERP, consente la registrazione automatica e sicura delle presenze (ingresso e uscita) tramite QR code dinamici a scadenza temporale, scansionati presso i kiosk aziendali (tablet o strumenti di emulazione). Semplifica il rilevamento delle presenze e previene errori di inserimento manuale attraverso:

1. La generazione dinamica di token JWT protetti e a tempo limitato per ciascun record di presenza.
2. L'interfaccia nel foglio presenze mensile del dipendente (`Timesheet.jsx`) per l'attivazione e la visualizzazione del QR code.
3. Una pagina Kiosk dedicata (`Kiosk.jsx`) per la scansione tramite fotocamera o strumenti di test e la registrazione automatica delle timbrature.
4. Il calcolo automatico delle ore ordinarie e straordinarie al momento del check-out, tenendo conto delle pause configurate e dei contratti di lavoro.

### 6.2 Architettura del sistema

```text
┌─────────────────────────┐       ┌─────────────────────────┐       ┌─────────────────────────┐
│   Frontend Dipendente   │       │     Backend Laravel     │       │     Dispositivo Kiosk   │
│    (Timesheet React)    │◄─────►│   (API REST & Service   │◄─────►│    (Scanner HTML5 o     │
│                         │       │      Token JWT)         │       │     KioskTest.jsx)      │
└─────────────────────────┘       └─────────────────────────┘       └─────────────────────────┘
            │                                  │                                  │
            ▼                                  ▼                                  ▼
   GET /presenze/{id}/generate-qr     POST /api/presenze/scan-qr         Scansione della stringa QR
   (Rigenerazione ogni 25s)           (Verifica header X-Kiosk-Token)    (Registra ingresso/uscita)
```

### 6.3 Prerequisiti e regole di business

Per attivare e utilizzare la timbratura con QR Code su una riga del foglio presenze devono essere soddisfatti i seguenti vincoli, validati sia a livello frontend sia backend:

- **Tipo di contratto**: il dipendente deve essere a tempo pieno (`percentuale_part_time === 100`). I contratti part-time non possono utilizzare la timbratura QR.
- **Causale**: la causale della presenza deve essere tassativamente `'lavoro'`.
- **Modalità di lavoro**: deve essere tassativamente `'in_sede'`. Selezionando `'smart_working'` o `'trasferta'`, l'opzione QR Code viene disattivata o nascosta automaticamente.

### 6.4 Flusso operativo

1. **Attivazione**:
   - Il dipendente accede al proprio timesheet mensile (`Timesheet.jsx`).
   - Seleziona la modalità `in_sede` per il giorno desiderato, rendendo visibile la spunta **QR Code**.
   - Spunta la casella **QR Code**: si apre la modale di configurazione (`ModaleQrSettings`) per impostare o verificare la durata della pausa (`pausa_ore`).

2. **Generazione del token**:
   - Cliccando su **"Scansiona il QR code"**, l'applicazione richiede un token JWT al backend (`GET /presenze/{id}/generate-qr`). Se la riga non è ancora salvata, viene salvata automaticamente prima di procedere.
   - Il token viene mostrato in una modale con QR code SVG (`QrCodeModal.jsx`) e resta invariato per la durata configurata, così può essere copiato nel kiosk senza cambiare durante il trasferimento.

3. **Scansione al Kiosk**:
   - Il tablet aziendale in modalità Kiosk (`Kiosk.jsx`) o l'emulatore di test (`KioskTest.jsx`) inquadra e legge la stringa del QR code.
   - Il kiosk invia il token al backend tramite `POST /api/presenze/scan-qr`, includendo l'header di sicurezza `X-Kiosk-Token`.

4. **Elaborazione e registrazione**:
   - Il backend decodifica il token JWT, verifica la validità e l'autorizzazione del kiosk, quindi aggiorna il record:
     - **Prima scansione**: registra l'orario di ingresso (`ora_ingresso`).
     - **Seconda scansione**: registra l'orario di uscita (`ora_uscita`) e calcola in automatico le ore lavorate, sottraendo la pausa configurata, distinguendo ore ordinarie e straordinarie.

5. **Ritorno sul foglio presenze**:
   - Le ore calcolate popolano la riga del timesheet e la modifica manuale delle stesse viene disabilitata (vedi [sezione 4](#4-soluzioni-uxui-per-agevolare-linserimento-ore)). Lo stato delle timbrature (Ingresso/Uscita) è visibile nella colonna dedicata.

### 6.5 Endpoint API

| Metodo | Endpoint | Autenticazione | Descrizione |
| :--- | :--- | :--- | :--- |
| **GET** | `/presenze/{presenza}/generate-qr` | Bearer Token (Sanctum) | Genera un token JWT QR valido per la durata configurata in `QR_TOKEN_TTL_SECONDS`. |
| **POST** | `/api/presenze/scan-qr` | Header `X-Kiosk-Token` | Elabora la scansione del QR code e registra l'ingresso o l'uscita. |

### 6.6 Esempi di richiesta e risposta

#### Generazione token (`GET /presenze/{id}/generate-qr`)

**Risposta (200 OK):**

```json
{
  "qr_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Scansione QR code (`POST /api/presenze/scan-qr`)

**Intestazioni (Headers):**

```http
Content-Type: application/json
X-Kiosk-Token: il_tuo_token_kiosk_segreto
```

**Corpo (Body):**

```json
{
  "qr_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Risposta (200 OK):**

```json
{
  "success": true,
  "message": "Ingresso registrato con successo!",
  "data": {
    "ora_ingresso": "08:00:00",
    "ore": 8.5,
    "ore_ordinarie": 8,
    "ore_straordinarie": 0.5
  }
}
```

### 6.7 Configurazione degli ambienti

#### Frontend (`frontend-react/.env` / `.env.example`)

```env
VITE_API_URL=http://localhost:8000/api
VITE_KIOSK_TOKEN=test-kiosk-token # Solo per ambiente di sviluppo
```

#### Backend (`backend-php/.env` / `.env.example`)

```env
KIOSK_TOKEN=test-kiosk-token
JWT_SECRET=chiave-segreta-jwt-lunga-almeno-32-caratteri
QR_TOKEN_TTL_SECONDS=30
```

### 6.8 Considerazioni sulla sicurezza

- **Scadenza configurabile**: i token QR scadono dopo la durata configurata in `QR_TOKEN_TTL_SECONDS` (30 secondi di default).
- **Autenticazione dei Kiosk**: i terminali tablet comunicano tramite token dedicati (`X-Kiosk-Token`), isolati dai token di sessione utente.
- **Validazione rigida**: controlli lato server impediscono la generazione e la scansione di QR code per dipendenti part-time o modalità lavorative non conformi.

### 6.9 Sviluppo e testing

1. **Esecuzione dei test automatici**: eseguire la suite di test Pest per verificare la logica di calcolo delle ore tramite QR:

   ```bash
   cd backend-php
   php artisan test tests/Feature/CalcoloOreQrTest.php
   ```

2. **Test manuale con emulazione**:
   - Attivare il flag QR su una riga del timesheet per un dipendente a tempo pieno in sede.
   - Aprire la modale QR e copiare il token.
   - Accedere alla pagina o al tool di test Kiosk (`KioskTest.jsx`), incollare il token ed effettuare la simulazione di ingresso/uscita, verificando la corretta registrazione dei campi.

### 6.10 Checklist per la produzione

- [ ] Rimuovere i componenti di test per lo sviluppo (`frontend-react/src/tools/KioskTest.jsx` e rotte associate).
- [ ] Rimuovere o nascondere i pulsanti per la copia manuale del token nelle modali di produzione.
- [ ] Rimuovere `VITE_KIOSK_TOKEN` dalle variabili d'ambiente del frontend.
- [ ] Configurare token Kiosk unici, sicuri e riservati sul backend per ciascun dispositivo fisico.
- [ ] Generare una `JWT_SECRET` complessa (minimo 32 caratteri) nel file `.env` del server di produzione.
- [ ] Abilitare rigorosamente HTTPS per tutte le chiamate API e frontend.
- [ ] Configurare whitelist IP o limiti di frequenza (rate limiting) sull'endpoint `/api/presenze/scan-qr`.
- [ ] Impostare sistemi di logging e monitoraggio per tracciare tentativi di scansione anomali o errori.
