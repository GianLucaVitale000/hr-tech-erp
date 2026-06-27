<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class RolesAndUsersSeeder extends Seeder
{
    public function run(): void
    {
        // Crea i ruoli (usa firstOrCreate per evitare errori se già esistono)
        $admin = Role::firstOrCreate(['name' => 'admin']);
        $dipendente = Role::firstOrCreate(['name' => 'dipendente']);

        // Crea utente Admin (usa firstOrUpdate per evitare duplicati)
        $userAdmin = User::firstOrCreate(
            ['email' => 'admin@hrtech.it'],
            [
                'name' => 'Amministratore',
                'email' => 'admin@hrtech.it',
                'password' => Hash::make('password'),
            ]
        );
        $userAdmin->assignRole($admin);

        // Crea utente Dipendente (usa firstOrCreate per evitare duplicati)
        $userDipendente = User::firstOrCreate(
            ['email' => 'dipendente@hrtech.it'],
            [
                'name' => 'Mario Rossi',
                'email' => 'dipendente@hrtech.it',
                'password' => Hash::make('password'),
            ]
        );
        $userDipendente->assignRole($dipendente);
    }
}