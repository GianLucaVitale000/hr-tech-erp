<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('presenze', function (Blueprint $table) {
            // Modalità di lavoro, valida solo quando causale = lavoro (con assemblea esclusa)
            $table->enum('modalita_lavoro', ['in_sede', 'smart_working', 'trasferta'])
                  ->nullable()
                  ->after('causale');

            // Trasferta: giustificativo unico
            $table->string('giustificativo_trasferta_path')->nullable();

            // Malattia: protocollo e periodo collegato (può attraversare più mesi)
            $table->string('protocollo_malattia')->nullable();
            $table->date('data_inizio_malattia')->nullable();
            $table->date('data_fine_malattia')->nullable();

            // Infortunio: giustificativo (referto)
            $table->string('giustificativo_infortunio_path')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('presenze', function (Blueprint $table) {
            $table->dropColumn([
                'modalita_lavoro',
                'giustificativo_trasferta_path',
                'protocollo_malattia',
                'data_inizio_malattia',
                'data_fine_malattia',
                'giustificativo_infortunio_path',
            ]);
        });
    }
};