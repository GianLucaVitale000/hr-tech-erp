<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('privacy_acknowledgments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dipendente_id')->constrained('dipendenti')->cascadeOnDelete();
            $table->foreignId('recorded_by')->constrained('users')->restrictOnDelete();
            $table->string('document_type', 50);
            $table->string('document_version', 50);
            $table->date('document_date');
            $table->date('acknowledged_at');
            $table->string('archive_method', 100);
            $table->string('archive_reference', 255);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['dipendente_id', 'document_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('privacy_acknowledgments');
    }
};
