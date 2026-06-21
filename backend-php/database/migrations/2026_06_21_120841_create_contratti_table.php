<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('contratti', function (Blueprint $table) {
            $table->id();
            $table->string('codice_cnel')->nullable();
            $table->string('nome_contratto');
            $table->decimal('ore_settimanali_teoriche', 5, 2)->default(40);
            $table->decimal('limite_straordinario_mensile', 5, 2)->nullable();
            $table->decimal('soglia_maggiorazione_1', 5, 2)->nullable();
            $table->decimal('soglia_maggiorazione_2', 5, 2)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contratti');
    }
};
