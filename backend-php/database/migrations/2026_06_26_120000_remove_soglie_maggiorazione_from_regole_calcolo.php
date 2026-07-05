<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('regole_calcolo_contratto', function (Blueprint $table) {
            if (Schema::hasColumn('regole_calcolo_contratto', 'soglia_maggiorazione_1')) {
                $table->dropColumn(['soglia_maggiorazione_1', 'soglia_maggiorazione_2']);
            }
        });
    }

    public function down(): void
    {
        Schema::table('regole_calcolo_contratto', function (Blueprint $table) {
            $table->decimal('soglia_maggiorazione_1', 5, 2)->nullable();
            $table->decimal('soglia_maggiorazione_2', 5, 2)->nullable();
        });
    }
};
