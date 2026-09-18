<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Dipendente;
use App\Models\Contratto;
use Faker\Factory as Faker;

class MariaCartaSeeder extends Seeder
{
    public function run()
    {
        $faker = Faker::create('it_IT');

        // 1. Trova il contratto CCNL H011
        $contrattoH011 = Contratto::where('codice_cnel', 'H011')->first();

        if (!$contrattoH011) {
            $this->command->error('Contratto H011 non trovato! Crealo prima.');
            return;
        }

        // 2. Crea l'utente (se non esiste già)
        $user = User::where('email', 'maria.carta@example.com')->first();

        if (!$user) {
            $user = User::create([
                'name' => 'Maria Carta',
                'email' => 'maria.carta@example.com',
                'password' => bcrypt('password'), // Password temporanea
            ]);
        }
        if (!$user->hasRole('dipendente')) {
            $user->assignRole('dipendente');
        }

        // 3. Crea il dipendente (se non esiste già)
        $dipendente = Dipendente::where('user_id', $user->id)->first();

        if (!$dipendente) {
            Dipendente::create([
                'user_id' => $user->id,
                'contratto_id' => $contrattoH011->id,
                'tipo_contratto' => 'indeterminato', // Assumiamo indeterminato
                'sesso' => 'F', // Femmina
                'codice_fiscale' => 'CRTMRA70A01H501U', // Codice fiscale fake valido
                'iban' => 'IT60X0542811101000000123456', // IBAN fake
                'livello' => '3', // Livello esempio
                'mansione' => 'Impiegata Amministrativa',
                'data_assunzione' => '2020-01-15', // Assunta da qualche anno
                'percentuale_part_time' => 100, // Tempo pieno
                'ore_settimanali' => 40, // 40 ore settimanali (tempo pieno)
                'giorni_lavorativi_settimanali' => 5, // 5 giorni
            ]);
        } else {
            // Se esiste già, aggiorna solo i campi mancanti
            $dipendente->update([
                'sesso' => 'F',
                'contratto_id' => $contrattoH011->id,
                'tipo_contratto' => 'indeterminato',
                'percentuale_part_time' => 100,
                'ore_settimanali' => 40,
                'giorni_lavorativi_settimanali' => 5,
            ]);
        }

        $this->command->info('✅ Dipendente Maria Carta creato/aggiornato con successo!');
    }
}