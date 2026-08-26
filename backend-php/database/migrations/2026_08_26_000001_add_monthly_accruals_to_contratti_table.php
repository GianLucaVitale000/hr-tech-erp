<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contratti', function (Blueprint $table): void {
            $table->decimal('rateo_mensile_ferie', 8, 5)->nullable();
            $table->decimal('rateo_mensile_permessi_rol', 8, 5)->nullable();
            $table->decimal('rateo_mensile_ex_festivita', 8, 5)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('contratti', function (Blueprint $table): void {
            $table->dropColumn([
                'rateo_mensile_ferie',
                'rateo_mensile_permessi_rol',
                'rateo_mensile_ex_festivita',
            ]);
        });
    }
};