# Sistema di Rilevazione Presenze con QR Code

## Sommario

- [Panoramica](#panoramica)
- [Architettura del Sistema](#architettura-del-sistema)
- [Flusso Dettagliato](#flusso-dettagliato)
- [Componenti Frontend](#componenti-frontend)
- [API Backend](#api-backend)
- [Configurazione Ambienti](#configurazione-ambienti)
- [Passaggio da Sviluppo a Produzione](#passaggio-da-sviluppo-a-produzione)
- [Sicurezza](#sicurezza)
- [Testing e Debugging](#testing-e-debugging)

---

## Panoramica

Il sistema di rilevazione presenze con QR Code consente ai dipendenti di timbrare l'ingresso e l'uscita in modo automatico e sicuro tramite codici QR generati dinamicamente.

**Obiettivi:**

- Eliminare gli errori manuali nell'inserimento delle ore
- Garantire la tracciabilita delle timbrature
- Fornire un'esperienza utente semplice e intuitiva
- Mantenere un alto livello di sicurezza attraverso token temporanei

---

## Architettura del Sistema

```text
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
│      DIPENDENTE          │     │        BACKEND           │     │        KIOSK             │
│   (Frontend React)       │◄───►│      (Laravel API)        │◄───►│     (Tablet Android)     │
└─────────────────────────┘     └─────────────────────────┘     └─────────────────────────┘
           │                              │                              │
           ▼                              ▼                              ▼
    ┌──────────────┐               ┌──────────────┐               ┌──────────────┐
    │ Timesheet.jsx │──────────────►│ GET /presenze/│               │ Lettore QR   │
    │               │               │ {id}/generate-│               │ Code         │
    │ - Attiva QR   │               │ qr           │               │              │
    │ - Salva riga  │               └──────────────┘               │ Scansiona    │
    │ - Genera QR   │               ┌──────────────┐               │ Token        │
    └──────────────┘               │ POST /api/   │◄──────────────┘
           │                       │ presenze/    │
           ▼                       │ scan-qr      │
    ┌──────────────┐               └──────────────┘
    │QrCodeModal.jsx│
    │ - Visualizza  │
    │   QR Code     │
    │ - Countdown   │
    │ - Auto-refresh│
    └──────────────┘
```

---

## Flusso Dettagliato

### 1. Attivazione QR Code (Lato Dipendente)

**Pre-requisiti per attivare il QR Code:**

- Dipendente deve essere full-time (`percentuale_part_time === 100`)
- Causale deve essere `lavoro`
- Modalita di lavoro deve essere `in_sede`

**Processo:**

1. Il dipendente accede al foglio presenze (`Timesheet.jsx`)
2. Seleziona un giorno e imposta causale = `lavoro`, modalita = `in_sede`
3. Il checkbox **USA QR** diventa disponibile
4. Il dipendente attiva il checkbox **USA QR**
5. Il dipendente salva la riga (pulsante **Salva**)

**Stato della riga dopo il salvataggio:**

- `usa_qr: true`
- `fonte_dato: "QR_CODE"`

**Nota:** Se la riga non ha ancora un ID, il sistema la salva automaticamente prima di generare il QR Code.

---

### 2. Generazione Token JWT

**Trigger:** Clic sul pulsante **QR** nella riga con `usa_qr = true`

**Frontend (`Timesheet.jsx` - `handleGenerateQr`):**

```javascript
const handleGenerateQr = async (dataStr) => {
  const riga = getRiga(dataStr)
  let presenzaId = riga.id
  
  // Se la riga non ha ID, salvala automaticamente
  if (!presenzaId) {
    const payload = {
      dipendente_id: dipendente.id,
      data: dataStr,
      ore_ordinarie: 0,
      ore_straordinarie: 0,
      ore_eccedenti: 0,
      ore_causale: 0,
      causale: riga.causale || 'lavoro',
      modalita_lavoro: riga.modalita_lavoro || 'in_sede',
      usa_qr: true,
      pausa_ore: riga.pausa_ore || 0,
      fonte_dato: 'QR_CODE',
    }
    const response = await salvaPresenza(payload)
    presenzaId = response.data.id
  }
  
  // Genera token QR
  const token = await generateQrToken(presenzaId)
  setQrToken(token)
  setSelectedPresence(getRiga(dataStr))
  setShowQrModal(true)
  
  // Auto-refresh ogni 25 secondi
  const interval = setInterval(async () => {
    const currentRiga = getRiga(dataStr)
    if (currentRiga.ora_ingresso && currentRiga.ora_uscita) {
      clearInterval(interval)
      setShowQrModal(false)
      return
    }
    const newToken = await generateQrToken(presenzaId)
    setQrToken(newToken)
  }, 25000)
}
```

**Service (`presenzeService.js` - `generateQrToken`):**

```javascript
export const generateQrToken = async (presenzaId) => {
  const response = await api.get(`/presenze/${presenzaId}/generate-qr`)
  return response.data.qr_token
}
```

**Backend (Laravel):**

- Endpoint: `GET /presenze/{presenzaId}/generate-qr`
- Genera token JWT con payload: `{presenza_id, dipendente_id, exp}`
- Scadenza: 30 secondi
- Restituisce: `{ qr_token: "eyJhbGci..." }`

---

### 3. Visualizzazione Modale QR Code

**Componente:** `QrCodeModal.jsx`

**Funzionalita:**

- Visualizza QR Code con il token JWT
- Countdown da 30 secondi con auto-chiusura alla scadenza
- Auto-refresh del token ogni 25 secondi
- Si ferma automaticamente se la presenza e completata (entrata e uscita registrate)
- Campo testo con il token per copia manuale (per testing)
- Pulsante **Copia Token** per clipboard
- Chiusura: pulsante **Chiudi**, tastiera ESC, click fuori dalla modale

---

### 4. Scansione al Kiosk

**Dispositivo Kiosk (Tablet Android):**

- App dedicata con lettore QR Code integrato
- Token Kiosk fisso per autenticazione (configurato in ogni dispositivo)

**Service (`presenzeService.js` - `scanQrCode`):**

```javascript
export const scanQrCode = async (qrToken, kioskToken) => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/api/presenze/scan-qr`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Kiosk-Token': kioskToken,
    },
    body: JSON.stringify({ qr_token: qrToken }),
  })
  return response.json()
}
```

---

### 5. Validazione e Registrazione (Backend)

**Backend esegue:**

1. Verifica token JWT (firma, scadenza)
2. Autorizzazione kiosk (header `X-Kiosk-Token`)
3. Recupero presenza dal database
4. Registrazione timbratura:
   - Se `ora_ingresso` e NULL: registra `ora_ingresso`
   - Se `ora_ingresso` valorizzato e `ora_uscita` NULL: registra `ora_uscita`
   - Se entrambi valorizzati: errore
5. Calcolo automatico ore (sottrae pausa, divide in ordinarie/straordinarie)
6. Imposta `fonte_dato: "QR_CODE"`

---

### 6. Visualizzazione Risultato (Dipendente)

Quando il dipendente ricarica il foglio presenze:

- Le ore sono calcolate automaticamente dal backend
- I campi ore sono disabilitati (solo lettura) quando `fonte_dato === "QR_CODE"`
- Viene mostrato lo stato: **Ingresso: 08:00:00** o **Completato**

---

## Componenti Frontend

### Timesheet.jsx

**Funzioni chiave:**

- Gestione flag `usa_qr`
- `handleGenerateQr(dataStr)`: Genera token, auto-salva riga se necessario, apre modale
- Auto-refresh token ogni 25s, si ferma se presenza completata

**Proprieta riga:**

```javascript
{
  id: 123,
  usa_qr: true,
  ora_ingresso: "08:00:00",  // NULL se non registrato
  ora_uscita: "17:00:00",   // NULL se non registrato
  pausa_ore: 1,
  fonte_dato: "QR_CODE",
  causale: "lavoro",
  modalita_lavoro: "in_sede"
}
```

---

### QrCodeModal.jsx

**Props:**

| Prop | Tipo | Descrizione |
| ------ | ------ | ------------- |
| `qrToken` | string | Token JWT |
| `presence` | object | Oggetto presenza |
| `onClose` | function | Callback chiusura |

---

### KioskTest.jsx (Solo Sviluppo)

Emulatore per testing. **Da rimuovere in produzione**.

---

## API Backend

### Endpoint

| Metodo | Endpoint | Autenticazione |
| -------- | ---------- | ---------------- |
| GET | `/presenze/{presenzaId}/generate-qr` | Bearer Token |
| POST | `/api/presenze/scan-qr` | Header `X-Kiosk-Token` |

### generate-qr (GET)

**Request:**

``` text
GET /presenze/123/generate-qr
Headers: Authorization: Bearer <token>
```

**Response:**

```json
{ "qr_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

### scan-qr (POST)

**Request:**

```text
POST /api/presenze/scan-qr
Headers:
  Content-Type: application/json
  X-Kiosk-Token: <kiosk_token>
Body: { "qr_token": "..." }
```

**Response (Successo):**

```json
{
  "success": true,
  "message": "Ingresso registrato con successo!",
  "data": { "ora_ingresso": "08:00:00", "ore": 8.5, "ore_ordinarie": 8, "ore_straordinarie": 0.5 }
}
```

**Response (Errore):**

```json
{ "success": false, "error": "Token scaduto" }
```

---

## Configurazione Ambienti

### Frontend

**Sviluppo:**

```bash
VITE_API_URL=http://localhost:8000/api
VITE_KIOSK_TOKEN=test-kiosk-token
```

**Produzione:**

```bash
VITE_API_URL=https://api.hr-tech-erp.it/api
# VITE_KIOSK_TOKEN NON DEVE ESISTERE
```

### Backend

**Sviluppo:**

```bash
KIOSK_TOKEN=test-kiosk-token
JWT_SECRET=development-secret-key-change-in-production
QR_TOKEN_EXPIRY=30
```

**Produzione:**

```bash
KIOSK_TOKEN=secure-production-kiosk-token-change-regularly
JWT_SECRET=complex-production-secret-at-least-32-characters-long
QR_TOKEN_EXPIRY=30
```

---

## Passaggio da Sviluppo a Produzione

### 1. Rimuovere KioskTest.jsx

- Rimuovere file: `src/tools/KioskTest.jsx`
- Rimuovere da App.jsx:

  ```diff
  - import KioskTest from './tools/KioskTest'
  - <Route path="/kiosk-test" element={<KioskTest />} />
  ```

---

### 2. Rimuovere pulsante "Copia Token" dalla modale QR

**Sviluppo:**

- Pulsante **Copia Token** visibile in `QrCodeModal.jsx` per facilitare testing con KioskTest

**Produzione:**

- **Rimuovere** il pulsante "Copia Token" da `QrCodeModal.jsx` (righe 75-110)
- Oppure nasconderlo condizionalmente:

  ```javascript
  {import.meta.env.MODE === 'development' && (
    <button onClick={...}>Copia Token</button>
  )}
  ```

- **Motivazione:** In produzione KioskTest non esiste e il token non deve essere copiabile manualmente

---

### 3. Token Kiosk

- **Rimuovere** `VITE_KIOSK_TOKEN` dal frontend
- Configurare **solo backend**: `KIOSK_TOKEN=` in `.env`
- Token univoco per ogni tablet

### 3. Sicurezza JWT

- Generare chiave complessa (min 32 char):

  ```bash
  openssl rand -base64 32
  ```

- Non committare nel repository

### 4. URL API

- Usare HTTPS in produzione

### 5. Dispositivi Kiosk

- App Android dedicata con token univoco

### 6. Sicurezza Aggiuntiva (Consigliata)

- IP Whitelisting per `/api/presenze/scan-qr`
- Rate Limiting: max 10 richieste/minuto
- Logging: registrare tutte le timbrature
- Monitoraggio: alert per errori ripetuti

### Checklist Pre-Produzione

- [ ] KioskTest.jsx rimosso
- [ ] Route `/kiosk-test` rimossa
- [ ] Pulsante "Copia Token" rimosso da QrCodeModal.jsx
- [ ] `VITE_KIOSK_TOKEN` rimosso da frontend
- [ ] `KIOSK_TOKEN` configurato solo backend
- [ ] `JWT_SECRET` sicuro
- [ ] URL API con HTTPS
- [ ] CORS configurato
- [ ] Token univoci per ogni dispositivo
- [ ] Test completi in staging
- [ ] Backup database

---

## Sicurezza

### Minacce

| Minaccia | Mitigazione |
| ---------- | ------------- |
| Token JWT rubato | Scadenza 30s |
| Token Kiosk compromesso | Token univoci, rotazione periodica |
| Replay Attack | Token scadenti |
| Man-in-the-middle | HTTPS |
| Brute Force | Rate limiting |

### Best Practice

1. Never trust the client
2. Minimo privilegio
3. Defense in depth
4. Audit trail

---

## Testing e Debugging

### Emulazione in Sviluppo

1. Attivare QR su una riga
2. Cliccare **QR** per aprire modale
3. Cliccare **Copia Token**
4. Aprire KioskTest (`/kiosk-test`)
5. Incollare token e cliccare **INGRESSO** o **USCITA**
6. Verificare:
   - `ora_ingresso`/`ora_uscita` registrati
   - `fonte_dato` = "QR_CODE"
   - Ore calcolate

### Problemi Comuni

| Problema | Soluzione |
| ---------- | ----------- |
| QR non si aggiorna | Verificare `presenza_id` valorizzato |
| Token scaduto | Controllare `QR_TOKEN_EXPIRY` |
| Scan fallisce 401 | Verificare `X-Kiosk-Token` |
| Scan fallisce 400 | Generare nuovo QR |
| Ore non calcolate | Completare timbratura |

---

Documentazione aggiornata al 24/07/2026
