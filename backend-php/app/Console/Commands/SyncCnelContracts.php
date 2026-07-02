<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\Contratto;
use Carbon\Carbon;

class SyncCnelContracts extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'cnel:sync';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Scarica e sincronizza i contratti collettivi nazionali dal CNEL (Archivio Corrente e Storico)';

    /**
     * Base URL dell'API Open Data del CNEL
     *
     * @var string
     */
    private $baseUrl = 'https://archiviocontrattiapi.cnel.it/cne/cne-sa-0002/ricerca-api/ricerca/pubblica/open-data';

    /**
     * Esegue il comando di sincronizzazione
     *
     * @return int
     */
    public function handle(): int
    {
        $this->info('========================================');
        $this->info('Inizio sincronizzazione contratti CNEL');
        $this->info('========================================');
        
        try {
            // 0. Pulizia automatica dei contratti ARAN esistenti
            $this->info('');
            $this->info('→ Pulizia contratti ARAN esistenti...');
            $deletedCount = $this->cleanAranContracts();
            $this->info("  ✓ Eliminati: {$deletedCount} contratti ARAN");

            // 1. Elaborazione ARCHIVIO CORRENTE
            $this->info('');
            $this->info('→ Sincronizzazione ARCHIVIO CORRENTE...');
            $correnteCount = $this->processArchive('ARCHIVIO_CORRENTE', true);

            // 2. Elaborazione ARCHIVIO STORICO
            $this->info('');
            $this->info('→ Sincronizzazione ARCHIVIO STORICO...');
            $storicoCount = $this->processArchive('ARCHIVIO_STORICO', false);

            $this->info('');
            $this->info('========================================');
            $this->info("Sincronizzazione completata con successo!");
            $this->info("Contratti elaborati:");
            $this->info("  - Eliminati ARAN: {$deletedCount}");
            $this->info("  - Archivio Corrente: {$correnteCount}");
            $this->info("  - Archivio Storico: {$storicoCount}");
            $this->info("  - Totale: " . ($correnteCount + $storicoCount));
            $this->info('========================================');

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error('');
            $this->error('Errore durante la sincronizzazione:');
            $this->error($e->getMessage());
            Log::error('CNEL Sync Error: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }

    /**
     * Elimina i contratti ARAN esistenti dal database
     * Viene eseguito automaticamente all'inizio di ogni sincronizzazione
     *
     * @return int Numero di contratti eliminati
     */
    private function cleanAranContracts(): int
    {
        // Codici CNEL noti di ARAN
        $codiciAranNoti = ['S225', 'S003', 'S125', 'S105', 'S001', 'S002', 'S004', 'S000', 'S025', 'S005', 'S305', 'S205', 'S325'];
        
        // Elimina contratti con ARAN nelle parti firmatarie o nel titolo
        $deleted = Contratto::where(function($query) use ($codiciAranNoti) {
            $query->where('partiDatorialiFirmatarie', 'LIKE', '%ARAN%')
                  ->orWhere('partiSindacaliFirmatarie', 'LIKE', '%ARAN%')
                  ->orWhere('nome_contratto', 'LIKE', '%ARAN%')
                  ->orWhereIn('codice_cnel', $codiciAranNoti);
        })->delete();

        return $deleted;
    }

    /**
     * Elabora un archivio specifico (Corrente o Storico)
     *
     * @param string $type Tipo di archivio (ARCHIVIO_CORRENTE o ARCHIVIO_STORICO)
     * @param bool $isVigente Flag per indicare se i contratti sono vigenti
     * @return int Numero di contratti elaborati
     */
    private function processArchive(string $type, bool $isVigente): int
    {
        $url = $this->baseUrl . '?type=' . $type;
        
        $this->info("  → Richiesta a: {$url}");

        // Effettua la richiesta HTTP GET con timeout esteso
        // Usiamo un approccio più robusto per gestire grandi risposte
        $response = Http::withOptions([
            'timeout' => 300,
            'connect_timeout' => 60,
            'read_timeout' => 300,
            'curl' => [
                78 => 128,  // CURLOPT_BUFFER_SIZE
                20 => 300,  // CURLOPT_LOW_SPEED_TIME
                19 => 1024, // CURLOPT_LOW_SPEED_LIMIT
            ],
        ])->get($url);

        if (!$response->successful()) {
            $status = $response->status();
            $this->error("  ✗ Errore nel download dell'archivio {$type} (HTTP {$status})");
            Log::error("CNEL API Error: {$type} - HTTP {$status}");
            return 0;
        }

        // Parsing della risposta JSON
        $data = $response->json();
        
        if (!isset($data['data']) || !is_array($data['data'])) {
            $this->error("  ✗ Formato risposta non valido per {$type}");
            Log::error("CNEL API Error: Invalid data format for {$type}");
            return 0;
        }

        $contratti = $data['data'];
        $count = 0;
        $skipped = 0;
        $created = 0;
        $updated = 0;

        foreach ($contratti as $item) {
            // Filtra i contratti del settore pubblico
            if ($this->shouldExclude($item)) {
                $skipped++;
                continue;
            }

            // Normalizzazione delle date
            $dataDecorrenza = $this->parseDate($item, 'dataDecorrenza');
            $dataScadenza = $this->parseDate($item, 'dataScadenzaContrattuale');

            // Estrai i valori con fallback
            $codiceCnel = $item['codiceCcnl'] ?? null;
            $nomeContratto = $item['titoloCcnl'] ?? $item['titolo'] ?? 'Contratto senza titolo';

            // Se non c'è il codice CNEL, salta
            if (empty($codiceCnel)) {
                $skipped++;
                continue;
            }

            // Usa updateOrCreate con criterio di univocita su codice_cnel + data_decorrenza
            $contratto = Contratto::updateOrCreate(
                [
                    'codice_cnel' => $codiceCnel,
                    'data_decorrenza' => $dataDecorrenza,
                ],
                [
                    'nome_contratto' => trim($nomeContratto),
                    'data_scadenza' => $dataScadenza,
                    'ultimo_accordo_vigente' => $isVigente,
                    'partiDatorialiFirmatarie' => $item['partiDatorialiFirmatarie'] ? json_encode($item['partiDatorialiFirmatarie']) : null,
                    'partiSindacaliFirmatarie' => $item['partiSindacaliFirmatarie'] ? json_encode($item['partiSindacaliFirmatarie']) : null,
                    'tipologia_contratto' => $item['tipologiaAccordo'] ?? null,
                ]
            );

            if ($contratto->wasRecentlyCreated) {
                $created++;
            } else {
                $updated++;
            }
            $count++;
        }

        $this->info("  ✓ Archivio {$type}: {$count} contratti elaborati");
        $this->info("    - Inseriti: {$created}");
        $this->info("    - Aggiornati: {$updated}");
        $this->info("    - Esclusi: {$skipped}");

        return $count;
    }

    /**
     * Parsing di una data dal JSON CNEL
     *
     * @param array $item Elemento del contratto
     * @param string $field Nome del campo
     * @return string|null Data formattata Y-m-d o null
     */
    private function parseDate(array $item, string $field): ?string
    {
        if (!isset($item[$field]) || empty($item[$field])) {
            return null;
        }

        try {
            return Carbon::parse($item[$field])->format('Y-m-d');
        } catch (\Exception $e) {
            $this->warn("  ⚠ Data non valida per campo {$field}: {$item[$field]}");
            Log::warning("CNEL Date Parse Error: {$field} = {$item[$field]}");
            return null;
        }
    }

    /**
     * Determina se un contratto deve essere escluso (settore pubblico)
     *
     * @param array $item Elemento del contratto
     * @return bool
     */
    private function shouldExclude(array $item): bool
    {
        $titolo = strtoupper($item['titoloCcnl'] ?? $item['titolo'] ?? '');
        $codiceCnel = strtoupper($item['codiceCcnl'] ?? '');

        // Normalizza parti firmatarie per ricerca ARAN
        $partiDatorialiRaw = $item['partiDatorialiFirmatarie'] ?? [];
        $partiSindacaliRaw = $item['partiSindacaliFirmatarie'] ?? [];
        
        // Gestisce sia array che stringa per parti firmatarie
        $partiDatoriali = is_array($partiDatorialiRaw) 
            ? implode('|', array_map('strtoupper', $partiDatorialiRaw)) 
            : strtoupper((string) $partiDatorialiRaw);
        $partiSindacali = is_array($partiSindacaliRaw)
            ? implode('|', array_map('strtoupper', $partiSindacaliRaw))
            : strtoupper((string) $partiSindacaliRaw);

        // ===========================================
        // ESCLUSIONE ARAN (pubblico impiego)
        // ===========================================
        
        // Controlla ARAN in parti firmatarie e titolo (varie forme)
        $aranPatterns = ['ARAN', 'A.R.A.N.', 'AGENZIA PER LA RAPPRESENTAZIONE NEGOZIALE'];
        foreach ($aranPatterns as $pattern) {
            $upperPattern = strtoupper($pattern);
            if (str_contains($partiDatoriali, $upperPattern) || 
                str_contains($partiSindacali, $upperPattern) ||
                str_contains($titolo, $upperPattern)) {
                Log::debug("[ARAN] Escluso per pattern '{$pattern}': {$item['codiceCcnl']}");
                return true;
            }
        }

        // ===========================================
        // ESCLUSIONE SETTORE PUBBLICO (parole chiave)
        // ===========================================
        $paroleEscluse = [
            'MINISTERI', 'MINISTERO',
            'REGIONE', 'REGIONI',
            'PROVINCIA', 'PROVINCE',
            'COMUNE', 'COMUNI',
            'QUADRO',
            'SOLIDARIETA', 'SOLIDARIETÀ',
            'PUBBLICA AMMINISTRAZIONE',
            'PUBBLICO IMPIEGO',
            'ENTE PUBBLICO',
            'PUBBLICHE', 'PUBBLICI',
            'SCUOLA',
            'SANITA', 'SANITÀ',
            'ASL',
            'AZIENDA SANITARIA', 'AZIENDE SANITARIE',
            'UNIVERSITA', 'UNIVERSITÀ',
            'DIFESA',
            'ESERCITO',
            'MARINA',
            'AERONAUTICA',
            'POLIZIA', 'POLIZIA DI STATO',
            'CARABINIERI',
            'VIGILI DEL FUOCO',
            'PUBBLICHE AMMINISTRAZIONI',
            'AMMINISTRAZIONE PUBBLICA',
            'SETTORE PUBBLICO',
            'COMPARTO PUBBLICO',
            'DIPENDENTI PUBBLICI',
            'FUNZIONE PUBBLICA',
        ];

        foreach ($paroleEscluse as $parola) {
            if (str_contains($titolo, $parola)) {
                Log::debug("[PUBBLICO] Escluso per parola chiave '{$parola}': {$item['codiceCcnl']}");
                return true;
            }
        }

        // ===========================================
        // ESCLUSIONE PER CODICE AMBITO
        // ===========================================
        // I contratti privati hanno tipicamente codiceAmbito = 4
        // ARAN e altri enti pubblici hanno codici diversi
        if (isset($item['codiceAmbito'])) {
            $ambito = (string) $item['codiceAmbito'];
            // Se non e' ambito 4 (privato), escludi
            if ($ambito !== '4') {
                Log::debug("[AMBITO] Escluso per codice ambito '{$ambito}': {$item['codiceCcnl']}");
                return true;
            }
        }

        return false;
    }
}
