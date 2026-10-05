<?php

namespace App\Providers;

use Illuminate\Http\Request;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Sanctum::getAccessTokenFromRequestUsing(
            static function (Request $request): ?string {
                $cookieToken = $request->cookie('auth_token');

                return $cookieToken
                    ? rawurldecode($cookieToken)
                    : $request->bearerToken();
            }
        );
    }
}
