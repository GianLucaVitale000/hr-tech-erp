<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('presenze', function (Blueprint $table) {
            $table->decimal('ore_causale', 4, 2)->default(0)->after('ore_straordinarie');
        });
    }

    public function down(): void
    {
        Schema::table('presenze', function (Blueprint $table) {
            $table->dropColumn('ore_causale');
        });
    }
};
