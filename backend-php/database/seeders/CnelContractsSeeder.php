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
            // Pulizia automatica dei contratti ARAN esistenti
            $this->command->info('Pulizia contratti ARAN esistenti...');
            $deletedCount = $this->cleanAranContracts();
            $this->command->info("  ✓ Eliminati: {$deletedCount} contratti ARAN");

            // Processa archivio corrente
            $this->command->info('Processazione Archivio Corrente...');
            $this->processArchive('ARCHIVIO_CORRENTE', true);

            // Processa archivio storico
            $this->command->info('Processazione Archivio Storico...');
            $this->processArchive('ARCHIVIO_STORICO', false);

            $this->ensureEssentialContracts();

            $this->command->info('Seeding completato con successo!');
        } catch (\Exception $e) {
            $this->command->error('Errore durante il seeding: ' . $e->getMessage());
            Log::error('CNEL Seeder Error: ' . $e->getMessage());
            // Anche in caso di errore di rete, assicurati che i contratti essenziali siano presenti
            $this->ensureEssentialContracts();
        }
    }

    private function ensureEssentialContracts(): void
    {
        $essentials = [
            ['codice_cnel' => 'C011', 'nome_contratto' => 'Contratto Metalmeccanica Industria', 'ore_settimanali_teoriche' => 40.00],
            ['codice_cnel' => 'H011', 'nome_contratto' => 'Contratto Distributori Carburante', 'ore_settimanali_teoriche' => 40.00],
            ['codice_cnel' => 'I100', 'nome_contratto' => 'CCNL logistica, trasporto merci e spedizione (personale non dirigente)', 'ore_settimanali_teoriche' => 40.00],
        ];

        foreach ($essentials as $item) {
            Contratto::updateOrCreate(
                ['codice_cnel' => $item['codice_cnel']],
                [
                    'nome_contratto' => $item['nome_contratto'],
                    'ore_settimanali_teoriche' => $item['ore_settimanali_teoriche'],
                    'data_decorrenza' => '2020-01-01',
                    'ultimo_accordo_vigente' => true,
                ]
            );
        }
    }

    /**
     * Elimina i contratti ARAN esistenti dal database
     * Viene eseguito automaticamente all'inizio del seeding
     *
     * @return int Numero di contratti eliminati
     */
    private function cleanAranContracts(): int
    {
        // Codici CNEL noti di ARAN
        $codiciAranNoti = ['S225', 'S003', 'S125', 'S105', 'S001', 'S002', 'S004', 'S000', 'S025', 'S005', 'S305', 'S205', 'S325'];
        
        // Elimina contratti con ARAN nelle parti firmatarie o nel titolo
        $deleted = \App\Models\Contratto::where(function($query) use ($codiciAranNoti) {
            $query->where('partiDatorialiFirmatarie', 'LIKE', '%ARAN%')
                  ->orWhere('partiSindacaliFirmatarie', 'LIKE', '%ARAN%')
                  ->orWhere('nome_contratto', 'LIKE', '%ARAN%')
                  ->orWhereIn('codice_cnel', $codiciAranNoti);
        })->delete();

        return $deleted;
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
