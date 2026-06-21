<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dipendenti', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('contratto_id')->nullable()->constrained('contratti')->onDelete('set null');
            $table->string('codice_fiscale')->nullable()->unique();
            $table->string('iban')->nullable();
            $table->string('livello')->nullable();
            $table->string('mansione')->nullable();
            $table->date('data_assunzione')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dipendenti');
    }
};