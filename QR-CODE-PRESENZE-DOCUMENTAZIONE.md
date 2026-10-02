# Sistema di Rilevazione Presenze con QR Code

Modulo integrato nel sistema HR-Tech ERP per la registrazione automatica e sicura delle presenze (ingresso e uscita) tramite QR code dinamici a scadenza temporale, scansionati presso i kiosk aziendali (tablet o strumenti di emulazione).

---

## Indice

- [Sistema di Rilevazione Presenze con QR Code](#sistema-di-rilevazione-presenze-con-qr-code)
  - [Indice](#indice)
  - [Panoramica](#panoramica)
  - [Architettura del Sistema](#architettura-del-sistema)
  - [Prerequisiti e Regole di Business](#prerequisiti-e-regole-di-business)
  - [Flusso Operativo](#flusso-operativo)
  - [Endpoint API](#endpoint-api)
    - [Esempi di Richiesta e Risposta](#esempi-di-richiesta-e-risposta)
      - [Generazione Token (`GET /presenze/{id}/generate-qr`)](#generazione-token-get-presenzeidgenerate-qr)
      - [Scansione QR Code (`POST /api/presenze/scan-qr`)](#scansione-qr-code-post-apipresenzescan-qr)
  - [Configurazione degli Ambienti](#configurazione-degli-ambienti)
    - [Frontend (`frontend-react/.env` / `.env.example`)](#frontend-frontend-reactenv--envexample)
    - [Backend (`backend-php/.env` / `.env.example`)](#backend-backend-phpenv--envexample)
  - [Sviluppo e Testing](#sviluppo-e-testing)
  - [Checklist per la Produzione](#checklist-per-la-produzione)
  - [Considerazioni sulla Sicurezza](#considerazioni-sulla-sicurezza)

---

## Panoramica

Il modulo QR Code semplifica il rilevamento delle presenze aziendali e previene errori di inserimento manuale attraverso:

1. La generazione dinamica di token JWT protetti e a tempo limitato per ciascun record di presenza.
2. L'interfaccia nel foglio presenze mensile del dipendente (`Timesheet.jsx`) per l'attivazione e la visualizzazione del QR code.
3. Una pagina Kiosk dedicata (`Kiosk.jsx`) per la scansione tramite fotocamera o strumenti di test e la registrazione automatica delle timbrature.
4. Il calcolo automatico delle ore ordinarie e straordinarie al momento del check-out, tenendo conto delle pause configurate e dei contratti di lavoro.

---

## Architettura del Sistema

```text
┌─────────────────────────┐       ┌─────────────────────────┐       ┌─────────────────────────┤
│   Frontend Dipendente   │       │     Backend Laravel     │       │     Dispositivo Kiosk   │
│    (Timesheet React)    │◄─────►│   (API REST & Service   │◄─────►│    (Scanner HTML5 o     │
│                         │       │      Token JWT)         │       │     KioskTest.jsx)      │
└─────────────────────────┘       └─────────────────────────┘       └─────────────────────────┘
            │                                  │                                  │
            ▼                                  ▼                                  ▼
   GET /presenze/{id}/generate-qr     POST /api/presenze/scan-qr         Scansione della stringa QR
   (Aggiornamento ogni 25s)           (Verifica header X-Kiosk-Token)    (Registra ingresso/uscita)
```

---

## Prerequisiti e Regole di Business

Per poter attivare e utilizzare la timbratura con QR Code su una riga del foglio presenze, devono essere soddisfatti i seguenti vincoli validati sia a livello frontend che backend:

- **Tipo di Contratto:** Il dipendente deve essere a tempo pieno (`percentuale_part_time === 100`). I contratti part-time non possono utilizzare la timbratura QR.
- **Causale:** La causale della presenza deve essere tassativamente impostata su `'lavoro'`.
- **Modalità di Lavoro:** La modalità di lavoro deve essere tassativamente `'in_sede'`. Selezionando `'smart_working'` o `'trasferta'`, l'opzione QR Code viene disattivata o nascosta automaticamente.

---

## Flusso Operativo

1. **Attivazione:**
   - Il dipendente accede al proprio timesheet mensile (`Timesheet.jsx`).
   - Seleziona la modalità `in_sede` per il giorno desiderato, rendendo visibile la spunta **QR Code**.
   - Spunta la casella **QR Code**: si apre la modale di configurazione (`ModaleQrSettings`) per impostare o verificare la durata della pausa (`pausa_ore`).
2. **Generazione del Token:**
   - Cliccando su **"Scansiona il QR code"**, l'applicazione richiede un token JWT al backend (`GET /presenze/{id}/generate-qr`). Se la riga non è ancora salvata, viene salvata automaticamente prima di procedere.
   - Il token viene mostrato all'interno di una modale con QR code SVG (`QrCodeModal.jsx`) e resta invariato per la durata configurata, così può essere copiato nel kiosk senza cambiare durante il trasferimento.
3. **Scansione al Kiosk:**
   - Il tablet aziendale in modalità Kiosk (`Kiosk.jsx`) o l'emulatore di test (`KioskTest.jsx`) inquadra e legge la stringa del QR code.
   - Il kiosk invia il token al backend tramite richiesta POST all'endpoint `POST /api/presenze/scan-qr` includendo l'header di sicurezza `X-Kiosk-Token`.
4. **Elaborazione e Registrazione:**
   - Il backend decodifica il token JWT, verifica la validità e l'autorizzazione del kiosk, quindi aggiorna il record:
     - Prima scansione: registra l'orario di ingresso (`ora_ingresso`).
     - Seconda scansione: registra l'orario di uscita (`ora_uscita`) e calcola in automatico le ore lavorate, sottraendo la pausa configurata.

---

## Endpoint API

| Metodo | Endpoint | Autenticazione | Descrizione |
| :--- | :--- | :--- | :--- |
| **GET** | `/presenze/{presenza}/generate-qr` | Bearer Token (Sanctum) | Genera un token JWT QR valido per la durata configurata in `QR_TOKEN_TTL_SECONDS`. |
| **POST** | `/api/presenze/scan-qr` | Header `X-Kiosk-Token` | Elabora la scansione del QR code e registra l'ingresso o l'uscita. |

### Esempi di Richiesta e Risposta

#### Generazione Token (`GET /presenze/{id}/generate-qr`)

**Risposta (200 OK):**

```json
{
  "qr_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Scansione QR Code (`POST /api/presenze/scan-qr`)

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

---

## Configurazione degli Ambienti

### Frontend (`frontend-react/.env` / `.env.example`)

```env
VITE_API_URL=http://localhost:8000/api
VITE_KIOSK_TOKEN=test-kiosk-token # Solo per ambiente di sviluppo
```

### Backend (`backend-php/.env` / `.env.example`)

```env
KIOSK_TOKEN=test-kiosk-token
JWT_SECRET=chiave-segreta-jwt-lunga-almeno-32-caratteri
QR_TOKEN_EXPIRY=30
```

---

## Sviluppo e Testing

1. **Esecuzione dei Test Automatici:**
   Eseguire la suite di test Pest per verificare la logica di calcolo delle ore tramite QR:
  
   ```bash
   cd backend-php
   php artisan test tests/Feature/CalcoloOreQrTest.php
   ```

2. **Test Manuale con Emulazione:**
   - Attivare il flag QR su una riga del timesheet per un dipendente a tempo pieno in sede.
   - Aprire la modale QR e copiare il token.
   - Accedere alla pagina o tool di test Kiosk, incollare il token ed effettuare la simulazione di ingresso/uscita, verificando la corretta registrazione dei campi.

---

## Checklist per la Produzione

- [ ] Rimuovere i componenti di test per lo sviluppo (`frontend-react/src/tools/KioskTest.jsx` e rotte associate).
- [ ] Rimuovere o nascondere i pulsanti per la copia manuale del token nelle modali di produzione.
- [ ] Rimosso `VITE_KIOSK_TOKEN` dalle variabili d'ambiente del frontend.
- [ ] Configurare token Kiosk unici, sicuri e riservati sul backend per ciascun dispositivo fisico.
- [ ] Generare una `JWT_SECRET` complessa (minimo 32 caratteri) nel file `.env` del server di produzione.
- [ ] Abilitare rigorosamente HTTPS per tutte le chiamate API e frontend.
- [ ] Configurare whitelist IP o limiti di frequenza (rate limiting) sull'endpoint `/api/presenze/scan-qr`.
- [ ] Impostare sistemi di logging e monitoraggio per tracciare tentativi di scansione anomali o errori.

---

## Considerazioni sulla Sicurezza

- **Scadenza Configurabile:** I token QR scadono dopo la durata configurata in `QR_TOKEN_TTL_SECONDS` (30 secondi di default).
- **Autenticazione dei Kiosk:** I terminali tablet comunicano tramite token dedicati (`X-Kiosk-Token`) isolati dai token di sessione utente.
- **Validazione Rigida:** Controlli lato server ferrei impediscono la generazione e la scansione di QR code per dipendenti part-time o modalità lavorative non conformi.
