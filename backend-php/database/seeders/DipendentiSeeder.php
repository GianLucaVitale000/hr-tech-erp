<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Dipendente;
use Illuminate\Support\Facades\Hash;

class DipendentiSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Trova i contratti necessari
        $contrattoC011 = \App\Models\Contratto::where('codice_cnel', 'C011')->orderBy('id')->first();
        $contrattoH011 = \App\Models\Contratto::where('codice_cnel', 'H011')->orderBy('id')->first();

        if (!$contrattoC011 || !$contrattoH011) {
            $this->command->error('Contratti C011 o H011 non trovati!');
            return;
        }

        // Trova o crea Mario Rossi (esiste già dal RolesAndUsersSeeder)
        $marioRossi = User::firstOrCreate(
            ['email' => 'dipendente@hrtech.it'],
            [
                'name' => 'Mario Rossi',
                'email' => 'dipendente@hrtech.it',
                'password' => Hash::make('password'),
            ]
        );

        // Crea Paolo Bianchi
        $paoloBianchi = User::firstOrCreate(
            ['email' => 'paolo.bianchi@hrtech.it'],
            [
                'name' => 'Paolo Bianchi',
                'email' => 'paolo.bianchi@hrtech.it',
                'password' => Hash::make('password'),
            ]
        );

        // Crea Antonio Verdi
        $antonioVerdi = User::firstOrCreate(
            ['email' => 'antonio.verdi@hrtech.it'],
            [
                'name' => 'Antonio Verdi',
                'email' => 'antonio.verdi@hrtech.it',
                'password' => Hash::make('password'),
            ]
        );

        // Mario Rossi: C011, tempo pieno, indeterminato
        Dipendente::firstOrCreate(
            ['user_id' => $marioRossi->id],
            [
                'user_id' => $marioRossi->id,
                'contratto_id' => $contrattoC011->id,
                'codice_fiscale' => 'RSSMRA80A01H501Z',
                'iban' => 'IT60X0542811101000000123456',
                'livello' => 'Operaio',
                'mansione' => 'Addetto produzione',
                'data_assunzione' => '2020-01-15',
                'tipo_contratto' => 'indeterminato',
                'data_scadenza_contratto' => null,
                'percentuale_part_time' => 100,
                'giorni_lavorativi_settimanali' => 5,
            ]
        );

        // Paolo Bianchi: H011, tempo parziale 50%, indeterminato, 5 giorni
        Dipendente::firstOrCreate(
            ['user_id' => $paoloBianchi->id],
            [
                'user_id' => $paoloBianchi->id,
                'contratto_id' => $contrattoH011->id,
                'codice_fiscale' => 'BNCPLA85B02H501T',
                'iban' => 'IT60X0542811101000000234567',
                'livello' => 'Operaio',
                'mansione' => 'Magazziniere',
                'data_assunzione' => '2021-03-10',
                'tipo_contratto' => 'indeterminato',
                'data_scadenza_contratto' => null,
                'percentuale_part_time' => 50,
                'giorni_lavorativi_settimanali' => 5,
            ]
        );

        // Antonio Verdi: C011, tempo pieno, determinato, scadenza 30 giugno 2026
        Dipendente::firstOrCreate(
            ['user_id' => $antonioVerdi->id],
            [
                'user_id' => $antonioVerdi->id,
                'contratto_id' => $contrattoC011->id,
                'codice_fiscale' => 'VRDNTN90C03H501S',
                'iban' => 'IT60X0542811101000000345678',
                'livello' => 'Tecnico',
                'mansione' => 'Manutentore',
                'data_assunzione' => '2023-06-01',
                'tipo_contratto' => 'determinato',
                'data_scadenza_contratto' => '2026-06-30',
                'percentuale_part_time' => 100,
                'giorni_lavorativi_settimanali' => 5,
            ]
        );

        $this->command->info('Dipendenti seedati con successo!');
    }
}
