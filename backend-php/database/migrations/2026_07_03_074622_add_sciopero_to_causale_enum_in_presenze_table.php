<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Aggiunge 'sciopero' all'enum della colonna causale
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE presenze MODIFY COLUMN causale ENUM('lavoro','ferie','permesso_rol','malattia','maternita','infortunio','assemblea','sciopero') NOT NULL DEFAULT 'lavoro'");
    }

    /**
     * Reverse the migrations.
     * Rimuove 'sciopero' dall'enum della colonna causale
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE presenze MODIFY COLUMN causale ENUM('lavoro','ferie','permesso_rol','malattia','maternita','infortunio','assemblea') NOT NULL DEFAULT 'lavoro'");
    }
};
