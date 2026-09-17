<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dipendenti', function (Blueprint $table) {
            $table->unsignedTinyInteger('R1')->nullable()->after('giorni_lavorativi_settimanali');
            $table->unsignedTinyInteger('R2')->nullable()->after('R1');
        });
    }

    public function down(): void
    {
        Schema::table('dipendenti', function (Blueprint $table) {
            $table->dropColumn(['R1', 'R2']);
        });
    }
};
