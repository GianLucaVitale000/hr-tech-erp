<?php

namespace App\Http\Controllers;

use App\Models\Dipendente;
use App\Models\DipendenteCondizioneContrattuale;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(Request $request)
    {
        return User::with(['roles', 'dipendente.latestPrivacyAcknowledgment.recorder:id,name'])
            ->select('id', 'name', 'email', 'avatar_path')
            ->orderBy('name')
            ->get()
            ->map(fn (User $user) => $this->withAvatarUrl($user, $request));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email|max:255',
            'password' => 'required|string|min:8|confirmed',
            'role' => 'required|string|in:admin,dipendente',
            'avatar' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
            'create_dipendente' => 'boolean',
            'contratto_id' => 'nullable|exists:contratti,id',
            'codice_fiscale' => 'nullable|string|unique:dipendenti,codice_fiscale',
            'iban' => 'nullable|string',
            'livello' => 'nullable|string',
            'mansione' => 'nullable|string',
            'data_assunzione' => 'nullable|date',
            'sesso' => 'nullable|in:M,F',
            'tipo_contratto' => 'nullable|in:determinato,indeterminato',
            'data_scadenza_contratto' => 'nullable|date|required_if:tipo_contratto,determinato',
            'percentuale_part_time' => 'nullable|numeric|min:0|max:100',
            'giorni_lavorativi_settimanali' => 'nullable|integer|min:1|max:6',
            'R1' => 'nullable|integer|min:1|max:7',
            'R2' => 'nullable|integer|min:1|max:7',
            'rateo_mensile_ferie' => 'nullable|numeric|min:0',
            'rateo_mensile_permessi_rol' => 'nullable|numeric|min:0',
            'rateo_mensile_ex_festivita' => 'nullable|numeric|min:0',
            'residuo_precedente_ferie' => 'nullable|numeric|min:0',
            'residuo_precedente_permessi' => 'nullable|numeric|min:0',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        if ($request->hasFile('avatar')) {
            $user->avatar_path = $request->file('avatar')->store('avatars', 'public');
            $user->save();
        }

        $role = Role::where('name', $validated['role'])->first();
        $user->assignRole($role);

        // Crea anche il record dipendente se richiesto
        if ($request->create_dipendente) {
            $dipendente = Dipendente::create([
                'user_id' => $user->id,
                'contratto_id' => $validated['contratto_id'] ?? null,
                'codice_fiscale' => $validated['codice_fiscale'] ?? null,
                'iban' => $validated['iban'] ?? null,
                'livello' => $validated['livello'] ?? null,
                'mansione' => $validated['mansione'] ?? null,
                'data_assunzione' => $validated['data_assunzione'] ?? null,
                'sesso' => $validated['sesso'] ?? null,
                'tipo_contratto' => $validated['tipo_contratto'] ?? 'indeterminato',
                'data_scadenza_contratto' => $validated['data_scadenza_contratto'] ?? null,
                'percentuale_part_time' => $validated['percentuale_part_time'] ?? 100,
                'giorni_lavorativi_settimanali' => $validated['giorni_lavorativi_settimanali'] ?? 5,
                'R1' => $validated['R1'] ?? 6,
                'R2' => $validated['R2'] ?? 7,
                'rateo_mensile_ferie' => $validated['rateo_mensile_ferie'] ?? null,
                'rateo_mensile_permessi_rol' => $validated['rateo_mensile_permessi_rol'] ?? null,
                'rateo_mensile_ex_festivita' => $validated['rateo_mensile_ex_festivita'] ?? null,
                'residuo_precedente_ferie' => $validated['residuo_precedente_ferie'] ?? 0,
                'residuo_precedente_permessi' => $validated['residuo_precedente_permessi'] ?? 0,
            ]);

            DipendenteCondizioneContrattuale::create([
                'dipendente_id' => $dipendente->id,
                'contratto_id' => $dipendente->contratto_id,
                'percentuale_part_time' => $dipendente->percentuale_part_time ?? 100,
                'R1' => $dipendente->R1,
                'R2' => $dipendente->R2,
                'data_inizio' => $dipendente->data_assunzione ?? Carbon::today(),
            ]);

            return response()->json([
                'message' => 'Utente e dipendente creati con successo',
                'user' => $this->withAvatarUrl($user->load('roles'), $request),
                'dipendente' => $dipendente->load('contratto'),
            ], 201);
        }

        return response()->json([
            'message' => 'Utente creato con successo',
            'user' => $this->withAvatarUrl($user->load('roles'), $request),
        ], 201);
    }

    public function show(Request $request, User $user)
    {
        return $this->withAvatarUrl($user->load('roles', 'dipendente.contratto'), $request);
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,'.$user->id.'|max:255',
            'password' => 'nullable|string|min:8|confirmed',
            'role' => 'sometimes|string|in:admin,dipendente',
            'avatar' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
        ]);

        if (isset($validated['name'])) {
            $user->name = $validated['name'];
        }
        if (isset($validated['email'])) {
            $user->email = $validated['email'];
        }
        if (isset($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }
        if ($request->hasFile('avatar')) {
            if ($user->avatar_path) {
                Storage::disk('public')->delete($user->avatar_path);
            }
            $user->avatar_path = $request->file('avatar')->store('avatars', 'public');
        }
        $user->save();

        if (isset($validated['role'])) {
            $role = Role::where('name', $validated['role'])->first();
            $user->syncRoles([$role->id]);
        }

        return response()->json([
            'message' => 'Utente aggiornato',
            'user' => $this->withAvatarUrl($user->load('roles'), $request),
        ]);
    }

    public function uploadAvatar(Request $request, User $user)
    {
        $validated = $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
        ]);

        if ($user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
        }

        $user->avatar_path = $validated['avatar']->store('avatars', 'public');
        $user->save();

        return response()->json([
            'message' => 'Foto profilo aggiornata',
            'user' => $this->withAvatarUrl($user->load('roles'), $request),
        ]);
    }

    public function destroy(User $user)
    {
        if ($user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
        }
        $user->delete();

        return response()->json(['message' => 'Utente eliminato']);
    }

    private function withAvatarUrl(User $user, Request $request): User
    {
        $user->avatar_url = $user->avatar_path
            ? $request->getSchemeAndHttpHost().'/storage/'.ltrim($user->avatar_path, '/')
            : null;

        return $user;
    }
}
