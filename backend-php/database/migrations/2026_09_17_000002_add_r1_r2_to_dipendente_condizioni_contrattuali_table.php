<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dipendente_condizioni_contrattuali', function (Blueprint $table) {
            $table->unsignedTinyInteger('R1')->nullable()->after('percentuale_part_time');
            $table->unsignedTinyInteger('R2')->nullable()->after('R1');
        });
    }

    public function down(): void
    {
        Schema::table('dipendente_condizioni_contrattuali', function (Blueprint $table) {
            $table->dropColumn(['R1', 'R2']);
        });
    }
};
