<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\RunMaruService;
use Illuminate\Http\Request;

class RunMaruController extends Controller
{
    public function __construct(private RunMaruService $service) {}

    // GET /api/runmaru/marks?y=2026&m=2
    public function marks(Request $req)
    {
        $y = (int)$req->query('y');
        $m = (int)$req->query('m');

        // TODO: バリデーション最小（まず動かす）
        $data = $this->service->marksForMonth($y, $m);
        return response()->json(['marks' => $data]);
    }

    // PUT /api/runmaru/mark { day: "YYYY-MM-DD", marked: true/false }
    public function setMark(Request $req)
    {
        $day = (string)$req->input('day');
        $marked = (bool)$req->input('marked');

        $this->service->setMark($day, $marked);
        return response()->json(['ok' => true]);
    }

    // GET /api/runmaru/course?day=YYYY-MM-DD
    public function course(Request $req)
    {
        $day = (string)$req->query('day');
        $path = $this->service->getCourse($day);
        return response()->json(['day' => $day, 'path' => $path]);
    }

    // PUT /api/runmaru/course { day: "...", path: [...] }
    public function setCourse(Request $req)
    {
        $day = (string)$req->input('day');
        $path = $req->input('path', []);
        $path = is_array($path) ? $path : [];

        $this->service->setCourse($day, $path);
        return response()->json(['ok' => true]);
    }
}
