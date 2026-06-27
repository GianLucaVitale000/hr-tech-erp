<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\Contratto;
use Carbon\Carbon;

class CnelContractsSeeder extends Seeder
{
    private $baseUrl = 'https://archiviocontrattiapi.cnel.it/cne/cne-sa-0002/ricerca-api/ricerca/pubblica/open-data';

    public function run(): void
    {
        $this->command->info('Inizio seeding contratti CNEL...');

        try {
            // Processa archivio corrente
            $this->command->info('Processazione Archivio Corrente...');
            $this->processArchive('ARCHIVIO_CORRENTE', true);

            // Processa archivio storico
            $this->command->info('Processazione Archivio Storico...');
            $this->processArchive('ARCHIVIO_STORICO', false);

            $this->command->info('Seeding completato con successo!');
        } catch (\Exception $e) {
            $this->command->error('Errore durante il seeding: ' . $e->getMessage());
            Log::error('CNEL Seeder Error: ' . $e->getMessage());
        }
    }

    private function processArchive(string $type, bool $isVigente): void
    {
        $url = $this->baseUrl . '?type=' . $type;
        $this->command->info("  → Richiesta a: {$url}");

        // Effettua la richiesta HTTP GET con timeout esteso
        $response = Http::timeout(120)->get($url);

        if (!$response->successful()) {
            $status = $response->status();
            $this->command->error("  ✗ Errore nel download dell'archivio {$type} (HTTP {$status})");
            Log::error("CNEL API Error: {$type} - HTTP {$status}");
            return;
        }

        // Parsing della risposta JSON
        $data = $response->json();

        if (!isset($data['data']) || !is_array($data['data'])) {
            $this->command->error("  ✗ Formato risposta non valido per {$type}");
            Log::error("CNEL API Error: Invalid data format for {$type}");
            return;
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
                ]
            );

            if ($contratto->wasRecentlyCreated) {
                $created++;
            } else {
                $updated++;
            }
            $count++;
        }

        $this->command->info("  ✓ Archivio {$type}: {$count} contratti elaborati");
        $this->command->info("    - Inseriti: {$created}");
        $this->command->info("    - Aggiornati: {$updated}");
        $this->command->info("    - Esclusi: {$skipped}");
    }

    private function parseDate(array $item, string $field): ?string
    {
        if (!isset($item[$field]) || empty($item[$field])) {
            return null;
        }

        try {
            return Carbon::parse($item[$field])->format('Y-m-d');
        } catch (\Exception $e) {
            $this->command->warn("  ⚠ Data non valida per campo {$field}: {$item[$field]}");
            Log::warning("CNEL Date Parse Error: {$field} = {$item[$field]}");
            return null;
        }
    }

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

        // Esclusione per codice ambito (i contratti privati hanno tipicamente codiceAmbito = 4)
        if (isset($item['codiceAmbito']) && $item['codiceAmbito'] != '4') {
            return true;
        }

        return false;
    }
}
