<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('presenza_comunicazioni', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dipendente_id')->constrained('dipendenti')->cascadeOnDelete();
            $table->foreignId('admin_id')->constrained('users')->restrictOnDelete();
            $table->unsignedTinyInteger('mese');
            $table->unsignedSmallInteger('anno');
            $table->text('messaggio');
            $table->timestamp('letto_at')->nullable();
            $table->timestamps();

            $table->index(['dipendente_id', 'anno', 'mese']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('presenza_comunicazioni');
    }
};
