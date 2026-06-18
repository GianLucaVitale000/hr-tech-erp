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
        // Crea i ruoli
        $admin = Role::create(['name' => 'admin']);
        $dipendente = Role::create(['name' => 'dipendente']);

        // Crea utente Admin
        $userAdmin = User::create([
            'name' => 'Amministratore',
            'email' => 'admin@hrtech.it',
            'password' => Hash::make('password'),
        ]);
        $userAdmin->assignRole($admin);

        // Crea utente Dipendente
        $userDipendente = User::create([
            'name' => 'Mario Rossi',
            'email' => 'dipendente@hrtech.it',
            'password' => Hash::make('password'),
        ]);
        $userDipendente->assignRole($dipendente);
    }
}