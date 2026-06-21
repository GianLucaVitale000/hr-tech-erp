<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ContrattoController;
use App\Http\Controllers\DipendenteController;
use App\Http\Controllers\PresenzaController;

Route::get('/ping', function () {
    return response()->json(['message' => 'Laravel API attiva!']);
});

// Rotte pubbliche
Route::post('/login', [AuthController::class, 'login']);

// Rotte protette (richiedono autenticazione)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::get('/dipendenti/me', [DipendenteController::class, 'me']);
    Route::apiResource('contratti', ContrattoController::class);
    Route::apiResource('dipendenti', DipendenteController::class);
    Route::apiResource('presenze', PresenzaController::class);
    Route::post('/presenze/invia-mese', [PresenzaController::class, 'inviaMese']);

});