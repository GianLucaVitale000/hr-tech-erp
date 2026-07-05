<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Aggiunge il campo ore_settimanali_teoriche alla tabella contratti
     * per il valore base del CCNL
     */
    public function up(): void
    {
        Schema::table('contratti', function (Blueprint $table) {
            $table->decimal('ore_settimanali_teoriche', 5, 2)->nullable()->after('tipologia_contratto');
        });
    }

    public function down(): void
    {
        Schema::table('contratti', function (Blueprint $table) {
            $table->dropColumn('ore_settimanali_teoriche');
        });
    }
};
