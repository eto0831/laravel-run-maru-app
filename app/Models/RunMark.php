<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RunMark extends Model
{
    protected $fillable = ['day', 'marked'];
    protected $casts = ['day' => 'date', 'marked' => 'boolean'];
}
