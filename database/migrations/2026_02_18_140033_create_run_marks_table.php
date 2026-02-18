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
        Schema::create('run_marks', function (Blueprint $table) {
            $table->id();
            // TODO: まずはユーザー無しで動かす（後で user_id 追加）
            $table->date('day')->unique();
            $table->boolean('marked')->default(true);
            $table->timestamps();
        });
    }


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('run_marks');
    }
};
