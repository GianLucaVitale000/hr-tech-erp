<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dipendente_orari_settimanali', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('dipendente_id');
            $table->tinyInteger('giorno_settimana')->comment('0=Domenica, 1=Lunedì, 2=Martedì, 3=Mercoledì, 4=Giovedì, 5=Venerdì, 6=Sabato');
            $table->decimal('ore_giornaliere_previste', 5, 2)->comment('Ore lavorative previste per questo giorno secondo il contratto individuale');
            $table->timestamps();

            $table->foreign('dipendente_id')
                  ->references('id')
                  ->on('dipendenti')
                  ->onDelete('cascade');
            
            $table->unique(['dipendente_id', 'giorno_settimana'], 'dip_orari_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dipendente_orari_settimanali');
    }
};
