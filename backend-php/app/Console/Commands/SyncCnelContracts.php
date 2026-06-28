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
        
        // Parole chiave per escludere il settore pubblico
        $paroleEscluse = [
            'MINISTERI', 'MINISTERO',
            'REGIONE', 'REGIONI',
            'PROVINCIA', 'PROVINCE',
            'COMUNE', 'COMUNI',
            'QUADRO',
            'SOLIDARIETA',
            'SOLIDARIETÀ',
            'PUBBLICA AMMINISTRAZIONE',
            'PUBBLICO IMPIEGO',
            'ENTE PUBBLICO',
            'PUBBLICHE',
            'PUBBLICI',
            'SCUOLA',
            'SANITA',
            'SANITÀ',
            'ASL',
            'AZIENDA SANITARIA',
            'UNIVERSITA',
            'UNIVERSITÀ',
            'DIFESA',
            'ESERCITO',
            'MARINA',
            'AERONAUTICA',
            'POLIZIA',
            'CARABINIERI',
            'VIGILI DEL FUOCO',
        ];

        foreach ($paroleEscluse as $parola) {
            if (str_contains($titolo, $parola)) {
                return true;
            }
        }

        // Esclusione per codice ambito (se il pubblico ha un ambito specifico)
        // I contratti privati hanno tipicamente codiceAmbito = 4
        if (isset($item['codiceAmbito']) && $item['codiceAmbito'] != '4') {
            return true;
        }

        return false;
    }
}
