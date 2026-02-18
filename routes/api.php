<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\RunMaruController;

Route::get('/runmaru/marks', [RunMaruController::class, 'marks']);
Route::put('/runmaru/mark', [RunMaruController::class, 'setMark']);
Route::get('/runmaru/course', [RunMaruController::class, 'course']);
Route::put('/runmaru/course', [RunMaruController::class, 'setCourse']);
