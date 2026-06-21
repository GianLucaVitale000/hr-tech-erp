<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('presenze', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dipendente_id')->constrained('dipendenti')->onDelete('cascade');
            $table->date('data');
            $table->decimal('ore_ordinarie', 4, 2)->default(0);
            $table->decimal('ore_straordinarie', 4, 2)->default(0);
            $table->enum('causale', [
                'lavoro',
                'ferie',
                'permesso_rol',
                'malattia',
                'maternita',
                'infortunio',
                'assemblea'
            ])->default('lavoro');
            $table->enum('stato', ['bozza', 'inviato', 'approvato', 'rifiutato'])->default('bozza');
            $table->timestamps();

            $table->unique(['dipendente_id', 'data']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('presenze');
    }
};