<?php

use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    try {
        \DB::connection()->getPdo();
        $dbStatus = 'ok';
    } catch (\Exception $e) {
        $dbStatus = 'error';
    }

    return response()->json([
        'status' => $dbStatus === 'ok' ? 'healthy' : 'degraded',
        'service' => 'HR-Tech ERP API',
        'database' => $dbStatus,
        'timestamp' => now()->toIso8601String(),
    ]);
});
