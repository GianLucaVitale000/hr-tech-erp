<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE presenze MODIFY COLUMN stato ENUM('bozza', 'inviato', 'approvato', 'rifiutato', 'reinviato') DEFAULT 'bozza'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE presenze MODIFY COLUMN stato ENUM('bozza', 'inviato', 'approvato', 'rifiutato') DEFAULT 'bozza'");
    }
};
