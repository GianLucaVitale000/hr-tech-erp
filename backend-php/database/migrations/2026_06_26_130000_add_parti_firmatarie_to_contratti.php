<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contratti', function (Blueprint $table) {
            $table->string('partiDatorialiFirmatarie')->nullable()->after('nome_contratto');
            $table->string('partiSindacaliFirmatarie')->nullable()->after('partiDatorialiFirmatarie');
        });
    }

    public function down(): void
    {
        Schema::table('contratti', function (Blueprint $table) {
            $table->dropColumn(['partiDatorialiFirmatarie', 'partiSindacaliFirmatarie']);
        });
    }
};
