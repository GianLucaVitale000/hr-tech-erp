# AGENTS.md — HR-Tech ERP (monorepo)

**Progetto**: App HR per anagrafica dipendenti, CCNL, presenze, timesheet, approvazioni e export paghe.

**Struttura**:

- [`backend-php/`](backend-php/): API REST Laravel 13, Sanctum, spatie permissions, Eloquent. Fonte di verità dei dati.
- [`frontend-react/`](frontend-react/): React 19 + Vite 8, SPA con routing, QR code, grafici (Recharts), calendari (FullCalendar).
- [`microservice-python/`](microservice-python/): FastAPI + Pandas/OpenPyXL per export Excel mensili.

**Comunicazione** (sviluppo):

- Frontend→backend: `http://localhost:8000/api` (Axios, token Sanctum).
- Frontend→Python: `http://localhost:8001/export/paghe?mese=&anno=`.
- Backend e Python condividono il database MySQL `hr_tech_erp`.

**Database**:

- Lo schema si modifica solo con migrazioni Laravel; Python legge soltanto.
- Se cambi tabelle o colonne usate dall’export, aggiorna le query in microservice-python/services/.
- Non modificare migrazioni già applicate: creane una nuova.
- Niente comandi distruttivi (`php artisan migrate:fresh`, `php artisan db:wipe`) senza approvazione.
- **Dati**: Usa solo dati di test: niente dati reali di dipendenti o paghe in file, test, log o fixture.

**Comandi principali** (esegui nella cartella indicata):

- **Backend** ([`backend-php/`](backend-php/)):
  - `composer setup`: **non eseguirlo**. L'ambiente di sviluppo è già installato e
  il comando rigenera la chiave e lancia `migrate --force` sul database condiviso.
  Eseguilo solo se l'utente lo chiede esplicitamente.
  - `php artisan serve --port=8000`
  - `composer test` (suite completa); singolo test: `php artisan test --compact --filter=NomeTest`
  - `vendor/bin/pint --dirty --format agent`
- **Frontend** ([`frontend-react/`](frontend-react/)): `npm install`, `npm run dev -- --port=5173`, `npm run build`, `npm run lint`, `npm test` (Jest)
- **Python** ([`microservice-python/`](microservice-python/)): `source venv/bin/activate && uvicorn main:app --reload --port=8001`, `./test_export.sh 6 2026`. Nessun linter configurato: non introdurne senza approvazione.

**Convenzioni**:

- **Lingua**: Italiano per commenti, variabili e messaggi; inglese per nomi di classi e metodi.
- **Backend**: `php artisan make:*`, API Resources, named routes, tipi espliciti, test Pest per ogni modifica.
- **Frontend**: componenti funzionali React, AuthContext, servizi API in [`frontend-react/src/services/`](frontend-react/src/services/).
- **Python**: funzioni in [`services/`](microservice-python/services/), accesso DB tramite [`database.py`](microservice-python/database.py), parametri query FastAPI.

**Sicurezza**:

- Frontend↔backend: token Sanctum + ruoli spatie. Usa i controlli di accesso esistenti.
- L'endpoint di export Python **non è protetto** (HTTP semplice, nessuna autenticazione): limite noto dello sviluppo. **Non esporlo fuori da localhost** e non aggiungere dati sensibili alla risposta senza prima introdurre un'autenticazione.
- `firebase/php-jwt`: token JWT per QR code presenze (encode/decode).
- `barryvdh/laravel-dompdf`: genera PDF da HTML (utilizzato in [`PresenzeTableSeeder.php`](backend-php/database/seeders/PresenzeTableSeeder.php) per generare documenti giustificativi fake a partire da viste Blade).
- Non committare mai `.env` né [`dist/`](frontend-react/dist/).

**Da non fare**:

- Non modificare [`backend-php/AGENTS.md`](backend-php/AGENTS.md).
- Non cambiare dipendenze senza approvazione.
- Non eliminare/modificare test esistenti senza approvazione.
- Non creare file di documentazione se non richiesto.
