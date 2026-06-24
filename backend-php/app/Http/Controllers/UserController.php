<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Dipendente;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index()
    {
        return User::with(['roles', 'dipendente'])->select('id', 'name', 'email')->orderBy('name')->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email|max:255',
            'password' => 'required|string|min:8|confirmed',
            'role' => 'required|string|in:admin,dipendente',
            'create_dipendente' => 'boolean',
            'contratto_id' => 'nullable|exists:contratti,id',
            'codice_fiscale' => 'nullable|string|unique:dipendenti,codice_fiscale',
            'livello' => 'nullable|string',
            'mansione' => 'nullable|string',
            'data_assunzione' => 'nullable|date',
            'percentuale_part_time' => 'nullable|numeric|min:0|max:100',
            'giorni_lavorativi_settimanali' => 'nullable|integer|min:4|max:6',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => \Illuminate\Support\Facades\Hash::make($validated['password'])
        ]);

        $role = Role::where('name', $validated['role'])->first();
        $user->assignRole($role);

        // Crea anche il record dipendente se richiesto
        if ($request->create_dipendente) {
            $dipendente = Dipendente::create([
                'user_id' => $user->id,
                'contratto_id' => $validated['contratto_id'] ?? null,
                'codice_fiscale' => $validated['codice_fiscale'] ?? null,
                'livello' => $validated['livello'] ?? null,
                'mansione' => $validated['mansione'] ?? null,
                'data_assunzione' => $validated['data_assunzione'] ?? null,
                'percentuale_part_time' => $validated['percentuale_part_time'] ?? 100,
                'giorni_lavorativi_settimanali' => $validated['giorni_lavorativi_settimanali'] ?? 5,
            ]);

            return response()->json([
                'message' => 'Utente e dipendente creati con successo',
                'user' => $user->load('roles'),
                'dipendente' => $dipendente->load('contratto')
            ], 201);
        }

        return response()->json([
            'message' => 'Utente creato con successo',
            'user' => $user->load('roles')
        ], 201);
    }

    public function show(User $user)
    {
        return $user->load('roles', 'dipendente.contratto');
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id . '|max:255',
            'password' => 'nullable|string|min:8|confirmed',
            'role' => 'sometimes|string|in:admin,dipendente'
        ]);

        if (isset($validated['name'])) {
            $user->name = $validated['name'];
        }
        if (isset($validated['email'])) {
            $user->email = $validated['email'];
        }
        if (isset($validated['password'])) {
            $user->password = \Illuminate\Support\Facades\Hash::make($validated['password']);
        }
        $user->save();

        if (isset($validated['role'])) {
            $role = Role::where('name', $validated['role'])->first();
            $user->syncRoles([$role->id]);
        }

        return response()->json([
            'message' => 'Utente aggiornato',
            'user' => $user->load('roles')
        ]);
    }

    public function destroy(User $user)
    {
        $user->delete();
        return response()->json(['message' => 'Utente eliminato']);
    }
}
