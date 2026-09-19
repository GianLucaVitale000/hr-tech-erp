<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): voidDa
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
            // Seed di test Maria Carta (in seeders/test/ - regole specifiche: maternità, part-time, ferie maturate)
            Database\Seeders\Test\MariaCartaPresenzeSeeder::class,
            MarcoGialliPresenzeSeeder::class, // Genera presenze di Marco Gialli con supplementari/straordinarie
        ]);
    }
}
