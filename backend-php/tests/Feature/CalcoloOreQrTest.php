<?php

namespace Tests\Feature;

use App\Models\Dipendente;
use App\Models\Presenza;
use App\Models\DipendenteOrarioSettimanale;
use Carbon\Carbon;
use Firebase\JWT\JWT;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Test per il calcolo delle ore da timbrature QR Code
 * Scenario: 08:00-18:00 con 1 ora di pausa su un giorno con 8 ore previste
 * Risultato atteso: 8 ore ordinarie + 1 ora straordinaria
 */
class CalcoloOreQrTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Crea un dipendente full-time con orario standard 8 ore al giorno
     */
    protected function createFullTimeDipendente(): Dipendente
    {
        // Crea prima un user
        $user = \App\Models\User::create([
            'name' => 'Test User',
            'email' => 'test.user@example.com',
            'password' => bcrypt('password'),
        ]);

        $dipendente = Dipendente::create([
            'user_id' => $user->id,
            'nome' => 'Test Dipendente',
            'cognome' => 'FullTime',
            'email' => 'test.fulltime@example.com',
            'password' => bcrypt('password'),
            'percentuale_part_time' => 100,
            'tipo_contratto' => 'indeterminato',
            'data_scadenza_contratto' => null,
        ]);

        // Crea orari settimanali: 8 ore per Lunedì-Venerdì
        foreach ([1, 2, 3, 4, 5] as $giornoSettimana) { // 1=Lun, 5=Ven
            DipendenteOrarioSettimanale::create([
                'dipendente_id' => $dipendente->id,
                'giorno_settimana' => $giornoSettimana,
                'ore_giornaliere_previste' => 8,
            ]);
        }

        return $dipendente;
    }

    /**
     * Genera un token JWT valido per una presenza
     */
    protected function generateQrToken(Presenza $presenza): string
    {
        // Usa il tempo reale del server (non mockato) per il token JWT
        // con expiration molto lunga per i test
        $payload = [
            'presenza_id' => $presenza->id,
            'dipendente_id' => $presenza->dipendente_id,
            'data' => $presenza->data,
            'exp' => time() + 3600, // 1 ora di validità in timestamp Unix
        ];

        return JWT::encode($payload, config('app.key'), 'HS256');
    }

    /**
     * Test principale: 08:00-18:00 con 1 ora di pausa = 8 ordinarie + 1 straordinaria
     */
    public function test_calcolo_ore_qr_10_ore_lavorate_1_pausa_8_ordinarie_1_straordinaria()
    {
        $dipendente = $this->createFullTimeDipendente();

        // Crea una presenza per oggi (deve essere un giorno lavorativo con 8 ore previste)
        $data = Carbon::today()->dayOfWeek >= 1 && Carbon::today()->dayOfWeek <= 5 
            ? Carbon::today() 
            : Carbon::today()->next(Carbon::MONDAY); // Se oggi è weekend, usa il prossimo lunedì

        $presenza = Presenza::create([
            'dipendente_id' => $dipendente->id,
            'data' => $data->toDateString(),
            'causale' => 'lavoro',
            'modalita_lavoro' => 'in_sede',
            'usa_qr' => true,
            'pausa_ore' => 1,
            'fonte_dato' => 'QR_CODE',
            'ore_ordinarie' => 0,
            'ore_straordinarie' => 0,
            'ore_eccedenti' => 0,
            'ore_causale' => 0,
        ]);

        // Prima timbratura: ingresso alle 08:00
        $token = $this->generateQrToken($presenza);
        
        // Mock del tempo corrente a 08:00:00
        Carbon::setTestNow(Carbon::parse($data->toDateString() . ' 08:00:00'));
        
        $response = $this->withHeader('X-Kiosk-Token', config('app.kiosk_token', 'tablet_kiosk_secret_token_12345'))->postJson('/api/presenze/scan-qr', [
            'qr_token' => $token,
        ], ['KIOSK_TOKEN' => config('app.kiosk_token', 'tablet_kiosk_secret_token_12345')]);

        $response->assertStatus(200);
        $this->assertEquals('Ingresso registrato alle 08:00:00', $response['message']);

        // Ricarica la presenza per avere l'ora di ingresso
        $presenza->refresh();
        dump('After first scan - ora_ingresso: ' . $presenza->ora_ingresso);
        dump('pausa_ore: ' . $presenza->pausa_ore);
        dump('Ore previste per giorno: ' . $dipendente->getOrePrevistePerGiorno(
            Carbon::parse($presenza->data)->dayOfWeek
        ));
        $this->assertEquals('08:00:00', $presenza->ora_ingresso);

        // Seconda timbratura: uscita alle 18:00 (10 ore dopo)
        Carbon::setTestNow(Carbon::parse($data->toDateString() . ' 18:00:00'));
        
        $token = $this->generateQrToken($presenza);
        $response = $this->withHeader('X-Kiosk-Token', config('app.kiosk_token', 'tablet_kiosk_secret_token_12345'))->postJson('/api/presenze/scan-qr', [
            'qr_token' => $token,
        ]);

        $response->assertStatus(200);
        
        // Debug: dump response
        dump($response->getContent());
        
        $response->assertJson([
            'message' => 'Uscita registrata alle 18:00:00',
            'ore' => 9.0,  // 10 ore - 1 pausa = 9 ore nette
            'ore_ordinarie' => 8.0,  // 8 ore ordinarie (max previste)
            'ore_straordinarie' => 1.0,  // 1 ora straordinaria
        ]);

        // Verifica finale nel database
        $presenza->refresh();
        dump('ora_ingresso: ' . $presenza->ora_ingresso);
        dump('ora_uscita: ' . $presenza->ora_uscita);
        $this->assertEquals('08:00:00', $presenza->ora_ingresso);
        $this->assertEquals('18:00:00', $presenza->ora_uscita);
        $this->assertEquals(8.0, $presenza->ore_ordinarie);
        $this->assertEquals(1.0, $presenza->ore_straordinarie);
    }

    /**
     * Test con pausa = 0
     */
    public function test_calcolo_ore_qr_senza_pausa()
    {
        $dipendente = $this->createFullTimeDipendente();

        $data = Carbon::today()->dayOfWeek >= 1 && Carbon::today()->dayOfWeek <= 5 
            ? Carbon::today() 
            : Carbon::today()->next(Carbon::MONDAY);

        $presenza = Presenza::create([
            'dipendente_id' => $dipendente->id,
            'data' => $data->toDateString(),
            'causale' => 'lavoro',
            'modalita_lavoro' => 'in_sede',
            'usa_qr' => true,
            'pausa_ore' => 0, // Nessuna pausa
            'fonte_dato' => 'QR_CODE',
            'ore_ordinarie' => 0,
            'ore_straordinarie' => 0,
            'ore_eccedenti' => 0,
            'ore_causale' => 0,
        ]);

        // Ingresso alle 08:00
        Carbon::setTestNow(Carbon::parse($data->toDateString() . ' 08:00:00'));
        $token = $this->generateQrToken($presenza);
        $this->withHeader('X-Kiosk-Token', config('app.kiosk_token', 'tablet_kiosk_secret_token_12345'))->postJson('/api/presenze/scan-qr', ['qr_token' => $token]);

        // Uscita alle 16:00 (8 ore esatte)
        Carbon::setTestNow(Carbon::parse($data->toDateString() . ' 16:00:00'));
        $token = $this->generateQrToken($presenza);
        $response = $this->withHeader('X-Kiosk-Token', config('app.kiosk_token', 'tablet_kiosk_secret_token_12345'))->postJson('/api/presenze/scan-qr', ['qr_token' => $token]);

        $response->assertStatus(200);
        $response->assertJson([
            'ore' => 8.0,
            'ore_ordinarie' => 8.0,
            'ore_straordinarie' => 0.0,
        ]);
    }

    /**
     * Test con orario superiore alle 8 ore
     */
    public function test_calcolo_ore_qr_12_ore_lavorate_1_pausa()
    {
        $dipendente = $this->createFullTimeDipendente();

        $data = Carbon::today()->dayOfWeek >= 1 && Carbon::today()->dayOfWeek <= 5 
            ? Carbon::today() 
            : Carbon::today()->next(Carbon::MONDAY);

        $presenza = Presenza::create([
            'dipendente_id' => $dipendente->id,
            'data' => $data->toDateString(),
            'causale' => 'lavoro',
            'modalita_lavoro' => 'in_sede',
            'usa_qr' => true,
            'pausa_ore' => 1,
            'fonte_dato' => 'QR_CODE',
            'ore_ordinarie' => 0,
            'ore_straordinarie' => 0,
            'ore_eccedenti' => 0,
            'ore_causale' => 0,
        ]);

        // Ingresso alle 07:00
        Carbon::setTestNow(Carbon::parse($data->toDateString() . ' 07:00:00'));
        $token = $this->generateQrToken($presenza);
        $this->withHeader('X-Kiosk-Token', config('app.kiosk_token', 'tablet_kiosk_secret_token_12345'))->postJson('/api/presenze/scan-qr', ['qr_token' => $token]);

        // Uscita alle 19:00 (12 ore - 1 pausa = 11 ore nette)
        Carbon::setTestNow(Carbon::parse($data->toDateString() . ' 19:00:00'));
        $token = $this->generateQrToken($presenza);
        $response = $this->withHeader('X-Kiosk-Token', config('app.kiosk_token', 'tablet_kiosk_secret_token_12345'))->postJson('/api/presenze/scan-qr', ['qr_token' => $token]);

        $response->assertStatus(200);
        $response->assertJson([
            'ore' => 11.0,
            'ore_ordinarie' => 8.0,
            'ore_straordinarie' => 3.0,  // 11 - 8 = 3 straordinarie
        ]);
    }
}
