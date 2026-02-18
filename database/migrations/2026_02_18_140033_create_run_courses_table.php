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
        Schema::create('run_courses', function (Blueprint $table) {
            $table->id();
            // TODO: まずはユーザー無し
            $table->date('day')->unique();
            $table->json('path')->nullable(); // [{lat,lng},...]
            $table->timestamps();
        });
    }


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('run_courses');
    }
};
