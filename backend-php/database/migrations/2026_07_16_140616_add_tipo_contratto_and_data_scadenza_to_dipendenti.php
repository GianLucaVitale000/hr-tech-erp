<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('dipendenti', function (Blueprint $table) {
            $table->string('tipo_contratto', 20)
                  ->default('indeterminato')
                  ->after('contratto_id');
            
            $table->date('data_scadenza_contratto')
                  ->nullable()
                  ->after('tipo_contratto');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dipendenti', function (Blueprint $table) {
            $table->dropColumn(['tipo_contratto', 'data_scadenza_contratto']);
        });
    }
};
