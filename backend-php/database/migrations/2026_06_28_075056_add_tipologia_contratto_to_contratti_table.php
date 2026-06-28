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
        Schema::table('contratti', function (Blueprint $table) {
            $table->string('tipologia_contratto')->nullable()->after('ultimo_accordo_vigente');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contratti', function (Blueprint $table) {
            $table->dropColumn('tipologia_contratto');
        });
    }
};
