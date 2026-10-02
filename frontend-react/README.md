# Frontend React

Frontend SPA del progetto HR-Tech ERP, realizzato con React e Vite.

Il frontend comunica con:

- il backend Laravel API, normalmente su `http://localhost:8000`;
- il microservizio FastAPI per l'esportazione paghe, normalmente su
  `http://localhost:8001`.

## Prerequisiti

- Node.js e npm;
- backend Laravel configurato e avviato in `../backend-php`;
- microservizio Python avviato in `../microservice-python` quando si utilizzano
  le funzioni di esportazione.

## Installazione

Dalla directory del frontend:

```bash
npm install
cp .env.example .env
```

Configurare `.env`:

```dotenv
VITE_API_URL=http://localhost:8000
VITE_KIOSK_TOKEN=tablet_kiosk_secret_token_12345
```

`VITE_API_URL` deve contenere solo l'origine del backend. Il percorso `/api`
viene aggiunto dal servizio HTTP quando invia le richieste al kiosk.

`VITE_KIOSK_TOKEN` deve corrispondere a `KIOSK_TOKEN` nel file
`backend-php/.env`. Il valore viene incorporato nel bundle frontend da Vite:
non utilizzare quindi un token riservato o ad alta sensibilità in un frontend
pubblico.

## Avvio in sviluppo

```bash
npm run dev -- --port=5173
```

Aprire:

```text
http://localhost:5173
```

Per avviare tutti i servizi dalla root del repository è possibile usare:

```bash
./start.sh
```

Lo script avvia il frontend sulla porta `5173`, il backend Laravel sulla porta
`8000` e il microservizio Python sulla porta `8001`.

## Build e preview

Creare la build di produzione:

```bash
npm run build
```

Avviare la build con il server di preview di Vite:

```bash
npm run preview
```

La directory `dist/` è generata automaticamente e non deve essere versionata.

## Test e qualità

Eseguire ESLint:

```bash
npm run lint
```

Eseguire i test Jest:

```bash
npm test
```

Modalità interattiva:

```bash
npm run test:watch
```

## Struttura principale

```text
src/
├── components/       Layout e componenti riutilizzabili
├── context/          Stato globale dell'autenticazione
├── hooks/            Hook applicativi
├── pages/            Pagine amministrative, dipendente e kiosk
├── services/         Client API e servizi applicativi
├── styles/           Fogli di stile dei moduli
├── tools/            Strumenti di sviluppo, incluso KioskTest
├── utils/            Funzioni di dominio e utilità
├── App.jsx           Routing principale
└── main.jsx          Punto di ingresso React
```

## Rotte principali

| Rotta | Accesso | Funzione |
| --- | --- | --- |
| `/login` | Pubblico | Autenticazione |
| `/admin` | Admin | Dashboard amministrativa |
| `/admin/dipendenti` | Admin | Gestione dipendenti |
| `/admin/utenti` | Admin | Gestione utenti |
| `/admin/contratti` | Admin | Gestione contratti |
| `/admin/approvazioni` | Admin | Approvazione dei fogli ore |
| `/admin/analisi-hr` | Admin | Analisi HR |
| `/dipendente` | Dipendente | Dashboard personale |
| `/dipendente/timesheet` | Dipendente | Foglio presenze |
| `/kiosk` | Pubblico | Scanner QR per il tablet aziendale |
| `/kiosk-test` | Pubblico | Emulatore kiosk per lo sviluppo |

Le rotte amministrative e dipendente sono protette da `ProtectedRoute`.

## Flusso QR Code

Dal timesheet del dipendente:

1. configurare una presenza in sede con causale `lavoro`;
2. attivare il QR Code;
3. aprire la modale tramite **Scansiona il QR code**;
4. copiare il token tramite **Copia Token**.

Per il tablet aziendale usare:

```text
http://localhost:5173/kiosk
```

Per una simulazione manuale durante lo sviluppo usare:

```text
http://localhost:5173/kiosk-test
```

Nel kiosk di test è possibile usare **Incolla Token**, quindi premere
**INGRESSO** per la prima timbratura e **USCITA** per la seconda. Il backend
valida il token kiosk, la firma JWT, la presenza associata e la configurazione
della timbratura.

## Esportazione paghe

La pagina delle approvazioni utilizza il microservizio FastAPI per generare
l'esportazione Excel. Il servizio deve essere attivo su:

```text
http://localhost:8001
```

La configurazione e l'avvio del microservizio sono documentati in
`../README.md` e nella directory `../microservice-python`.
