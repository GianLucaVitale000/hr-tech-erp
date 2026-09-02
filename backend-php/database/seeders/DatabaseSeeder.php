<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Esegui il seeding dei contratti CNEL
        $this->call([
            CnelContractsSeeder::class,
            RegoleCalcoloContrattoSeeder::class,
            RolesAndUsersSeeder::class,
            DipendentiSeeder::class,

        // Nuovi seeders per le tabelle aggiuntive
            MariaCartaSeeder::class,
            PresenzeTableSeeder::class,
            MariaCartaPresenzeSeeder::class, // Sovrascrive le presenze di Maria Carta con regole specifiche
            MarcoGialliPresenzeSeeder::class, // Genera presenze di Marco Gialli con supplementari/straordinarie
        ]);

        User::firstOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'email' => 'test@example.com',
                'password' => Hash::make('password'),
            ]
        );
    }
}
