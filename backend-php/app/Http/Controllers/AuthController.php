<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * @method \Laravel\Sanctum\PersonalAccessToken createToken(string $name)
 */
class AuthController extends Controller
{
    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
            'remember_me' => 'sometimes|boolean',
        ]);
        $rememberMe = (bool) ($validated['remember_me'] ?? false);
        $credentials = [
            'email' => $validated['email'],
            'password' => $validated['password'],
        ];

        $guard = Auth::guard('web');
        if (! $guard->once($credentials)) {
            return response()->json([
                'message' => 'Credenziali non valide',
            ], 401);
        }

        $user = $guard->user();
        $token = $user->createToken(
            'auth_token',
            ['*'],
            $rememberMe ? now()->addDays(30) : null,
        )->plainTextToken;

        $cookie = cookie(
            'auth_token',
            $token,
            $rememberMe ? 30 * 24 * 60 : 0,
            '/',
            null,
            (bool) config('session.secure'),
            true,
            false,
            'strict',
        );

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->getRoleNames()->first(),
                'avatar_url' => $user->avatar_path
                    ? $request->getSchemeAndHttpHost().'/storage/'.ltrim($user->avatar_path, '/')
                    : null,
            ],
        ])->withCookie($cookie);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Logout effettuato con successo',
        ])->withCookie(cookie()->forget('auth_token', '/'));
    }

    public function me(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->getRoleNames()->first(),
            'avatar_url' => $user->avatar_path
                ? $request->getSchemeAndHttpHost().'/storage/'.ltrim($user->avatar_path, '/')
                : null,
        ]);
    }

    public function index(Request $request)
    {
        return User::select('id', 'name', 'email', 'avatar_path')
            ->orderBy('name')
            ->get()
            ->map(function (User $user) {
                $user->avatar_url = $user->avatar_path
                    ? $request->getSchemeAndHttpHost().'/storage/'.ltrim($user->avatar_path, '/')
                    : null;

                return $user;
            });
    }
}
