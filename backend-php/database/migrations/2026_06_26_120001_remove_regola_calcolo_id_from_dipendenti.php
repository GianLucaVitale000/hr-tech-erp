<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dipendenti', function (Blueprint $table) {
            $table->dropForeign(['regola_calcolo_id']);
            $table->dropColumn('regola_calcolo_id');
        });
    }

    public function down(): void
    {
        Schema::table('dipendenti', function (Blueprint $table) {
            $table->foreignId('regola_calcolo_id')->nullable()->after('contratto_id')->constrained('regole_calcolo_contratto')->onDelete('set null');
        });
    }
};
