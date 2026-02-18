<!doctype html>
<html lang="ja">

<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Run Maru</title>
    <style>
        body {
            font-family: system-ui, sans-serif;
            padding: 16px;
            max-width: 560px;
            margin: 0 auto;
        }

        h1 {
            font-size: 22px;
            margin: 0 0 12px;
        }

        .bigbtn {
            width: 100%;
            font-size: 20px;
            padding: 14px 16px;
            border-radius: 12px;
            border: 1px solid #ccc;
            background: white;
        }

        .row {
            display: flex;
            gap: 8px;
            align-items: center;
            margin-top: 10px;
            flex-wrap: wrap;
        }

        .pill {
            font-size: 13px;
            color: #444;
            background: #f4f4f4;
            padding: 6px 10px;
            border-radius: 999px;
        }

        .calendar {
            margin-top: 16px;
            border: 1px solid #ddd;
            border-radius: 12px;
            overflow: hidden;
        }

        .cal-head {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 12px;
            background: #fafafa;
            border-bottom: 1px solid #eee;
        }

        .navbtn {
            padding: 8px 10px;
            border-radius: 10px;
            border: 1px solid #ddd;
            background: white;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
        }

        .dow {
            font-size: 12px;
            color: #666;
            text-align: center;
            padding: 8px 0;
            background: #fff;
            border-bottom: 1px solid #eee;
        }

        .cell {
            height: 52px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border-right: 1px solid #eee;
            border-bottom: 1px solid #eee;
            user-select: none;
            cursor: pointer;
            background: white;
        }

        .cell:nth-child(7n) {
            border-right: none;
        }

        .day {
            font-size: 14px;
        }

        .mark {
            font-size: 18px;
            line-height: 1;
            margin-top: 2px;
        }

        .muted {
            color: #999;
        }

        .today {
            outline: 2px solid #222;
            outline-offset: -2px;
        }

        .hint {
            margin-top: 8px;
            color: #666;
            font-size: 13px;
        }
    </style>
</head>

<body>
    <h1>ランニング記録 ⭕️</h1>

    <button id="toggleToday" class="bigbtn">今日を⭕️にする</button>

    <div class="row">
        <div id="status" class="pill"></div>
        <button id="jumpToday" class="navbtn">今月へ戻る</button>
        <button id="clearAll" class="navbtn">全部消す</button>
    </div>

    <div class="hint">
        カレンダーの日付をクリックすると ⭕️
        が付いたり外れたりします（後から修正OK）。
    </div>

    <div class="calendar">
        <div class="cal-head">
            <button id="prev" class="navbtn">←</button>
            <div id="title" class="pill"></div>
            <button id="next" class="navbtn">→</button>
        </div>

        <div class="grid" id="dow"></div>
        <div class="grid" id="grid"></div>
    </div>

    <div id="map-area" class="calendar" style="margin-top: 16px">
        <div class="cal-head">
            <div id="map-title" class="pill">コース（未選択）</div>
            <div class="row" style="margin: 0">
                <button id="courseClear" class="navbtn">コース消す</button>
                <button id="courseFit" class="navbtn">全体表示</button>
            </div>
        </div>
        <div id="map" style="height: 320px"></div>
        <div class="hint" id="map-hint" style="padding: 10px 12px">
            ① まず日付をクリックして選択 → ② 地図をクリックして点を追加 →
            線になります（自動保存）
        </div>
    </div>

    <script src="/js/config.js"></script>
    <script src="/js/main.js?v=2"></script>
</body>

</html>