# HR-Tech ERP

HR-Tech ERP è un'applicazione web per la gestione dei processi HR aziendali:
anagrafica dei dipendenti, gestione dei contratti collettivi, con inserimento di specifici parametri tratti dal CCNL applicato per attivare filtri e regole di business, rilevazione delle presenze e delle assenze con articolazione di un sistema di causali, monitoraggio/approvazione dei fogli ore, analisi HR interna sui dati registrati ed esportazione degli stessi per l'elaborazione esterna delle paghe.

Questo è il README generale del progetto.
Una documentazione di dettaglio dei singoli moduli è raccolta nei README dedicati elencati in [Documentazione dei moduli](#documentazione-dei-moduli).

## Indice

- [HR-Tech ERP](#hr-tech-erp)
  - [Indice](#indice)
  - [Architettura](#architettura)
  - [Tecnologie](#tecnologie)
  - [Prerequisiti](#prerequisiti)
  - [Installazione](#installazione)
  - [Configurazione del database](#configurazione-del-database)
    - [1. Creare il database MySQL](#1-creare-il-database-mysql)
    - [2. Popolamento e struttura del database](#2-popolamento-e-struttura-del-database)
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
  spreadsheet mensile destinato all'export per l'elaborazione esternalizzata delle paghe.
- **MySQL**: database condiviso dal backend Laravel e dal microservizio Python.

## Tecnologie

| Area | Tecnologie principali |
| --- | --- |
| Frontend | React 19, Vite 8, React Router 7, Axios |
| UI e grafici | Recharts |
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
git clone https://github.com/GianLucaVitale000/hr-tech-erp.git
cd hr-tech-erp

cd backend-php
composer install
cp .env.example .env
php artisan key:generate
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
CREATE DATABASE IF NOT EXISTS hr_tech_erp
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

*Nota*: Se il database esiste già, l'istruzione `IF NOT EXISTS` evita errori e preserva eventuali dati presenti. È inoltre consigliabile creare un utente applicativo dedicato anziché utilizzare `root`:

```sql
CREATE USER IF NOT EXISTS 'hr_tech_erp_user'@'localhost' IDENTIFIED BY '<PASSWORD>';
GRANT ALL PRIVILEGES ON hr_tech_erp.* TO 'hr_tech_erp_user'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Popolamento e struttura del database

Il progetto offre due modalità alternative per popolare la struttura delle tabelle nel database `hr_tech_erp`:

- **Opzione A (Consigliata per lo sviluppo con Laravel)**: Utilizzare le migrazioni e i seeder nativi di Laravel. Dopo aver configurato le credenziali nel file `.env`, l'esecuzione di `php artisan migrate` creerà tutte le tabelle partendo da zero, e `php artisan db:seed` popolerà i dati iniziali.
- **Opzione B (Importazione tramite dump SQL)**: Se si preferisce importare direttamente lo schema pre-configurato presente nel repository (`backend-php/database/database.sql`), è possibile caricarlo direttamente nel database con il comando:

  ```bash
  mysql -u hr_tech_erp_user -p hr_tech_erp < backend-php/database/database.sql
  ```
  
  *(Il file `database.sql` include già i comandi di reset delle tabelle e la struttura completa).*

### 2. Configurare Laravel

Modificare il file [`backend-php/.env`](backend-php/.env) configurando i parametri di connessione al database MySQL:

```dotenv
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=hr_tech_erp
DB_USERNAME=hr_tech_erp_user
DB_PASSWORD=<PASSWORD>
```

Inoltre, configurare le variabili di ambiente principali secondo le necessità locali o di produzione:

- `APP_URL`: l'URL di base dell'applicazione backend (es. `http://localhost:8000`).
- `APP_ENV`: impostare su `local` per lo sviluppo o `production` per l'ambiente di rilascio.
- `APP_DEBUG`: impostare su `true` in sviluppo per visualizzare i messaggi di errore dettagliati, o su `false` in produzione.
- `KIOSK_TOKEN`: stringa segreta (es. una password o un token personalizzato) utilizzata per autorizzare le chiamate API del tablet aziendale in modalità kiosk. Questa stringa non è predefinita nel sistema ma va inventata e configurata manualmente nel file `.env` del backend (e inserita nel client/tablet che effettua le chiamate inserendola nell'header HTTP `X-Kiosk-Token`).

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

> **Nota importante sui ratei e saldi di Ferie, Permessi ed Ex-festività**:
> I seeder standard inizializzano la struttura e dati dimostrativi di base, ma **non popolano in modo esaustivo** i parametri contrattuali avanzati come i ratei mensili (`rateo_mensile_ferie`, `rateo_mensile_permessi_rol`, `rateo_mensile_ex_festivita`) e i residui precedenti (`residuo_precedente_ferie`, `residuo_precedente_permessi`).
> Poiché questi valori variano frequentemente in base all'anzianità di servizio, ai livelli di inquadramento e alle specifiche clausole della contrattazione collettiva, **è necessario l'inserimento o la configurazione puntuale di tali dati da parte dell'Admin** (tramite l'apposita sezione anagrafica dei dipendenti). Senza questa configurazione, gli algoritmi di calcolo e le relative sezioni di monitoraggio (come la card dedicata in *Analisi HR*) potrebbero non disporre dei dati necessari per il corretto conteggio. Sebbene sia possibile predisporre seeder personalizzati per specifiche esigenze di test, la gestione e l'aggiornamento dei ratei restano affidati all'amministratore.

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
├── backend-php/                # Backend API REST (Laravel 13)
│   ├── app/                    # Controller, modelli, servizi, middleware
│   ├── bootstrap/              # Bootstrap dell'applicazione
│   ├── config/                 # File di configurazione (database, auth, services, ecc.)
│   ├── database/               # Migrazioni, factory, seed e dump SQL (database.sql)
│   ├── public/                 # Punto d'ingresso pubblico e file asset
│   ├── resources/              # Viste blade e risorse
│   ├── routes/                 # API, web e comandi schedulati
│   ├── storage/                # Log, cache e file PDF generati
│   ├── tests/                  # Test unitari e di feature (Pest/PHPUnit)
│   └── artisan                 # CLI di Laravel
├── frontend-react/             # Frontend SPA (React 19 + Vite)
│   ├── public/                 # Immagini e favicon pubbliche
│   ├── src/
│   │   ├── components/         # Layout, navbar, footer e componenti riusabili (Admin/Dipendente)
│   │   ├── context/            # Stato globale dell'autenticazione
│   │   ├── hooks/              # Custom hook (es. Analisi HR)
│   │   ├── pages/              # Pagine suddivise per ruolo (Admin/Dipendente) e pubbliche (Login/Kiosk)
│   │   ├── services/           # Client API (Axios) e servizi di dominio
│   │   ├── styles/             # Fogli di stile CSS per moduli e aree
│   │   ├── tools/              # Tool di test e utility (es. KioskTest)
│   │   ├── utils/              # Funzioni di supporto e formattazione
│   │   └── App.jsx             # Routing principale della SPA
│   ├── index.html              # HTML principale di Vite
│   ├── package.json            # Dipendenze e script npm
│   └── vite.config.js          # Configurazione di Vite
├── microservice-python/        # Microservizio di export Excel (FastAPI)
│   ├── services/               # Generazione del report Excel (Pandas / OpenPyXL)
│   ├── main.py                 # Applicazione FastAPI ed endpoint export paghe
│   ├── database.py             # Connessione al database MySQL
│   ├── requirements.txt        # Dipendenze Python (pip)
│   └── test_export.sh          # Script di test per l'export
├── start.sh                    # Script di avvio centralizzato dei tre servizi
├── stop.sh                     # Script di arresto dei servizi
├── QR-CODE-PRESENZE-DOCUMENTAZIONE.md # Documentazione specifica QR Code e Kiosk
└── README-*.md                 # Documentazione di dettaglio dei singoli moduli
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
| Dashboard | `/admin` | Sintesi globali e accesso rapido alle attività HR |
| Utenti | `/admin/utenti` | Gestione degli account e dei ruoli |
| Dipendenti | `/admin/dipendenti` | Ricerca, inserimento e modifica dell'anagrafica |
| Contratti | `/admin/contratti` | Consultazione e gestione dei CCNL e delle regole contrattuali |
| Approvazioni | `/admin/approvazioni` | Coda dei mesi inviati dai dipendenti |
| Dettaglio mese | `/admin/approvazioni/:dipendenteId/:mese/:anno` | Verifica e approvazione puntuale del foglio ore |
| Analisi HR | `/admin/analisi-hr` | Indicatori HR, e analisi delle presenze |

Le pagine di creazione e modifica sono raggiunte dal contesto del modulo, ad
esempio `/admin/dipendenti/nuovo` e `/admin/dipendenti/:id/edit`.
Questo mantiene il percorso utente leggibile:
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

Nel codice Laravel le due attività di sincronizzazione dei contratti dal CNEL e calcolo e di riporto dei residui annuali di ferie e permessi sono predisposte per l'esecuzione automatica, ma **nell'ambiente attuale non sono automatiche**, perché `start.sh` non avvia `php artisan schedule:work` e non risulta configurato un cron di sistema per eseguire `php artisan schedule:run`. Di conseguenza:

| Attività | Schedulazione prevista nel codice | Modalità effettiva attuale | Comando manuale |
| --- | --- | --- | --- |
| Sincronizzazione CNEL | Il primo giorno di ogni mese alle 03:00 | Manuale | `php artisan cnel:sync` |
| Calcolo e riporto dei residui annuali di ferie e permessi | Il 31 dicembre alle 23:59 | Manuale | `php artisan dipendenti:aggiorna-residui-annui <ANNO_DA_CHIUDERE>` |

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

Il cron deve essere configurato con l'utente e i percorsi corretti dell'ambiente di installazione.
Solo dopo questa configurazione le due attività verranno eseguite automaticamente secondo gli orari indicati nella tabella.

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

Prima di una release verificare anche i tre health check, il login con entrambi i ruoli,
il flusso di inserimento e approvazione del timesheet e l'export Excel.

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
documento deve rimanere il punto di ingresso per setup, architettura e navigazione complessiva.
