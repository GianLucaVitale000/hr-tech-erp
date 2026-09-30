# Gestione CCNL (Contrattazione Collettiva Nazionale di Lavoro)

## Introduzione e Funzione nell'Economia dell'Applicativo

Il modulo **Gestione CCNL** costituisce il **motore normativo, contrattuale e di conformità giuslavorativa** del sistema **HR Tech ERP**. Nell'economia generale dell'applicativo, questo modulo funge da connettore fondamentale tra il quadro giuridico-regolamentare italiano (legge e contrattazione collettiva) e la gestione operativa quotidiana delle risorse umane (presenze, assenze, stipendi e pianificazione turni).

Il suo scopo principale è tradurre le clausole dei Contratti Collettivi Nazionali di Lavoro (CCNL) in regole di calcolo algoritmiche ed eseguibili, garantendo che ogni dipendente sia associato al corretto trattamento economico, normativo e temporale. Senza questo modulo, il sistema non disporrebbe dei parametri di riferimento per determinare la legalità e la correttezza dei carichi di lavoro, dei monte ore settimanali, dei tassi di maturazione delle ferie/permessi e della soglia di attivazione di ore supplementari e straordinarie.

---

## Piano Giuridico e Normativo

Sul piano giuridico, il modulo acquisisce le principali regole del diritto del lavoro italiano e alcuni importanti parametri definiti dalla contrattazione collettiva per l'esecuzione di alcuni algoritmi di gestione delle risorse umane implementati nel sistema.

1. **Riferimenti Legislativi Principali**:
   - **D.Lgs. n. 66/2003** (attuazione delle direttive europee sull'organizzazione dell'orario di lavoro): Gestione dei limiti massimi dell'orario settimanale, dei riposi giornalieri e settimanali obbligatori (`R1` ed `R2`), e dei periodi di riposo.
   - **D.Lgs. n. 81/2015** (disciplina organica dei contratti di lavoro e revisione delle tipologie contrattuali): Regolamentazione specifica dei contratti a tempo parziale (**Part-Time**), distinzione tra lavoro supplementare e straordinario.
   - **Statuto dei Lavoratori (Legge n. 300/1970)** e successive modifiche in materia di controlli e tutele.

