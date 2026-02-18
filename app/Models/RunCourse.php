<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RunCourse extends Model
{
    protected $fillable = ['day', 'path'];
    protected $casts = ['day' => 'date', 'path' => 'array'];
}
