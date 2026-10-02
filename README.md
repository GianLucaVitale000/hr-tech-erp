# HR-Tech ERP

HR-Tech ERP è un'applicazione web per la gestione dei processi HR aziendali:
anagrafica dei dipendenti, gestione contratti collettivi e inserimento di specifiche regole di calcolo tratte dal testo del CCNL applicato, rilevazione delle presenze, timesheet, approvazione dei fogli ore, analisi HR ed esportazione dei dati per le paghe.

Questo è il README generale del progetto. La documentazione funzionale e
tecnica di dettaglio dei singoli moduli è raccolta nei README dedicati elencati
in [Documentazione dei moduli](#documentazione-dei-moduli).

## Indice

- [HR-Tech ERP](#hr-tech-erp)
  - [Indice](#indice)
  - [Architettura](#architettura)
  - [Tecnologie](#tecnologie)
  - [Prerequisiti](#prerequisiti)
  - [Installazione](#installazione)
  - [Configurazione del database](#configurazione-del-database)
    - [1. Creare il database MySQL](#1-creare-il-database-mysql)
    - [2. Configurare Laravel](#2-configurare-laravel)
    - [3. Configurare il microservizio Python](#3-configurare-il-microservizio-python)
    - [4. Eseguire migrazioni e seed](#4-eseguire-migrazioni-e-seed)
  - [Avvio dell'applicazione](#avvio-dellapplicazione)
    - [Avvio con lo script del progetto](#avvio-con-lo-script-del-progetto)
    - [Avvio manuale](#avvio-manuale)
  - [Struttura del repository](#struttura-del-repository)
  - [Articolazione dell'applicazione e navigazione UX/UI](#articolazione-dellapplicazione-e-navigazione-uxui)
    - [Accesso e aree dell'applicazione](#accesso-e-aree-dellapplicazione)
    - [Area Admin](#area-admin)
    - [Area Dipendente](#area-dipendente)
    - [Modalità kiosk e QR Code](#modalità-kiosk-e-qr-code)
    - [Principi UX/UI trasversali](#principi-uxui-trasversali)
  - [Flusso dei dati](#flusso-dei-dati)
  - [API e servizi](#api-e-servizi)
  - [Comandi Artisan utili](#comandi-artisan-utili)
  - [Test e qualità del codice](#test-e-qualità-del-codice)
  - [Documentazione dei moduli](#documentazione-dei-moduli)

## Architettura

Il progetto è organizzato come un monorepo composto da tre servizi:

```text
Browser
  └── React + Vite (localhost:5173)
        ├── API REST Laravel/Sanctum (localhost:8000/api)
        │     └── MySQL (hr_tech_erp)
        └── Microservizio FastAPI (localhost:8001)
              └── Export Excel paghe
```

- **Frontend React**: applicazione SPA, routing lato client, interfaccia
  responsive e gestione dello stato di autenticazione.
- **Backend Laravel**: API REST, autenticazione con Laravel Sanctum, controllo
  dei ruoli, logica di dominio, persistenza tramite Eloquent e migrazioni.
- **Microservizio Python**: servizio separato per la generazione dello
  spreadsheet mensile destinato alle paghe.
- **MySQL**: database condiviso dal backend Laravel e dal microservizio Python.

## Tecnologie

| Area | Tecnologie principali |
| --- | --- |
| Frontend | React 19, Vite 8, React Router 7, Axios |
| UI e grafici | Material UI, Tailwind CSS, Emotion, Recharts |
| Presenze | FullCalendar, `html5-qrcode`, `qrcode.react` |
| Backend | PHP 8.3, Laravel 13, Laravel Sanctum, Eloquent |
| Autorizzazioni | `spatie/laravel-permission` |
| Documenti | `barryvdh/laravel-dompdf` |
| Microservizio | Python, FastAPI, Uvicorn, Pandas, OpenPyXL |
| Database | MySQL 8.x (o versione compatibile) |
| Test | Pest/PHPUnit e Jest/Testing Library |

## Prerequisiti

Installare i seguenti strumenti:

- PHP 8.3 o superiore compatibile con Laravel 13;
- Composer;
- Node.js e npm;
- Python 3.11+ consigliato;
- MySQL 8.x o compatibile;
- Bash, richiesto dagli script `start.sh` e `stop.sh`.

Verificare che i comandi siano disponibili:

```bash
php --version
composer --version
node --version
npm --version
python3 --version
mysql --version
```

## Installazione

Clonare il repository e installare le dipendenze dei tre componenti:

```bash
git clone <URL_DEL_REPOSITORY>
cd hr-tech-erp

cd backend-php
composer install
cp .env.example .env
php artisan key:generate
npm install
cd ../frontend-react
npm install
cd ../microservice-python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
```

Non committare i file `.env`: contengono configurazioni specifiche
dell'ambiente e, in produzione, possono contenere credenziali.

## Configurazione del database

### 1. Creare il database MySQL

Eseguire con un utente MySQL autorizzato alla creazione dei database:

```sql
CREATE DATABASE hr_tech_erp
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

Se il database esiste già, non è necessario ricrearlo. Creare eventualmente un
utente applicativo dedicato invece di usare `root`:

```sql
CREATE USER 'hr_tech_erp_user'@'localhost' IDENTIFIED BY '<PASSWORD>';
GRANT ALL PRIVILEGES ON hr_tech_erp.* TO 'hr_tech_erp_user'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Configurare Laravel

Modificare `backend-php/.env` con i dati del database:

```dotenv
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=hr_tech_erp
DB_USERNAME=hr_tech_erp_user
DB_PASSWORD=<PASSWORD>
```

Impostare inoltre `APP_URL`, `APP_ENV` e `APP_DEBUG` in base all'ambiente.
Il token usato dalla modalità kiosk deve essere valorizzato in `KIOSK_TOKEN`.

### 3. Configurare il microservizio Python

Creare `microservice-python/.env` a partire dall'esempio:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=hr_tech_erp
DB_USERNAME=hr_tech_erp_user
DB_PASSWORD=<PASSWORD>
```

### 4. Eseguire migrazioni e seed

```bash
cd backend-php
php artisan migrate
```

Per un ambiente locale vuoto, il seeding inizializza ruoli, utenti demo,
contratti, regole di calcolo e dati di esempio:

```bash
php artisan db:seed
```

Per rigenerare completamente un database locale:

```bash
php artisan migrate:fresh --seed
```

Il comando distrugge e ricrea le tabelle: usarlo esclusivamente in sviluppo o
su un database di test.

## Avvio dell'applicazione

### Avvio con lo script del progetto

Dalla root:

```bash
./start.sh
```

Lo script avvia:

| Servizio | URL |
| --- | --- |
| Laravel API | `http://localhost:8000` |
| Microservizio Python | `http://localhost:8001` |
| React/Vite | `http://localhost:5173` |

Lo script attuale presuppone che il progetto si trovi in
`~/hr-tech-erp` e che esista `microservice-python/venv`. Se il repository è in
un percorso diverso, modificare i percorsi dello script oppure avviare i
servizi manualmente.

Per fermare i processi avviati:

```bash
./stop.sh
```

### Avvio manuale

Questa modalità è utile per eseguire un solo servizio o per lavorare con
terminali separati:

```bash
# Terminale 1 - backend
cd backend-php
php artisan serve --port=8000

# Terminale 2 - microservizio
cd microservice-python
source venv/bin/activate
uvicorn main:app --reload --port=8001

# Terminale 3 - frontend
cd frontend-react
npm run dev -- --port=5173
```

Aprire quindi `http://localhost:5173`. La pagina iniziale reindirizza al login;
le rotte non riconosciute fanno lo stesso.

## Struttura del repository

```text
.
├── backend-php/
│   ├── app/                    # Controller, modelli, servizi, middleware
│   ├── database/               # Migrazioni, factory e seed
│   ├── routes/                 # API, web e comandi schedulati
│   └── artisan                 # CLI Laravel
├── frontend-react/
│   ├── src/components/         # Layout, navbar, footer e componenti riusabili
│   ├── src/context/            # Stato globale dell'autenticazione
│   ├── src/pages/              # Pagine per ruolo e pagine pubbliche
│   ├── src/services/           # Client API e servizi di dominio
│   ├── src/styles/             # Stili per aree e moduli
│   └── src/App.jsx             # Routing principale della SPA
├── microservice-python/
│   ├── main.py                 # Applicazione FastAPI ed endpoint export
│   ├── services/               # Generazione del report Excel
│   └── database.py             # Connessione al database
├── start.sh                    # Avvio dei tre servizi
├── stop.sh                     # Arresto dei servizi
└── README-*.md                 # Documentazione dei moduli
```

## Articolazione dell'applicazione e navigazione UX/UI

### Accesso e aree dell'applicazione

Il login (`/login`) identifica il ruolo dell'utente. Le aree protette sono
racchiuse in layout distinti:

- `AdminLayout` per il ruolo `admin`;
- `DipendenteLayout` per il ruolo `dipendente`.

`ProtectedRoute` impedisce l'accesso diretto a una sezione non autorizzata.
Navbar, sidebar mobile e footer mantengono una struttura coerente all'interno
di ciascuna area. Il logout riporta al login e rimuove la sessione secondo
l'opzione “ricordami”.

### Area Admin

La dashboard `/admin` è l'hub operativo dell'amministratore. La navigazione
principale consente di raggiungere:

| Modulo | Rotta | Obiettivo UX/UI |
| --- | --- | --- |
| Dashboard | `/admin` | Sintesi e accesso rapido alle attività HR |
| Utenti | `/admin/utenti` | Gestione degli account e dei ruoli |
| Dipendenti | `/admin/dipendenti` | Ricerca, inserimento e modifica dell'anagrafica |
| Contratti | `/admin/contratti` | Consultazione e gestione dei CCNL e delle regole |
| Approvazioni | `/admin/approvazioni` | Coda dei mesi inviati dai dipendenti |
| Dettaglio mese | `/admin/approvazioni/:dipendenteId/:mese/:anno` | Verifica e approvazione puntuale del foglio ore |
| Analisi HR | `/admin/analisi-hr` | Indicatori, anomalie e analisi delle ore |

Le pagine di creazione e modifica sono raggiunte dal contesto del modulo, ad
esempio `/admin/dipendenti/nuovo` e
`/admin/dipendenti/:id/edit`. Questo mantiene il percorso utente leggibile:
lista → dettaglio/form → salvataggio → ritorno alla lista o alla dashboard.

### Area Dipendente

La dashboard `/dipendente` presenta una sintesi personale: presenze,
ferie/permessi e indicatori utili alla consultazione quotidiana. La navbar
collega al:

- **Timesheet** (`/dipendente/timesheet`), dove il dipendente inserisce e
  modifica le ore, giustifica le assenze e invia il mese all'approvazione;
- **Profilo/dashboard**, per tornare alla sintesi personale.

Il timesheet adotta una visualizzazione differenziata desktop/mobile: tabella
per la consultazione ampia e schede/selettori giornalieri su schermi ridotti.
Le azioni principali sono mantenute vicine al periodo visualizzato e lo stato
di invio/approvazione impedisce modifiche non più consentite.

### Modalità kiosk e QR Code

`/kiosk` è una rotta pubblica pensata per il tablet aziendale: permette la
registrazione della presenza tramite QR Code senza usare la sessione web
personale. L'API protegge la scansione con `KIOSK_TOKEN`, mentre
`/kiosk-test` è disponibile per l'emulazione durante lo sviluppo.

Dal punto di vista UX, il kiosk è un flusso separato e a bassa frizione:
scansione → conferma dell'esito → ritorno allo stato pronto per la scansione
successiva. Non deve essere usato come sostituto della navigazione autenticata
di admin o dipendente.

### Principi UX/UI trasversali

- La dashboard funziona da punto di orientamento e non sostituisce i moduli
  operativi.
- Navbar e sidebar espongono solo le funzioni coerenti con il ruolo.
- Le rotte annidate conservano il contesto del modulo e rendono condivisibili
  i percorsi tramite URL.
- Le pagine sono responsive: su mobile la navigazione passa a menu laterale e
  i contenuti tabellari diventano più leggibili tramite card o selettori.
- Le operazioni con effetti sul ciclo paghe (invio, approvazione, export)
  devono rendere evidente lo stato e l'esito dell'azione.

## Flusso dei dati

1. L'utente accede dal frontend React.
2. Laravel autentica le credenziali e restituisce un token Sanctum.
3. Il frontend usa il token nelle richieste API protette.
4. Laravel applica autorizzazioni, regole HR e persistenza su MySQL.
5. Per l'export mensile, Laravel espone i dati necessari e il frontend chiama
   FastAPI su `/export/paghe?mese=M&anno=A`.
6. FastAPI legge i dati configurati, genera un file `.xlsx` con Pandas/OpenPyXL
   e lo restituisce come download.

## API e servizi

Endpoint di controllo utili in locale:

```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/ping
curl http://localhost:8001/
```

Le API Laravel sono definite in
[backend-php/routes/api.php](backend-php/routes/api.php). I gruppi principali
sono autenticazione, utenti, dipendenti, contratti, orari settimanali,
presenze, approvazione mensile e QR Code.

Per dettagli su payload e regole di business consultare la documentazione
specifica, in particolare [QR-CODE-PRESENZE-DOCUMENTAZIONE.md](QR-CODE-PRESENZE-DOCUMENTAZIONE.md)
e [README-ApprovazioneFogliOre.md](README-ApprovazioneFogliOre.md).

> Nota di configurazione: il client Axios generale usa attualmente
> `http://localhost:8000/api` in
> [frontend-react/src/services/api.js](frontend-react/src/services/api.js).
> `VITE_API_URL` è usata dal flusso di scansione QR. Se si cambia host o porta,
> aggiornare entrambe le configurazioni in modo coerente.

## Comandi Artisan utili

```bash
cd backend-php

php artisan migrate:status
php artisan route:list
php artisan cnel:sync
php artisan dipendenti:aggiorna-residui-annui
php artisan test
```

Nel codice Laravel le due attività sono predisposte per l'esecuzione automatica, ma **nell'ambiente attuale non sono automatiche**, perché `start.sh` non avvia `php artisan schedule:work` e non risulta configurato un cron di sistema per eseguire `php artisan schedule:run`. Di conseguenza:

| Attività | Schedulazione prevista nel codice | Modalità effettiva attuale | Comando manuale |
| --- | --- | --- | --- |
| Sincronizzazione CNEL | Il primo giorno di ogni mese alle 03:00 | Manuale | `php artisan cnel:sync` |
| Calcolo e riporto dei residui annuali di ferie e permessi | Il 31 dicembre alle 23:59 | Manuale | `php artisan dipendenti:aggiorna-residui-annui <ANNO_DA_CHIUDERE>` |

Pertanto, allo stato attuale, **anche il calcolo dei residui annuali non parte automaticamente il 31 dicembre**: deve essere eseguito manualmente, a meno che non venga mantenuto attivo uno scheduler Laravel o configurato un cron di sistema.

Al 31 dicembre è necessario indicare esplicitamente l'anno che si vuole chiudere. Per esempio, il 31 dicembre 2026:

```bash
cd backend-php
php artisan dipendenti:aggiorna-residui-annui 2026
```

Il comando calcola per ogni dipendente il residuo di ferie e di permessi al 31/12/2026 e lo salva come saldo iniziale (`residuo_precedente_ferie` e `residuo_precedente_permessi`) per il 2027. I dipendenti assunti dopo l'anno indicato vengono esclusi.

Il parametro anno è opzionale, ma senza parametro il comando usa l'anno precedente rispetto alla data di esecuzione. Di conseguenza, eseguito il 31 dicembre 2026 senza parametro, calcolerebbe il 2025; per questo, in caso di esecuzione al 31/12, è raccomandato specificare sempre l'anno da chiudere.
Eseguendolo dal 1° gennaio 2027 senza parametro, invece, il comando
calcolerebbe correttamente il 2026.

Per abilitare l'esecuzione automatica in un ambiente di sviluppo è possibile avviare un worker dedicato:

```bash
cd backend-php
php artisan schedule:work
```

In produzione è normalmente preferibile configurare il cron di sistema seguente, eseguito ogni minuto:

```cron
* * * * * cd /home/gianluca/hr-tech-erp/backend-php && php artisan schedule:run >> /dev/null 2>&1
```

Il cron deve essere configurato con l'utente e i percorsi corretti
dell'ambiente di installazione. Solo dopo questa configurazione le due attività verranno eseguite automaticamente secondo gli orari indicati nella tabella.

## Test e qualità del codice

Frontend:

```bash
cd frontend-react
npm run lint
npm test
npm run build
```

Backend:

```bash
cd backend-php
composer test
```

Prima di una release verificare anche i tre health check, il login con
entrambi i ruoli, il flusso di inserimento e approvazione del timesheet e
l'export Excel.

## Documentazione dei moduli

- [Login e autenticazione](README-LOGIN.md)
- [Dashboard admin e dipendente](README-DASHBOARD.md)
- [Gestione utenti e dipendenti](README-UTENTI-DIPENDENTI.md)
- [Timesheet e registrazione presenze](README-TIMESHEET.md)
- [Approvazione fogli ore ed export paghe](README-ApprovazioneFogliOre.md)
- [Analisi HR](README-AnalisiHR.md)
- [Gestione CCNL](README-GESTIONE-CCNL.md)
- [QR Code per le presenze](QR-CODE-PRESENZE-DOCUMENTAZIONE.md)

I README dei moduli descrivono implementazione e regole specifiche; questo
documento deve rimanere il punto di ingresso per setup, architettura e
navigazione complessiva.
