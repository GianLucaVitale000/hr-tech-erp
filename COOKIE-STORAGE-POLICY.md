# COOKIE & STORAGE POLICY

## Informativa sull'uso dei cookie e delle tecnologie di archiviazione locale (Web Storage)

**Versione:** [INSERIRE VERSIONE DEL DOCUMENTO]  
**Data di aggiornamento:** [INSERIRE DATA]  
**Applicativo:** HR-Tech ERP  
**Titolare del trattamento:** [NOME AZIENDA / TITOLARE DEL TRATTAMENTO]

### 1. Cosa sono i cookie e il Web Storage

I cookie e gli strumenti di Web Storage, come il `localStorage`, sono
informazioni di piccole dimensioni che i siti e le applicazioni web possono
memorizzare nel browser dell'utente e utilizzare nelle successive richieste o
sessioni di lavoro.

### 2. Strumenti utilizzati da questo applicativo

L'applicativo di gestione presenze **HR-Tech ERP** utilizza
esclusivamente strumenti tecnici di prima parte, necessari per:

- autenticare l'utente;
- proteggere e fornire le funzionalità richieste;
- memorizzare la preferenza visuale dell'interfaccia.

L'applicativo, nella configurazione attuale, **non utilizza**:

- cookie di profilazione o tracciamento commerciale;
- cookie pubblicitari o di marketing;
- cookie analitici;
- strumenti di analytics di terze parti;
- tecnologie di tracciamento comportamentale.

### 3. Dettaglio delle tecnologie impiegate

#### A. Cookie tecnico di autenticazione

- **Denominazione:** `auth_token`
- **Natura:** cookie tecnico di prima parte.
- **Tecnologia di autenticazione:** token Sanctum.
- **Finalità:** mantenere l'autenticazione dell'utente e autorizzare le
  chiamate API protette effettuate dal browser.
- **HttpOnly:** attivo. Il valore del cookie non è accessibile agli script
  JavaScript del browser.
- **SameSite:** `Strict`.
- **Secure:** attivo in produzione o quando la configurazione
  `SESSION_SECURE_COOKIE=true` è impostata. In ambiente locale HTTP può essere
  disattivato per consentire lo sviluppo.
- **Percorso:** `/`.

Il frontend non legge direttamente il valore del cookie. Il browser lo invia
automaticamente alle richieste autorizzate e il backend lo utilizza per
validare l'utente tramite Sanctum.

##### Durata e scadenza

- **Accesso standard:** cookie di sessione, senza una scadenza persistente;
  viene normalmente eliminato alla chiusura del browser.
- **Opzione “Ricordami”:** cookie persistente con durata di **30 giorni**.
- **Logout:** il backend revoca il token Sanctum associato e invia
  l'istruzione di eliminazione del cookie.
- **Scadenza del token persistente:** il token Sanctum associato alla modalità
  “Ricordami” ha una scadenza di 30 giorni.

#### B. Archiviazione locale (LocalStorage)

- **Chiave:** `theme`
- **Natura:** elemento di Web Storage locale di prima parte.
- **Finalità:** memorizzare la preferenza visuale dell'interfaccia.
- **Valori utilizzati:** `light` oppure `dark`.
- **Dati contenuti:** esclusivamente la preferenza relativa al tema grafico;
  non contiene token, dati identificativi, dati anagrafici, ruoli o
  informazioni di autenticazione.
- **Durata:** rimane nel browser fino alla cancellazione manuale dello
  storage/cache o alla modifica della preferenza dall'interfaccia.

L'applicativo non salva nel `localStorage` le chiavi `auth_token`, `user` o
`remember_me`.

Le informazioni dell'utente autenticato vengono mantenute solo nella memoria
volatile dell'applicazione frontend e recuperate dal backend tramite l'endpoint autenticato `/api/me` quando l'applicazione viene caricata o ricaricata.

### 4. Base giuridica ed eventuale esenzione dal consenso

La configurazione attuale utilizza esclusivamente strumenti tecnici necessari
all'autenticazione, alla sicurezza e all'erogazione delle funzionalità
richieste dall'applicativo.

Tali strumenti non sono utilizzati per profilazione, pubblicità, marketing o
analisi comportamentale. In base alla configurazione attuale e alla finalità
tecnica degli strumenti, non viene previsto un banner di consenso preventivo
per i cookie tecnici e per il `localStorage` utilizzato per la preferenza del
tema.

La valutazione giuridica definitiva deve essere verificata dal Titolare del
trattamento in relazione al contesto organizzativo, alle modalità effettive di
utilizzo e a eventuali integrazioni future.

### 5. Gestione tramite le impostazioni del browser

L'utente può verificare, eliminare o disabilitare cookie e dati di
`localStorage` tramite le impostazioni del proprio browser.

La disabilitazione dei cookie tecnici di autenticazione impedisce il corretto
funzionamento dell'applicativo, l'accesso alle aree protette e l'esecuzione
delle procedure di rilevazione presenze.

Per maggiori informazioni sulla gestione di cookie e Web Storage:

- [Google Chrome](https://support.google.com/chrome/answer/95647)
- [Mozilla Firefox](https://support.mozilla.org/it/kb/Gestione%20dei%20cookie)
- [Microsoft Edge](https://support.microsoft.com/it-it/microsoft-edge/eliminare-i-cookie-in-microsoft-edge-6394120f-500e-44f0-b459-05f0e072e2db)
- [Apple Safari](https://support.apple.com/it-it/guide/safari/sfri11471/mac)

### 6. Contatti

Per qualsiasi chiarimento relativo alla presente policy, è possibile
contattare il Titolare del trattamento:

- **Titolare:** [NOME AZIENDA / TITOLARE DEL TRATTAMENTO]
- **Email privacy:** [EMAIL DEDICATA PRIVACY]
- **Indirizzo:** [INDIRIZZO DEL TITOLARE, SE NECESSARIO]

### 7. Modifiche alla policy

La presente informativa potrà essere aggiornata in caso di modifiche
all'architettura dell'applicativo, all'uso dei cookie o delle tecnologie di
archiviazione locale, oppure alla normativa applicabile.
