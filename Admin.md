# Moduli Admin – Moduli di Gestione HR-Tech ERP

Il presente documento descrive i moduli contenuti nella dashboard **Admin** dell'applicativo **HR-Tech ERP**, nella sequenza in cui i dati vengono configurati, raccolti, validati e analizzati:

1. **Utenti e Anagrafica Dipendenti**: chi sono i lavoratori e con quali condizioni contrattuali operano.
2. **Gestione CCNL**: quale contratto collettivo si applica e quali parametri normativi alimentano gli algoritmi.
3. **Approvazione Fogli Ore & Export Paghe**: validazione delle presenze mensili e trasmissione al consulente del lavoro.
4. **AnalisiHR**: cruscotto direzionale di controllo e conformità normativa.

Il modulo di rilevazione delle presenze lato dipendente è descritto in `Timesheet.md`.

---

## Indice

- [Premessa: concetti trasversali](#premessa-concetti-trasversali)
  - [Flusso dei dati tra i moduli](#flusso-dei-dati-tra-i-moduli)
  - [Quadro normativo di riferimento](#quadro-normativo-di-riferimento)
  - [Full-Time e Part-Time: straordinario e supplementare](#full-time-e-part-time-straordinario-e-supplementare)
  - [Giorni di riposo (R1 / R2)](#giorni-di-riposo-r1--r2)
  - [I dati di merito: inserimento manuale a cura dell'Admin](#i-dati-di-merito-inserimento-manuale-a-cura-delladmin)
- [1. Utenti e Anagrafica Dipendenti](#1-utenti-e-anagrafica-dipendenti)
- [2. Gestione CCNL](#2-gestione-ccnl)
- [3. Approvazione Fogli Ore & Export Paghe](#3-approvazione-fogli-ore--export-paghe)
- [4. AnalisiHR](#4-analisihr)

---

## Premessa: concetti trasversali

Alcuni concetti ricorrono in tutti e quattro i moduli. Sono descritti qui una volta sola e richiamati nelle sezioni successive.

### Flusso dei dati tra i moduli

```text
┌──────────────────────┐   ┌──────────────────┐   ┌──────────────────────┐   ┌──────────────┐
│ 1. Utenti e          │   │ 2. Gestione CCNL │   │ Timesheet            │   │ 3. Approva-  │
│    Anagrafica        │──►│  (parametri e    │──►│ (presenze, QR Code)  │──►│ zione Fogli  │
│    Dipendenti        │   │   regole)        │   │                      │   │ Ore          │
└──────────────────────┘   └──────────────────┘   └──────────────────────┘   └──────┬───────┘
                                                                                     │
                                                         ┌───────────────────────────┤
                                                         ▼                           ▼
                                                ┌─────────────────┐       ┌────────────────────┐
                                                │ 4. AnalisiHR    │       │ Export Excel Paghe │
                                                │ (controllo HR)  │       │ (consulente lavoro)│
                                                └─────────────────┘       └────────────────────┘
```

### Quadro normativo di riferimento

- **D.Lgs. n. 66/2003** (attuazione delle direttive europee sull'organizzazione dell'orario di lavoro): limiti massimi dell'orario settimanale, riposi giornalieri e settimanali obbligatori (`R1` ed `R2`) e periodi di riposo.
- **D.Lgs. n. 81/2015** (disciplina organica dei contratti di lavoro): regolamentazione dei contratti a tempo parziale (**Part-Time**) e distinzione tra lavoro supplementare e straordinario; fissa, con i CCNL, i limiti percentuali annui/mensili del supplementare.
- **Statuto dei Lavoratori (Legge n. 300/1970)** e successive modifiche, in materia di controlli e tutele.
- **Art. 2109 c.c.** (insieme al D.Lgs. 66/2003): irrinunciabilità delle ferie, che il modulo AnalisiHR presidia monitorando il corretto smaltimento dei residui.

### Full-Time e Part-Time: straordinario e supplementare

La distinzione, basata sul campo `percentuale_part_time` dell'anagrafica, è applicata da Timesheet, CCNL, Approvazione e AnalisiHR.

| Regime | Condizione | Ore eccedenti | Disciplina |
| :--- | :--- | :--- | :--- |
| **Full-Time** | `percentuale_part_time = 100%` | **Lavoro straordinario**: ore oltre il teorico contrattuale (es. oltre 8 ore giornaliere o 40 settimanali, c.d. tempo pieno) | Maggiorazioni contrattuali specifiche |
| **Part-Time** | `percentuale_part_time < 100%` | **Lavoro supplementare**: ore oltre l'orario ridotto ma entro il limite dell'orario pieno | Tetti mensili/annui di CCNL e legge e finestre di verifica per l'eventuale consolidamento |

### Giorni di riposo (R1 / R2)

- **Full-Time**: i giorni di riposo settimanale sono indicati espressamente in anagrafica (es. sabato e domenica per la settimana corta a 5 giorni), anche in forma personalizzata.
- **Part-Time**: i riposi sono ricavati indirettamente dalla configurazione dell'orario settimanale (giorni a 0 ore). Tale distribuzione deve per legge essere sempre esplicitata nel contratto individuale di assunzione o comunque formalizzata, anche nelle sue modifiche successive.

I giorni di riposo, insieme alle festività nazionali, guidano sia i vincoli del Timesheet sia il calcolo dei giorni teorici lavorabili in AnalisiHR.

### I dati di merito: inserimento manuale a cura dell'Admin

La mappatura del repertorio CNEL non consente di estrarre i **dati di merito** dei contratti collettivi (orari, ratei, scatti di anzianità, tabelle retributive), reperibili solo leggendo materialmente i testi contrattuali. L'applicativo richiede perciò all'Admin / manager HR un **inserimento puntuale e dinamico** dei dati che alimentano gli algoritmi di calcolo, in particolare:

- l'orario settimanale standard a tempo pieno e le sue eventuali deroghe;
- i ratei mensili di ferie, permessi/ROL ed ex-festività;
- le eventuali variazioni di calcolo legate all'anzianità di servizio.

Questa scelta consente di implementare vincoli e filtri nei meccanismi delle presenze, anticipando utilmente parte del lavoro svolto poi in sede di elaborazione paghe. I dati economici (tabelle retributive, indennità, scatti) restano invece fuori dall'applicativo e sono recuperati dal sistema paghe esterno tramite il codice CNEL del contratto.

---

## 1. Utenti e Anagrafica Dipendenti

Il modulo comprende le pagine **Gestione Utenti** e **Anagrafica Dipendenti**. Le scelte di progettazione dei form hanno un impatto diretto sulle dinamiche HR monitorate in **AnalisiHR** e sui vincoli applicati al **Timesheet**.

### 1.1 Posizione strutturale

Le pagine si trovano nel frontend React (`frontend-react/src/pages/Admin/`) e sono supportate da controller e modelli nel backend Laravel (`backend-php/app/Http/Controllers/` e `backend-php/app/Models/`).

- **Gestione Utenti** (`Utenti.jsx`, `NuovoUtente.jsx`, `EditUtente.jsx`):
  - gestisce gli account di accesso al sistema (autenticazione, credenziali, ruoli `admin` o `dipendente`);
  - collega l'utenza di sistema (eventualmente) all'entità anagrafica del dipendente.
- **Anagrafica Dipendenti** (`Dipendenti.jsx`, `NuovoDipendente.jsx`, `EditDipendente.jsx`):
  - gestisce i dati lavorativi, contrattuali e giuslavoristici del personale;
  - interagisce con i modelli relazionali del CCNL applicato (`Contratto`), con le variazioni delle condizioni contrattuali nel tempo (definite a cura del manager HR), con gli orari settimanali (`DipendenteOrarioSettimanale`) e con le regole di calcolo. I dati di merito vanno forniti manualmente (vedi [premessa](#i-dati-di-merito-inserimento-manuale-a-cura-delladmin)): ad esempio l'orario settimanale del tempo pieno, spesso oggetto di contrattazione collettiva, o la quantificazione dei ratei mensili di ferie, permessi/ROL ed ex-festività, essenziali per i contatori di ferie e permessi.

### 1.2 Gestione Utenti

- **Ruolo e credenziali**: l'amministratore può creare, modificare ed eliminare utenti di sistema definendo email, password e ruolo di autorizzazione (tramite il pacchetto di permessi Laravel Spatie).
- **Relazione Utente-Dipendente**: un utente con ruolo `dipendente` viene associato al proprio profilo anagrafico lavorativo, accedendo al portale personale (`/dipendente`) per la dashboard e la compilazione del timesheet.

### 1.3 Anagrafica Dipendenti e form di configurazione

I form di creazione e modifica (`NuovoDipendente.jsx`, `EditDipendente.jsx`) raccolgono i parametri cruciali:

1. **Dati identificativi**: nome, cognome, codice fiscale, mansione e livello. Anche il **sesso** è registrato: serve a stabilire quale dipendente può beneficiare dell'assenza per maternità (c.d. obbligatoria).
2. **Contratto Collettivo (CCNL)**: associazione al contratto nazionale di riferimento (es. codice CNEL), che determina il numero delle ore settimanali ordinarie a tempo pieno e le regole di maturazione di ferie, ROL e permessi (vedi [sezione 2](#2-gestione-ccnl)).
3. **Regime orario (Full-Time / Part-Time)**:
   - percentuale di part-time (`percentuale_part_time`): 100% per Full-Time, o percentuale ridotta (es. 50%, 75%) per Part-Time;
   - giorni lavorativi settimanali (`giorni_lavorativi_settimanali`: tipicamente 5 o 6);
   - ore settimanali teoriche.
4. **Giorni di riposo (R1 / R2)**: definizione dei giorni di riposo settimanale (vedi [premessa](#giorni-di-riposo-r1--r2)).

### 1.4 Informativa privacy e Cookie Policy

I documenti informativi sono disponibili come PDF pubblici, collegati nel footer sia dell'area Admin sia dell'area Dipendente:

- [Informativa privacy dipendenti](frontend-react/public/INFORMATIVA-PRIVACY-DIPENDENTI.pdf);
- [Informativa sull'uso dei cookie e delle tecnologie di archiviazione locale](frontend-react/public/COOKIE-STORAGE-POLICY.pdf).

La disponibilità nel footer garantisce l'accesso permanente all'informazione durante l'utilizzo dell'applicativo. La Cookie Policy ha esclusivamente funzione informativa: non viene sottoscritta dal dipendente e non viene registrata nella procedura descritta di seguito.

#### Registrazione della presa visione dell'informativa privacy

La sottoscrizione della dichiarazione di consegna e presa visione dell'informativa privacy avviene **esternamente all'applicativo**. L'Admin, dopo aver ricevuto e archiviato il documento firmato, registra l'evento dalla pagina **Gestione Utenti**:

1. individua l'utente collegato a un'anagrafica dipendente;
2. seleziona l'azione **Privacy**;
3. compila la modale con:
   - versione dell'informativa;
   - data del documento;
   - data della sottoscrizione;
   - riferimento dell'archivio esterno (ad esempio il codice del fascicolo);
   - eventuali note;
4. conferma di aver acquisito e archiviato la dichiarazione firmata;
5. seleziona **Registra presa visione**.

La registrazione è un'attestazione amministrativa dell'avvenuta acquisizione del documento firmato; non costituisce un nuovo consenso al trattamento dei dati personali e non sostituisce l'archiviazione del documento originale.

Per ogni registrazione vengono conservati:

- dipendente a cui si riferisce l'informativa;
- versione e data del documento;
- data della sottoscrizione;
- modalità e riferimento dell'archiviazione esterna;
- eventuali note;
- Admin che ha registrato l'evento e data della registrazione.

Lo storico è mantenuto per consentire la ricostruzione delle versioni consegnate nel tempo. La colonna **Privacy** nella tabella di Gestione Utenti indica se esiste almeno una registrazione per l'anagrafica dipendente:

- **Acquisita**: è presente una registrazione;
- **Da acquisire**: non è ancora presente alcuna registrazione;
- **—**: l'utente non è associato a un'anagrafica dipendente.

La funzione è disponibile soltanto agli utenti con ruolo Admin. Per renderla operativa è necessario applicare la migrazione Laravel che crea la tabella `privacy_acknowledgments`; il file `backend-php/database/database.sql` contiene la relativa definizione per gli aggiornamenti manuali dello schema.

### 1.5 Impatto delle scelte di form su AnalisiHR e Timesheet

#### Impatto su AnalisiHR

I parametri anagrafici sono utilizzati direttamente dagli algoritmi del modulo [AnalisiHR](#4-analisihr):

- **Calcolo dei giorni teorici lavorabili**: i giorni di riposo (`R1`/`R2`, ovvero gli orari settimanali a 0 ore per i part-time) determinano quali giorni dell'anno solare vengono esclusi dal computo teorico lavorabile.
- **Distinzione straordinari / ore supplementari**: la percentuale di part-time e le ore contrattuali definite in anagrafica consentono di distinguere correttamente tra lavoro straordinario (Full-Time) e supplementare (Part-Time), verificando anche la continuità temporale su finestre di mesi consecutivi.
- **Monitoraggio assenze e ratei**: l'associazione al CCNL e la data di assunzione definiscono i ratei maturandi di ferie e permessi (che la contrattazione collettiva talvolta quantifica in funzione dell'anzianità di servizio), confrontati con i dati storici e i residui.
- **Maternità**: il sesso del dipendente stabilisce chi può beneficiare dell'assenza per maternità obbligatoria.

#### Vincoli applicati al Timesheet

La struttura rigida e parametrizzata dei form anagrafici si riflette direttamente sul modulo di inserimento presenze:

- **Campi e causali vincolate**: il timesheet non permette inserimenti liberi non controllati, ma adatta i campi visibili e le convalide al regime orario configurato in anagrafica (es. blocco o evidenziazione delle ore eccedenti per i part-time, validazione delle ore ordinarie giornaliere rispetto al divisore contrattuale).
- **Controllo di riposi e festività**: le giornate configurate come riposo in anagrafica o corrispondenti a festività nazionali (calcolate con l'algoritmo di Gauss) risultano protette o vincolate nel foglio presenze, impedendo l'inserimento errato di ore ordinarie in giorni non lavorativi (c.d. mancato riposo) e garantendo la conformità al D.Lgs. 66/2003 sull'orario di lavoro e sui riposi minimi.

---

## 2. Gestione CCNL

### 2.1 Funzione nell'economia dell'applicativo

Il modulo **Gestione CCNL** è il **motore normativo, contrattuale e di conformità giuslavorativa** del sistema. Funge da connettore fondamentale tra il quadro giuridico-regolamentare italiano (legge e contrattazione collettiva) e la gestione operativa quotidiana delle risorse umane (presenze, assenze, stipendi e pianificazione turni).

Il suo scopo è tradurre le clausole dei Contratti Collettivi Nazionali di Lavoro in regole di calcolo algoritmiche ed eseguibili, garantendo che ogni dipendente sia associato al corretto trattamento economico, normativo e temporale. Senza questo modulo il sistema non disporrebbe dei parametri di riferimento per determinare la legalità e la correttezza dei carichi di lavoro, dei monte ore settimanali, dei tassi di maturazione di ferie e permessi e della soglia di attivazione di ore supplementari e straordinarie.

### 2.2 Piano giuridico: gerarchia delle fonti

Per i riferimenti legislativi si rimanda al [quadro normativo di riferimento](#quadro-normativo-di-riferimento). Il modulo acquisisce le principali regole del diritto del lavoro italiano e alcuni parametri definiti dalla contrattazione collettiva per eseguire gli algoritmi di gestione delle risorse umane.

- **CCNL privati vs pubblici**: il sistema è progettato primariamente per il settore privato e applica filtri rigorosi per limitare i CCNL provenienti dalla banca dati del CNEL (es. esclusione automatica dei contratti del comparto pubblico gestiti dall'ARAN o da enti assimilati).
- **Parti firmatarie**: organizzazioni sindacali dei lavoratori e associazioni datoriali sono memorizzate nei metadati contrattuali. Un filtro (checkbox) permette di includere solo gli accordi sottoscritti dai sindacati comparativamente più rappresentativi sul piano nazionale. Ciò equivale a non mostrare in elenco i c.d. "contratti pirata", che restano comunque censiti nel database del CNEL e presenti nel database dell'applicativo.

### 2.3 Architettura di persistenza

Il modulo si basa su tre entità relazionali principali:

- **`contratti`**: dati macro del CCNL (codice CNEL identificativo, titolo-descrizione, ore settimanali teoriche, limiti di straordinario mensile, date di decorrenza/scadenza, parti firmatarie, tipologia di accordo).
- **`dipendenti` / `dipendente_condizioni_contrattuali`**: associa il singolo lavoratore al rispettivo CCNL, definendo il profilo orario individuale (percentuale part-time, giorni lavorativi, riposi `R1` e `R2`, monte ore personalizzato, ratei maturandi di ferie, permessi/ROL, ex-festività).
- **`presenze`**: tabella transazionale che registra giornalmente le ore lavorate e le altre causali di assenza legittima (ferie, ROL, ex festività, assenze INPS e INAIL), distinguendo tra ore ordinarie ed eccedenti e, tra queste, tra straordinarie e supplementari.

### 2.4 Sincronizzazione con il CNEL

**Il recupero dei dati dal sito istituzionale del CNEL NON avviene in modo automatico o in background.** È richiesto un intervento **manuale da parte dell'amministratore del sistema**. **Non è implementato alcun meccanismo di monitoraggio degli aggiornamenti** del database CNEL.

#### Comando di sincronizzazione manuale

```bash
cd /path/to/backend-php
php artisan cnel:sync
```

Il comando:

- scarica i dati aggiornati dall'API Open Data del CNEL (`https://archiviocontrattiapi.cnel.it/cne/cne-sa-0002/ricerca-api/ricerca/pubblica/open-data`);
- sincronizza sia l'**Archivio Corrente** (contratti attualmente vigenti) sia l'**Archivio Storico** (contratti precedenti);
- esegue automaticamente la pulizia dei contratti ARAN e del pubblico impiego;
- aggiorna i campi specifici estratti dal CNEL (codice, titolo, date, parti firmatarie, tipologia di accordo).

L'amministratore è responsabile dell'esecuzione periodica del comando. Per l'esecuzione automatica è necessario configurare un sistema esterno (es. cron job).

#### Tipologie di archivi sincronizzati

1. **`ARCHIVIO_CORRENTE`**: contratti collettivi nazionali attualmente vigenti (flag `ultimo_accordo_vigente = true`).
2. **`ARCHIVIO_STORICO`**: contratti e accordi precedenti (flag `ultimo_accordo_vigente = false`), utili per la storicizzazione delle posizioni lavorative dei dipendenti. Attraverso data di firma e tipologia dell'accordo è possibile ricostruirne le vicende e tracciare le modifiche normative e le evoluzioni dei trattamenti economici. I dati di merito non sono però presenti e vanno recuperati fuori dall'applicativo.

#### Campi specifici estratti dal CNEL

- `codiceCcnl` (mappato su `codice_cnel`): identificativo univoco nazionale del contratto (es. `C011`, `I100`). Su questo codice il sistema paghe esterno può recuperare univocamente i dati di merito (tabelle retributive, indennità, scatti di anzianità) per il calcolo delle buste paga.
- `titoloCcnl` / `titolo` (mappato su `nome_contratto`): denominazione ufficiale del CCNL.
- `dataDecorrenza` e `dataScadenzaContrattuale`: finestra temporale di validità ed efficacia giuridica dell'accordo.
- `partiDatorialiFirmatarie` e `partiSindacaliFirmatarie`: soggetti stipulanti (salvati in formato JSON).
- `tipologiaAccordo`: natura giuridica dell'accordo (es. rinnovo economico, rinnovo normativo, prima adozione). Di solito alcune tipologie (es. rinnovi economici) non modificano le regole di calcolo del sistema, ma solo i parametri economici. In altri casi esistono redazioni di testi contrattuali di sintesi, utili per comprendere le modifiche normative e le evoluzioni dei trattamenti economici.

#### Filtraggio e pulizia automatica

Durante la sincronizzazione (comando Artisan [`SyncCnelContracts.php`](backend-php/app/Console/Commands/SyncCnelContracts.php) e seeder [`CnelContractsSeeder.php`](backend-php/database/seeders/CnelContractsSeeder.php)) il sistema esegue:

- **Scarto del pubblico impiego**: esclusione automatica di tutti i contratti intestati all'ARAN o contenenti parole chiave relative a ministeri, enti locali, sanità pubblica, scuola e forze armate.
- **Fallback di sicurezza**: in caso di mancata connettività con le API del CNEL durante il deployment, il sistema assicura la presenza di contratti essenziali (`C011` Metalmeccanica, `H011` Terziario/Commercio, `I100` Logistica) per non compromettere la continuità operativa dell'ERP.

### 2.5 Flussi operativi e calcoli derivati

- **Full-Time vs Part-Time**: la distinzione tra straordinario e supplementare è descritta nella [premessa](#full-time-e-part-time-straordinario-e-supplementare).
- **Maturazione dei ratei (ferie e permessi)**: il sistema calcola mensilmente i ratei di ferie, permessi ROL ed ex-festività, integrandosi con i servizi di calcolo delle presenze e dei residui annuali. Si basa sui parametri normativi inseriti dall'amministratore nella modale "Regole" (monte ore settimanale full-time previsto dal CCNL) e sulla posizione del dipendente in anagrafica, previa disamina dei dati di merito offerti dal CCNL.

### 2.6 File chiave del modulo

| File | Descrizione |
| :--- | :--- |
| [`backend-php/app/Console/Commands/SyncCnelContracts.php`](backend-php/app/Console/Commands/SyncCnelContracts.php) | Comando Artisan per la sincronizzazione via API con gli archivi CNEL (Corrente e Storico) |
| [`backend-php/database/seeders/CnelContractsSeeder.php`](backend-php/database/seeders/CnelContractsSeeder.php) | Seeder per l'inizializzazione dei contratti dal CNEL e applicazione dei filtri anti-ARAN |
| [`backend-php/app/Http/Controllers/ContrattoController.php`](backend-php/app/Http/Controllers/ContrattoController.php) | Controller API per la gestione e consultazione dei contratti |
| [`backend-php/app/Models/Contratto.php`](backend-php/app/Models/Contratto.php) | Modello Eloquent per la tabella dei contratti CCNL |
| [`frontend-react/src/pages/Admin/Contratti.jsx`](frontend-react/src/pages/Admin/Contratti.jsx) | Interfaccia di amministrazione per la visualizzazione e gestione dei contratti |

### 2.7 Conclusioni

Il modulo svolge due funzioni essenziali:

1. **Identifica la fonte contrattuale** applicabile ai singoli rapporti di lavoro (la c.d. sigla CCNL), condivisa anche dai prospetti paga elaborati da applicativi esterni in base alla stessa fonte normativa. Del resto il monitoraggio delle fonti contrattuali è uno dei compiti istituzionali del CNEL. Nelle tabelle e sottotabelle è inoltre possibile tracciare una storia contrattuale del settore e delle sue regole di calcolo, frutto di contrattazione politico-sindacale. Questa impostazione ha funzione meramente orientativa: è un ausilio per la ricerca dei dati di merito all'esterno dell'applicativo.
2. **Raccoglie i dati essenziali agli algoritmi di calcolo** (orario settimanale standard e relative deroghe, ratei di ferie e permessi, variazioni legate all'anzianità di servizio), anch'essi oggetto di contrattazione. L'input dell'amministratore è necessario per non rinunciare a vincoli e filtri nei meccanismi delle presenze, data l'assenza nel database del CNEL degli elementi di calcolo (vedi [premessa](#i-dati-di-merito-inserimento-manuale-a-cura-delladmin)).

---

## 3. Approvazione Fogli Ore & Export Paghe

### 3.1 Panoramica

Il modulo **Approvazione Fogli Ore** permette agli utenti con ruolo **Amministratore (Admin)** di monitorare, verificare, approvare o rifiutare le presenze mensili registrate dai dipendenti tramite il Timesheet. È il ponte fondamentale tra la raccolta giornaliera delle presenze (timbrature QR, inserimenti manuali, causali di assenza) e il ciclo di elaborazione delle paghe mensili. Il **Microservizio Python** annesso genera l'export Excel dei dati di presenza per il consulente del lavoro o altro soggetto esterno incaricato delle paghe.

### 3.2 Ciclo di vita delle presenze

1. **Inserimento (`bozza`)**: durante il mese il dipendente compila o registra presenze e ore lavorative, oppure il sistema acquisisce le timbrature QR. Le presenze sono modificabili.
2. **Invio mensile (`inviato` o `reinviato`)**: alla fine del mese o del periodo di riferimento il dipendente (o il sistema in automatico) invia il foglio ore per l'approvazione, che passa a `inviato`. Se l'amministratore lo rifiuta, il dipendente può correggerlo e reinviarlo (`reinviato`).
3. **Approvazione Admin (`approvato`)**: l'amministratore accede alla schermata di gestione (`frontend-react/src/pages/Admin/Approvazioni.jsx`), filtra per dipendente, mese, anno o stato e approva il blocco mensile. **Solo le presenze `approvato` sono incluse negli export ufficiali per le paghe.**

### 3.3 Meccanismo di approvazione

L'interfaccia offre una panoramica tabellare e a card (responsive per dispositivi mobili) che aggrega le presenze per dipendente e per mese/anno, mostrando:

- Totale giorni lavorati
- Ore ordinarie
- Ore eccedenti / supplementari
- Ore straordinarie
- Stato corrente (*Da approvare*, *Da approvare (Reinviato)*, *Approvato*)

L'amministratore può visualizzare il dettaglio giornaliero di ogni dipendente (`/admin/approvazioni/{dipendente_id}/{mese}/{anno}`) e modificare o confermare lo stato dell'intero mese tramite le API dedicate del backend PHP.

### 3.4 Ruolo del backend PHP

Il `PresenzaController` (`backend-php/app/Http/Controllers/PresenzaController.php`) gestisce la logica di business e l'interfaccia API:

- **Gestione e calcolo di timbrature/presenze**: endpoint per registrare, calcolare e aggiornare ore lavorate, ordinarie, straordinarie e causali di assenza.
- **Gestione del ciclo di stato**: `inviaMese` gestisce l'invio mensile da parte dei dipendenti (stati `inviato` e `reinviato` dopo un rifiuto); `aggiornaStatoMese` gestisce la revisione degli amministratori (approvare, rifiutare o reinviare i fogli ore).
- **Aggregazione e dashboard Admin**: gli endpoint `inAttesa` e `mesiApprovati` raggruppano i record mensili dei dipendenti con i relativi totali (giorni, ore ordinarie, straordinarie, ecc.) mostrati in `Approvazioni.jsx`.
- **Persistenza e validazione**: salva e aggiorna i dati sul database relazionale MySQL, garantendo che solo i mesi `approvato` siano validi per l'export verso il microservizio Python.

### 3.5 Microservizio Python per l'export Excel paghe

Una volta approvati i fogli ore del mese (`stato = 'approvato'`), l'amministratore può generare l'export ufficiale in formato Excel (`.xlsx`). Il microservizio è in **Python** (`microservice-python/`) con **FastAPI**, **Pandas** e **OpenPyXL**.

#### Architettura e funzionamento

- **Endpoint FastAPI**: `/export/paghe` (`microservice-python/main.py`), con parametri `mese` e `anno`.
- **Query al database**: si collega direttamente a MySQL (`microservice-python/database.py`) estraendo esclusivamente i record con `p.stato = 'approvato'` per il periodo selezionato.
- **Elaborazione e calcoli** (`microservice-python/services/excel_exporter.py`):
  - **Foglio di riepilogo**: una riga per dipendente con dati anagrafici e contrattuali (Codice Fiscale, IBAN, Data Assunzione, CCNL applicato, Livello, Mansione, Percentuale Part-Time) e riepilogo mensile delle ore suddivise per:
    - Ore Ordinarie
    - Ore Supplementari / Eccedenti
    - Ore Straordinarie
    - Causali di assenza (Ferie, Permessi ROL, Permessi Retribuiti/Non Retribuiti, Malattia, Infortunio, Maternità, Sciopero, Cassa Integrazione).
  - **Foglio di dettaglio giornaliero**: riga per riga la singola giornata di lavoro, la modalità (In sede, Smart Working, Trasferta), i codici paga standardizzati (`MAPPA_CODICI_PAGHE`, come `ORD`, `FER`, `ROL`, `MAL`, ecc.) e i link ipertestuali cliccabili verso i giustificativi allegati nel cloud storage (es. certificati di malattia o giustificativi di trasferta).

#### Interazione Frontend-Backend-Microservizio

1. L'utente clicca su uno dei bottoni di export nella pagina di approvazione (`📊 Export Excel Paghe (Mese Corrente)` o l'export specifico per i mesi approvati).
2. Il frontend React invia una richiesta HTTP al microservizio Python (`http://localhost:8001/export/paghe?mese=M&anno=A`).
3. Il microservizio genera dinamicamente il file Excel in memoria (`BytesIO`) e lo restituisce come `StreamingResponse` con intestazione `attachment; filename=paghe_M_A.xlsx`, avviando il download automatico nel browser dell'amministratore.

### 3.6 File di riferimento

- **Frontend React**: [`frontend-react/src/pages/Admin/Approvazioni.jsx`](frontend-react/src/pages/Admin/Approvazioni.jsx)
- **Backend PHP**: [`backend-php/app/Http/Controllers/PresenzaController.php`](backend-php/app/Http/Controllers/PresenzaController.php)
- **Microservizio Python**:
  - [`microservice-python/main.py`](microservice-python/main.py)
  - [`microservice-python/services/excel_exporter.py`](microservice-python/services/excel_exporter.py)

---

## 4. AnalisiHR

Il modulo **AnalisiHR** (`frontend-react/src/pages/Admin/AnalisiHR.jsx`) è il cruscotto di controllo direzionale e di conformità normativa per la direzione risorse umane. Implementa algoritmi giuslavoristici conformi al diritto del lavoro italiano e alla contrattazione collettiva (CCNL).

### 4.1 Ruolo nella gestione HR aziendale

- **Monitoraggio e prevenzione dell'assenteismo (Card Tasso di Assenza Individuale)**: analisi avanzata del tasso di assenza individuale, scomposizione per causali (malattia, infortunio, permessi retribuiti/non retribuiti, CIG, maternità) e correlazione statistica con i giorni festivi o di riposo settimanale (es. identificazione di episodi di "malattia breve" a ponte tra fine settimana e festività).
- **Analisi dell'utilizzo dei giustificativi di assenza (Card PR, PNR, CIG, Sindacale / Modalità di lavoro)**: rilevazione degli episodi di fruizione di permessi retribuiti e non retribuiti e di altre modalità lecite di assenza dalla prestazione effettiva (esercizio dei diritti sindacali, cassa integrazione), per monitorare l'incidenza di tali strumenti sull'andamento dei ritmi della produzione aziendale. Tracciatura mensile delle modalità di lavoro in presenza, in smart working o in trasferta, a scopi statistici interni e funzionali a razionalizzare le principali decisioni aziendali di business.
- **Controllo del lavoro straordinario e supplementare**: rilevazione analitica del tempo eccedente l'orario ordinario (supplementare per i part-time, straordinario per i full-time; vedi [premessa](#full-time-e-part-time-straordinario-e-supplementare)). Per il part-time si presta particolare attenzione alle dinamiche di stabilizzazione temporale: secondo giurisprudenza e contrattazione collettiva, l'utilizzo continuativo del supplementare può ingenerare la necessità di consolidare tali ore (c.d. adeguamento contrattuale) e di adeguare i relativi istituti contrattuali. Il modulo monitora perciò tale utilizzo sull'asse temporale.
- **Gestione e residuo di ferie e permessi**: valutazione dell'accumulo e del godimento dei ratei annuali e dei residui storici di ferie, permessi/ROL ed ex-festività, nel rispetto del principio costituzionale e legale di irrinunciabilità delle ferie (art. 2109 c.c. e D.Lgs. 66/2003) e del corretto smaltimento del residuo nei tempi previsti.

### 4.2 Posizione strutturale

La separazione è netta tra backend (servizi API Laravel) e frontend (componenti React).

**Backend (PHP / Laravel)**:

- [`backend-php/app/Http/Controllers/PresenzaController.php`](backend-php/app/Http/Controllers/PresenzaController.php): gestione delle presenze, dei fogli presenze mensili e del calcolo dei residui.
- [`backend-php/app/Services/PermessiFerieService.php`](backend-php/app/Services/PermessiFerieService.php): calcolo e maturazione dei ratei di ferie e permessi.

**Frontend (React / Vite)**:

- [`frontend-react/src/pages/Admin/AnalisiHR.jsx`](frontend-react/src/pages/Admin/AnalisiHR.jsx): pagina principale di amministrazione per l'analisi HR.
- [`frontend-react/src/hooks/useAnalisiHRData.js`](frontend-react/src/hooks/useAnalisiHRData.js): custom hook che gestisce lo stato, il fetch asincrono dei dati mensili di presenze e ferie per l'intero anno solare e l'aggregazione dei dati.
- [`frontend-react/src/utils/analisiHRUtils.js`](frontend-react/src/utils/analisiHRUtils.js): utilità con gli algoritmi di calcolo giuslavoristico (festività, giorni teorici lavorabili, compensazione ore supplementari/straordinarie, medie di periodo).

**Componenti Widget e Card**:

| Componente | Funzione |
| :--- | :--- |
| [`AnalisiHRSelection.jsx`](frontend-react/src/components/Admin/AnalisiHR/AnalisiHRSelection.jsx) | Selezione del dipendente e dell'anno di riferimento (select personalizzata in funzione della data di assunzione del dipendente) |
| [`AnalisiHRWidgets.jsx`](frontend-react/src/components/Admin/AnalisiHR/AnalisiHRWidgets.jsx) | Indicatori sintetici annuali: ore ordinarie; straordinarie/eccedenti (per il part-time include il regime supplementare, fino a concorrenza del tempo pieno); ferie/permessi (ROL ed ex-festività); PR/PNR (con causali composite e senza causale specifica, ma comunque definibili come assenze legittimate dal datore di lavoro); INPS/INAIL (malattia, infortunio, maternità); CIG; sindacali in senso lato (assemblee sindacali, astensione lavorativa per sciopero) |
| [`TassoAssenzaCard.jsx`](frontend-react/src/components/Admin/AnalisiHR/TassoAssenzaCard.jsx) | Analisi del tasso di assenza e dei pattern di assenteismo |
| [`PermessiLavoroCard.jsx`](frontend-react/src/components/Admin/AnalisiHR/PermessiLavoroCard.jsx) | Disaggregazione delle causali di assenza legittima e delle modalità lavorative della causale lavoro (in sede, smart working, trasferta) |
| [`FeriePermessiCard.jsx`](frontend-react/src/components/Admin/AnalisiHR/FeriePermessiCard.jsx) | Monitoraggio di ferie e permessi maturati/goduti/residui |
| [`OreExtraordinarieCard.jsx`](frontend-react/src/components/Admin/AnalisiHR/OreExtraordinarieCard.jsx) | Grafici e analisi delle ore supplementari/straordinarie con controllo della continuità temporale (es. su finestre mobili di 3 o più mesi) |

### 4.3 Algoritmi e dinamiche giuslavoristiche

Gli algoritmi implementati in [`analisiHRUtils.js`](frontend-react/src/utils/analisiHRUtils.js) e [`useAnalisiHRData.js`](frontend-react/src/hooks/useAnalisiHRData.js) rispondono a specifici istituti del diritto del lavoro italiano e della contrattazione collettiva.

#### A. Giorni teorici lavorabili, festività e riposi settimanali

- **Algoritmo di Gauss**: calcolo dinamico della data di Pasqua e della conseguente festività di Pasquetta per qualsiasi anno solare.
- **Esclusione di festività e riposi (R1/R2)**: [`calcolaGiorniTeoriciLavorabili`](frontend-react/src/utils/analisiHRUtils.js:49) sottrae dal calendario solare sia i giorni di riposo settimanale configurati in anagrafica (vedi [premessa](#giorni-di-riposo-r1--r2)) sia le festività nazionali civili e religiose che cadono in giorni lavorativi, secondo lo schema previsto per legge e contrattazione collettiva. Restituisce il numero di giorni teorici lavorabili per ciascun mese e per l'intero anno solare, tenendo conto delle specificità contrattuali del dipendente (distribuzione del lavoro settimanale su 5 o 6 giorni).

#### B. Ore supplementari e straordinarie (compensazione intra-mese)

[`calcolaSupplementariEStraordinarieMensili`](frontend-react/src/utils/analisiHRUtils.js:71) calcola l'effettiva prestazione lavorativa, anche oltre l'orario concordato, confrontandola con il dovuto giornaliero e settimanale. Tiene conto delle compensazioni tra giorni con deficit di orario e giorni con eccedenza all'interno dello stesso ciclo mensile/settimanale. La qualificazione delle ore eccedenti (straordinario per i Full-Time, supplementare per i Part-Time, con i relativi limiti previsti da CCNL e D.Lgs. 81/2015) segue le regole della [premessa](#full-time-e-part-time-straordinario-e-supplementare).

#### C. Continuità delle ore supplementari (finestre temporali)

[`calcolaMediaSupplementari`](frontend-react/src/utils/analisiHRUtils.js:169) verifica la presenza di prestazioni supplementari continuative su finestre configurabili di mesi consecutivi (es. 3 o più). L'analisi è fondamentale per intercettare i casi in cui il lavoratore part-time svolge sistematicamente ore supplementari: la contrattazione collettiva collega spesso questo evento al diritto di consolidamento parziale o totale dell'orario o alla rideterminazione della base retributiva.

#### D. Anomalie di assenteismo (malattie brevi e ponti)

L'algoritmo di rilevazione traccia la distribuzione degli eventi sulla ricorrenza settimanale, contribuendo a identificare episodi di malattia o infortunio breve (di durata inferiore o uguale a 3 giorni) collocati immediatamente a ridosso di giorni non lavorativi (festività o riposi settimanali R1/R2). Questo indicatore statistico supporta il dipartimento HR nell'individuazione di potenziali fenomeni di assenteismo strategico ("fenomeno del ponte").
