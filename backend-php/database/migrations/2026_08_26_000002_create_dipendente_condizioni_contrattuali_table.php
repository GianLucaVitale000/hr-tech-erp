<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dipendente_condizioni_contrattuali', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('dipendente_id')->constrained('dipendenti')->cascadeOnDelete();
            $table->foreignId('contratto_id')->nullable()->constrained('contratti')->nullOnDelete();
            $table->decimal('percentuale_part_time', 5, 2)->default(100);
            $table->date('data_inizio');
            $table->date('data_fine')->nullable();
            $table->timestamps();
            $table->index(['dipendente_id', 'data_inizio'], 'dip_condizioni_dipendente_data_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dipendente_condizioni_contrattuali');
    }
};
