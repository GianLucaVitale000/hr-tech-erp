<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Rimuove il campo nome_profilo non piu necessario
     */
    public function up(): void
    {
        Schema::table('regole_calcolo_contratto', function (Blueprint $table) {
            if (Schema::hasColumn('regole_calcolo_contratto', 'nome_profilo')) {
                $table->dropColumn(['nome_profilo']);
            }
        });
    }

    public function down(): void
    {
        Schema::table('regole_calcolo_contratto', function (Blueprint $table) {
            $table->string('nome_profilo', 255)->nullable()->after('contratto_id');
        });
    }
};
