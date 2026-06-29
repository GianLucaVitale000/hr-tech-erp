<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Crea la tabella per le regole di calcolo personalizzate per ogni contratto
     * Questa tabella contiene i parametri aziendali che l'admin configura tramite form
     */
    public function up(): void
    {
        Schema::create('regole_calcolo_contratto', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contratto_id')->constrained('contratti')->onDelete('cascade');
            $table->decimal('ore_settimanali_teoriche', 5, 2)->default(40);
            $table->timestamps();
            
            // Indice per ottimizzare le query
            $table->index('contratto_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('regole_calcolo_contratto');
    }
};
