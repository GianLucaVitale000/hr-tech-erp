# Modulo di Autenticazione e Login - HR-Tech ERP

Questo documento presenta le caratteristiche tecniche, architetturali e funzionali del modulo di **Login e Autenticazione** implementato nell'applicazione **HR-Tech ERP**.

Il sistema adotta un'architettura **Full-Stack Separata** basata su un backend **Laravel 13** con API REST e autenticazione tramite **Laravel Sanctum**, e un frontend **React 19** (Vite) con gestione dello stato globale tramite Context API e routing protetto.

---

## 1. Architettura del Backend (Laravel)

Il backend gestisce l'autenticazione tramite lo [`AuthController.php`](backend-php/app/Http/Controllers/AuthController.php) e l'ecosistema Laravel Sanctum per l'emissione e la convalida dei token d'accesso.

### 1.1 Endpoint API Principali (`routes/api.php`)

* **`POST /api/login`**: Effettua il login dell'utente validando le credenziali (`email`, `password` e `remember_me`). In caso di successo, il backend invia il token Sanctum esclusivamente nell'header `Set-Cookie` come cookie `auth_token` `HttpOnly`, `SameSite=Strict` e con durata di sessione o 30 giorni.
* **`POST /api/logout`**: Revoca il token corrente associato alla richiesta autenticata e distrugge il cookie `auth_token`.
* **`GET /api/me`**: Restituisce le informazioni dettagliate dell'utente autenticato (ID, nome, email, ruolo).
* **`GET /api/users`**: Elenco degli utenti di sistema (protetto da ruoli/permessi).

### 1.2 Implementazione del Controller (`AuthController.php`)

Il controller esegue la validazione dei dati in ingresso e usa la guardia web di Laravel senza persistere una sessione server:

* **Credenziali non valide**: Restituisce una risposta HTTP `401 Unauthorized` con il messaggio `"Credenziali non valide"`.
* **Credenziali valide**: Crea un token Sanctum (`plainTextToken`), lo invia nel cookie `HttpOnly` e restituisce solo i metadati dell'utente e il ruolo associato (tramite il pacchetto di permessi e ruoli `spatie/laravel-permission`).

---

## 2. Architettura del Frontend (React & Vite)

Il frontend gestisce l'interfaccia utente, l'esperienza di autenticazione e la protezione delle rotte attraverso componenti dedicati situati in [`frontend-react/src/pages/Auth/Login.jsx`](frontend-react/src/pages/Auth/Login.jsx) e nei contesti globali (`AuthContext`).

### 2.1 Caratteristiche della User Experience (UX) e della User Interface (UI)

* **Animazione Splash Screen Iniziale**: Durante il caricamento iniziale della pagina di login, viene mostrata una schermata di benvenuto con logo animato (`login-splash`) che scompare gradualmente tramite transizione CSS prima di rivelare il form di autenticazione vero e proprio.
* **Funzionalità "Ricordami" (`Remember Me`)**: Determina esclusivamente la durata del cookie `HttpOnly`; non viene memorizzata nel browser dal frontend.
* **Visualizzazione Password Interattiva**: Un pulsante integrato nel campo password permette di alternare la visibilità del testo in chiaro o mascherato.
* **Pulizia Rapida dell'Email**: Pulsante a scomparsa rapida per svuotare il campo di input dell'email.
* **Gestione degli Errori**: Messaggi di errore reattivi in caso di credenziali errate o problemi di connessione.

### 2.2 Gestione dello Stato e Rotte Protette

* **`AuthContext` (`frontend-react/src/context/AuthContext.jsx`)**: Gestisce in memoria lo stato globale dell'utente autenticato. Al caricamento interroga `/api/me`; il token non è accessibile a JavaScript e non viene salvato in `localStorage`.
* **`ProtectedRoute` (`frontend-react/src/components/ProtectedRoute.jsx`)**: Intercetta i tentativi di navigazione verso le aree protette (`/admin` o `/dipendente`) verificando l'autenticazione e il ruolo utente, effettuando il reindirizzamento automatico (`navigate`) in base al profilo (`admin` o `dipendente`).

---

## 3. Sicurezza e Controllo Accessi

* **Token-Based Auth**: Utilizzo di **Laravel Sanctum** per garantire sessioni API sicure senza la complessità di OAuth2 completo, ideale per SPA (Single Page Applications).
* **Controllo dei Ruoli (RBAC)**: Integrazione con `Spatie Permission` per distinguere l'accesso alle funzionalità amministrative rispetto a quelle dedicate ai dipendenti.
* **Sanificazione e Validazione**: Validazione rigorosa sia lato client (attributi HTML5 e controlli React) sia lato backend (validatore Laravel per formato email e campi obbligatori).

---

## 4. Struttura dei File del Modulo

* **Backend**:
  * [`backend-php/app/Http/Controllers/AuthController.php`](backend-php/app/Http/Controllers/AuthController.php)
  * [`backend-php/routes/api.php`](backend-php/routes/api.php)
  * [`backend-php/app/Models/User.php`](backend-php/app/Models/User.php)
* **Frontend**:
  * [`frontend-react/src/pages/Auth/Login.jsx`](frontend-react/src/pages/Auth/Login.jsx)
  * [`frontend-react/src/styles/login.css`](frontend-react/src/styles/login.css)
  * [`frontend-react/src/context/AuthContext.jsx`](frontend-react/src/context/AuthContext.jsx)
  * [`frontend-react/src/components/ProtectedRoute.jsx`](frontend-react/src/components/ProtectedRoute.jsx)
  * [`frontend-react/src/services/api.js`](frontend-react/src/services/api.js)
