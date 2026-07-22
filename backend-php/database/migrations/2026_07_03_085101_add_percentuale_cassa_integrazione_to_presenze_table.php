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
        Schema::table('presenze', function (Blueprint $table) {
            if (!Schema::hasColumn('presenze', 'percentuale_cassa_integrazione')) {
                $table->decimal('percentuale_cassa_integrazione', 5, 2)->nullable()->after('data_fine_cassa_integrazione');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('presenze', function (Blueprint $table) {
            $table->dropColumn('percentuale_cassa_integrazione');
        });
    }
};