2. **Gerarchia delle Fonti e Gestione dei CCNL Privati vs Pubblici**:
   - Il sistema è progettato primariamente per il settore privato e implementa dunque meccanismi di filtro rigorosi per limitare il flusso dei CCNL messi a disposizione dall banca dati del CNEL (es. esclusione automatica dei contratti afferenti al comparto pubblico gestiti dall'ARAN o enti assimilati)
   - Gestione delle parti firmatarie (organizzazioni sindacali dei lavoratori e associazioni datoriali) memorizzate a livello di metadati contrattuali, con un pratico filtro (checkbox) per includere solo gli accordi in cui sono parte i sindacati comparativamente più rappresentativi sul piano nazionale (ciò equivale a non mostrare in elenco i c.d. "contratti pirata", pure censiti nel database del CNEL e comunque presenti nel database dell'applicativo).

---

## Piano Architetturale e Flusso dei Dati

### 1. Architettura di Persistenza (Database)

Il modulo si basa su tre entità relazionali principali:

- **`contratti`**: Memorizza i dati macro del CCNL (codice CNEL identificativo, titolo-descrizione, ore settimanali teoriche, limiti di straordinario mensile, date di decorrenza/scadenza, parti firmatarie e tipologia di accordo).
- **`dipendenti` / `dipendente_condizioni_contrattuali`**: Associa il singolo lavoratore al rispettivo CCNL, definendo il profilo orario individuale (percentuale part-time, giorni lavorativi, riposi `R1` e `R2`, monte ore personalizzato, ratei maturandi di ferie, permessi/ROL, ex-festività).
- **`presenze`**: Tabella transazionale che registra giornalmente le ore lavorate e le altre causali di assenza legittima, distinguendo tra ore ordinarie ed eccedenti e, in esse, tra straordinarie e supplementari, mostrando le ore di lavoro e le assenze giustificate (ferie, ROL, ex festività, assenze INPS e INAIL).

### 2. Sincronizzazione ed Integrazione con il CNEL

**Il recupero dei dati dal sito istituzionale del CNEL NON avviene in modo automatico o in background.** È richiesto un intervento **manuale da parte dell'amministratore del sistema** per mantenere il database aggiornato. **Non è implementato alcun meccanismo di monitoraggio degli aggiornamenti** del database CNEL.

#### Comando di Sincronizzazione Manuale

Per aggiornare il database con i dati più recenti dal CNEL, l'amministratore deve eseguire il seguente comando Artisan:

```bash
cd /path/to/backend-php
php artisan cnel:sync
```

Questo comando:

- Scarica i dati aggiornati dall'API Open Data del CNEL (`https://archiviocontrattiapi.cnel.it/cne/cne-sa-0002/ricerca-api/ricerca/pubblica/open-data`)
- Sincronizza sia l'**Archivio Corrente** (contratti attualmente vigenti) sia l'**Archivio Storico** (contratti precedenti)
- Esegue automaticamente la pulizia dei contratti ARAN e del pubblico impiego
- Aggiorna i campi specifici estratti dal CNEL (codice, titolo, date, parti firmatarie, tipologia di accordo)

L'amministratore del sistema è responsabile di eseguire regolarmente questo comando per mantenere il database sincronizzato. Se si desidera l'esecuzione automatica periodica, è necessario configurare un sistema esterno (es. cron job).

- **Tipologie di Archivi Sincronizzati**:
  1. **`ARCHIVIO_CORRENTE`**: Contratti collettivi nazionali attualmente vigenti (flag `ultimo_accordo_vigente = true`).
  2. **`ARCHIVIO_STORICO`**: Contratti e accordi precedenti, utili per la storicizzazione delle posizioni lavorative dei dipendenti (flag `ultimo_accordo_vigente = false`). L'utilità di questo archivio risiede nella possibilità di ricostruire, attraverso data si firma dell'accordo e tipologia, le vicende degli accordi e poter tracciare le modifiche normative e le evoluzioni dei trattamenti economici. Tuttavia, i dati di merito non sono qui presenti, devono essere recuperati esternamente all'applicativo.
  
- **Campi Specifici Estratti dal CNEL**:
  - `codiceCcnl` (mappato su `codice_cnel`): Identificativo univoco nazionale del contratto (es. `C011`, `I100`). Sulla base di questo codice, il sistema paghe esterno all'applicativo può recuperare univocamente i dati di merito (es. tabelle retributive, indennità, scatti di anzianità) per il calcolo delle buste paga.
  - `titoloCcnl` / `titolo` (mappato su `nome_contratto`): Denominazione ufficiale del CCNL.
  - `dataDecorrenza` e `dataScadenzaContrattuale`: Finestra temporale di validità ed efficacia giuridica dell'accordo.
  - `partiDatorialiFirmatarie` e `partiSindacaliFirmatarie`: Soggetti stipulanti (salvati in formato JSON).
  - `tipologiaAccordo`: Natura giuridica dell'accordo (es. rinnovo economico, rinnovo normativo, prima adozione). Di solito, alcune tipologie di accordo (es. rinnovi economici) non modificano le regole di calcolo del sistema, ma solo i parametri economici (tabelle retributive, indennità, scatti di anzianità). Altre volte, esistono delle readazioni di testi contrattuali di sintesi, utili per comprendere le modifiche normative e le evoluzioni dei trattamenti economici.
- **Filtraggio e Pulizia Automatica**:
  Durante la sincronizzazione (gestita dal comando Artisan [`SyncCnelContracts.php`](backend-php/app/Console/Commands/SyncCnelContracts.php) e dal seeder [`CnelContractsSeeder.php`](backend-php/database/seeders/CnelContractsSeeder.php)), il sistema esegue:
  - **Scarto del Pubblico Impiego**: Esclusione automatica di tutti i contratti intestati all'ARAN o contenenti parole chiave relative a ministeri, enti locali, sanità pubblica, scuola e forze armate.
  - **Fallback di Sicurezza**: In caso di mancata connettività con le API esterne del CNEL durante il deployment, il sistema assicura la presenza di contratti essenziali di fallback (`C011` Metalmeccanica, `H011` Carburanti, `I100` Commercio) per non compromettere la continuità operativa dell'ERP.

---

## Flussi Operativi e Calcoli Derivati

1. **Gestione Full-Time vs Part-Time**:
   - Per i lavoratori **Full-Time** (`percentuale_part_time = 100%`), le ore eccedenti rispetto al teorico contrattuale configurato costituiscono **lavoro straordinario**.
   - Per i lavoratori **Part-Time** (`percentuale_part_time < 100%`), le ore prestate oltre l'orario ridotto ma entro il limite del Full-Time costituiscono **lavoro supplementare**, regolato da appositi tetti mensili e finestre di verifica per l'eventuale consolidamento.

2. **Maturazione Ratei (Ferie e Permessi)**:
   - Sulla base dei parametri normativi del contratto, inserito nella modale "Regole" per quanto riguarda il monte ore settimanale full time previsto dal CCNL, e della posizione del dipendente, reperibile in anagrafica, anche grazie all'inserimento dei dati di input da parte dell'amministratore, previa disamina dei dati di merito offerti dal CCNL,  il sistema calcola mensilmente i ratei di ferie, permessi ROL ed ex festività, integrandosi con i servizi di calcolo delle presenze e dei residui annuali.

---

## File Chiave del Modulo

| File | Descrizione |
|------|-------------|

| [`backend-php/app/Console/Commands/SyncCnelContracts.php`](backend-php/app/Console/Commands/SyncCnelContracts.php) | Comando Artisan per la sincronizzazione via API con gli archivi CNEL (Corrente e Storico) |
| [`backend-php/database/seeders/CnelContractsSeeder.php`](backend-php/database/seeders/CnelContractsSeeder.php) | Seeder per l'inizializzazione dei contratti dal CNEL e applicazione filtri anti-ARAN |
| [`backend-php/app/Http/Controllers/ContrattoController.php`](backend-php/app/Http/Controllers/ContrattoController.php) | Controller API per la gestione e consultazione dei contratti |
| [`backend-php/app/Models/Contratto.php`](backend-php/app/Models/Contratto.php) | Modello Eloquent per la tabella dei contratti CCNL |
| [`frontend-react/src/pages/Admin/Contratti.jsx`](frontend-react/src/pages/Admin/Contratti.jsx) | Interfaccia utente di amministrazione per la visualizzazione e gestione dei contratti |

## Conclusioni

Questo moduloscolge due funzioni essenziali:

1) determina un identificativo preciso della fonte contrattuale applicabile ai singoli rapporti di lavoro (la c.d. sigla CCNL), che non a caso è condivisa anche dai prospetti paga, a loro volta elaborati da applicativi esterni in base alla stessa fonte normativa. Del resto, monitoraggio delel fonti contrattuali è uno dei compiti istituzionali del CNEL. Inoltre, nelle tabelle e sottotabelle è possibile tracciare una storia contrattuale del settore e delle sue regole di calcolo, frutto di contrattazione politico-sindacale. Questa impostazione strutturale ha una funzione meramente orientativa, un ausilio per la ricerca dei dati di merito all'esterno dell'applicativo;

2) offre la possibilità di inserire dati essenziali al funzionamento degli algoritmi di calcolo implementati nel sistema (l'orario settimanale standard e le eventuali sue deroghe, i ratei di ferie e permessi e le eventuali variazioni di calcolo legate all'anzianità di servizio), che pure sono stati oggetto di contrattazione. La soluzione di assumere l'input dell'amministratore, si è resa necessaria per non dover rinunciare ad implementare vincoli e filtri nei meccanismi delle presenze (ciò anticipa utilmente parte del lavoro poi svolto in sede di elaborazione paghe), per via dell'assenza nel database el CCNL dei relativi elementi di calcolo (i dati di merito sono reperibili solo attraverso la lettura materiale dei testi contrattuali).
