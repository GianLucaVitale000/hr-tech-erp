<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class KioskAuth
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->header('X-Kiosk-Token');
        
        if ($token !== config('app.kiosk_token')) {
            return response()->json([
                'error' => 'Unauthorized',
                'message' => 'Token kiosk non valido'
            ], 401);
        }
        
        return $next($request);
    }
}
