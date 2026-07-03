<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE presenze MODIFY COLUMN causale ENUM('lavoro','ferie','permesso_rol','permesso_retribuito','permesso_non_retribuito','malattia','maternita','infortunio','assemblea','sciopero','cassa_integrazione') NOT NULL DEFAULT 'lavoro'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE presenze MODIFY COLUMN causale ENUM('lavoro','ferie','permesso_rol','malattia','maternita','infortunio','assemblea','sciopero','cassa_integrazione') NOT NULL DEFAULT 'lavoro'");
    }
};
