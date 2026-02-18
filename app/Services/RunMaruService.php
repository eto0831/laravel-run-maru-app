<?php

namespace App\Services;

use App\Models\RunMark;
use App\Models\RunCourse;

class RunMaruService
{
    // TODO: 月の marks を返す（YYYY-MM の範囲）
    public function marksForMonth(int $y, int $m): array
    {
        $start = sprintf('%04d-%02d-01', $y, $m);
        $end = date('Y-m-d', strtotime($start . ' +1 month'));

        return RunMark::query()
            ->where('day', '>=', $start)
            ->where('day', '<', $end)
            ->pluck('marked', 'day')
            ->toArray();
    }

    // TODO: ある日の mark をON/OFF
    public function setMark(string $day, bool $marked): void
    {
        if ($marked) {
            RunMark::updateOrCreate(['day' => $day], ['marked' => true]);
        } else {
            RunMark::where('day', $day)->delete(); // “無い=未記録”にする
        }
    }

    // TODO: ある日の course を取得
    public function getCourse(string $day): array
    {
        $row = RunCourse::where('day', $day)->first();
        return $row?->path ?? [];
    }

    // TODO: ある日の course を保存
    public function setCourse(string $day, array $path): void
    {
        RunCourse::updateOrCreate(['day' => $day], ['path' => $path]);
    }
}
