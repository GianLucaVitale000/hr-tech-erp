<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dipendenti', function (Blueprint $table) {
            if (!Schema::hasColumn('dipendenti', 'residuo_precedente_ferie')) {
                $table->decimal('residuo_precedente_ferie', 8, 5)->nullable()->default(0)->after('rateo_mensile_ex_festivita');
            }
            if (!Schema::hasColumn('dipendenti', 'residuo_precedente_permessi')) {
                $table->decimal('residuo_precedente_permessi', 8, 5)->nullable()->default(0)->after('residuo_precedente_ferie');
            }
        });
    }

    public function down(): void
    {
        Schema::table('dipendenti', function (Blueprint $table) {
            $table->dropColumn(['residuo_precedente_ferie', 'residuo_precedente_permessi']);
        });
    }
};
