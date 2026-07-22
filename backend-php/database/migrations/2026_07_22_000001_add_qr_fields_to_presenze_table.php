<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('presenze', function (Blueprint $table) {
            // Flag per attivare/disattivare il QR Code per questo giorno
            $table->boolean('usa_qr')->default(false);
            
            // Orari di timbratura (solo se usa_qr = true)
            $table->time('ora_ingresso')->nullable();
            $table->time('ora_uscita')->nullable();
            
            // Pausa pranzo (inserita manualmente dal dipendente)
            $table->decimal('pausa_ore', 5, 2)->default(0);
            
            // Tracciamento origine dati
            $table->string('fonte_dato')->default('MANUALE');
        });
    }

    public function down()
    {
        Schema::table('presenze', function (Blueprint $table) {
            $table->dropColumn(['usa_qr', 'ora_ingresso', 'ora_uscita', 'pausa_ore', 'fonte_dato']);
        });
    }
};
