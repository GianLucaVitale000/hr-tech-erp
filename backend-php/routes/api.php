<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ContrattoController;
use App\Http\Controllers\DipendenteController;

Route::get('/ping', function () {
    return response()->json(['message' => 'Laravel API attiva!']);
});

// Rotte pubbliche
Route::post('/login', [AuthController::class, 'login']);

// Rotte protette (richiedono autenticazione)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::apiResource('contratti', ContrattoController::class);
    Route::apiResource('dipendenti', DipendenteController::class);
});