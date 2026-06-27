<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Aumenta la lunghezza del campo nome_contratto per supportare i nomi lunghi del CNEL
     */
    public function up(): void
    {
        Schema::table('contratti', function (Blueprint $table) {
            $table->text('nome_contratto')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contratti', function (Blueprint $table) {
            $table->string('nome_contratto', 255)->change();
        });
    }
};
