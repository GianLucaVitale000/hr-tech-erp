<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contratti', function (Blueprint $table) {
            $table->text('partiDatorialiFirmatarie')->nullable()->change();
            $table->text('partiSindacaliFirmatarie')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('contratti', function (Blueprint $table) {
            $table->string('partiDatorialiFirmatarie')->nullable()->change();
            $table->string('partiSindacaliFirmatarie')->nullable()->change();
        });
    }
};
