<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ContrattoController;
use App\Http\Controllers\RegolaCalcoloContrattoController;
use App\Http\Controllers\DipendenteController;
use App\Http\Controllers\DipendenteOrarioSettimanaleController;
use App\Http\Controllers\PresenzaController;
use App\Http\Controllers\UserController;

Route::get('/ping', function () {
    return response()->json(['message' => 'Laravel API attiva!']);
});

Route::post('/login', [AuthController::class, 'login']);
Route::get('/users', [AuthController::class, 'index']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/users/{user}', [UserController::class, 'show']);
    Route::apiResource('users', UserController::class)->except(['show']);

    Route::get('/dipendenti/me', [DipendenteController::class, 'me']);
    Route::get('/contratti/vigenti', [ContrattoController::class, 'vigenti']);
    Route::apiResource('contratti', ContrattoController::class)->parameters(['contratti' => 'contratto']);
    Route::apiResource('dipendenti', DipendenteController::class)->parameters(['dipendenti' => 'dipendente']);
    Route::apiResource('regole-calcolo', RegolaCalcoloContrattoController::class)->parameters(['regole-calcolo' => 'regolaCalcoloContratto']);
    Route::get('/contratti/{contratto}/regole-calcolo', [RegolaCalcoloContrattoController::class, 'byContratto']);

    // Rotte per orari settimanali dipendenti
    Route::get('/dipendenti/{dipendente}/orari-settimanali', [DipendenteOrarioSettimanaleController::class, 'index']);
    Route::post('/dipendenti/{dipendente}/orari-settimanali', [DipendenteOrarioSettimanaleController::class, 'storeOrUpdate']);
    Route::get('/dipendenti/{dipendente}/orari-settimanali/per-data', [DipendenteOrarioSettimanaleController::class, 'getForDate']);

    // Rotte specifiche PRIMA di apiResource
    Route::post('/presenze/invia-mese', [PresenzaController::class, 'inviaMese']);
    Route::get('/presenze/in-attesa', [PresenzaController::class, 'inAttesa']);
    Route::get('/presenze/mesi-approvati', [PresenzaController::class, 'mesiApprovati']);
    Route::post('/presenze/aggiorna-stato-mese', [PresenzaController::class, 'aggiornaStatoMese']);
    Route::post('/presenze/registra-malattia', [PresenzaController::class, 'registraMalattia']);
    Route::post('/presenze/registra-cassa-integrazione', [PresenzaController::class, 'registraCassaIntegrazione']);
    Route::post('/presenze/{presenza}/giustificativo-trasferta', [PresenzaController::class, 'uploadGiustificativoTrasferta']);
    Route::post('/presenze/{presenza}/giustificativo-infortunio', [PresenzaController::class, 'uploadGiustificativoInfortunio']);
    Route::apiResource('presenze', PresenzaController::class);
});