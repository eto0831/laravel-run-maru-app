import "./sensor.js";
//import "./weather.js";

import {
    fetchMarksForMonth,
    saveMark,
    fetchCourseForDay,
    saveCourse,
} from "./runmaruApi.js";

import {
    dateKey,
    today,
    renderDow,
    renderHeader,
    renderGrid,
} from "./calendar.js";

import {
    loadGoogleMaps,
    updateMapTitle,
    updateMapHint,
    fitCourse,
    showMyLocation,
    createMap,
} from "./map.js";

import { createCourseStore } from "./course.js";

export function initRunmaru() {
    // ===============================
    // 初期化
    // ===============================
    document.addEventListener("DOMContentLoaded", async () => {
        document
            .querySelector("#toggleToday")
            ?.addEventListener("click", toggleToday);

        document.querySelector("#prev")?.addEventListener("click", async () => {
            view =
                view.m === 1
                    ? { y: view.y - 1, m: 12 }
                    : { y: view.y, m: view.m - 1 };
            await render();
        });

        document.querySelector("#next")?.addEventListener("click", async () => {
            view =
                view.m === 12
                    ? { y: view.y + 1, m: 1 }
                    : { y: view.y, m: view.m + 1 };
            await render();
        });

        document
            .querySelector("#jumpToday")
            ?.addEventListener("click", async () => {
                const t = today();
                view = { y: t.y, m: t.m };
                selectedDateKey = dateKey(t.y, t.m, t.d);
                await render();
                await loadCourseToMap();
            });

        document
            .querySelector("#clearAll")
            ?.addEventListener("click", clearAll);

        renderDow();

        // 最初の月marksを取って描画
        await render();

        // mapがまだでもヒント/タイトルは更新しておく
        updateMapTitle(selectedDateKey);
        updateMapHint(courseStore.getFromCache(selectedDateKey));

        // Google Maps を動的ロード（完了後 callback=initMap）
        loadGoogleMaps();
    });
}

// ===============================
// Run Maru + Google Maps Course
// main.js（Laravel API / DB 版）
// ===============================

// ===============================
// 状態（DBが正）
// ===============================

// marks: { "YYYY-MM-DD": true }
let marks = {};

let view = (() => {
    const t = today();
    return { y: t.y, m: t.m };
})();

let selectedDateKey = (() => {
    const t = today();
    return dateKey(t.y, t.m, t.d);
})();

// 二重操作防止（連打ガード）
let isBusy = false;

// ===============================
// Marks API
// ===============================
const loadMarksForMonth = async (y, m) => {
    marks = await fetchMarksForMonth(y, m);
};

const setMarkOnServer = async (dayKey, marked) => {
    await saveMark(dayKey, marked);
};

// ===============================
// Course API
// ===============================
const courseStore = createCourseStore({
    fetchCourseForDay,
    saveCourse,
});

// ===============================
// Google Maps state
// ===============================
let map;
let polyline;
let path = []; // selectedDateKey の編集パス

// 選択中の日付のコースを API→地図へ反映（async）
const loadCourseToMap = async () => {
    updateMapTitle(selectedDateKey);

    try {
        const course = await courseStore.loadForDay(selectedDateKey);
        updateMapHint(course);

        if (!map || !polyline) return;

        path = course;
        polyline.setPath(path);

        if (path.length >= 2) fitCourse(map, path);
    } catch (e) {
        console.error(e);
        updateMapHint([]); // 取れない時は空扱い
    }
};

// ===============================
// 操作（⭕️）
// ===============================
const toggle = async (key) => {
    if (isBusy) return;
    isBusy = true;

    // optimistic UI（先に見た目更新）
    const next = !marks[key];
    if (next) marks[key] = true;
    else delete marks[key];

    renderSync(); // 画面だけ先に更新

    try {
        await setMarkOnServer(key, next);
    } catch (e) {
        // 失敗したら戻す
        if (!next) marks[key] = true;
        else delete marks[key];
        renderSync();
        alert("保存に失敗しました（通信/サーバを確認）");
        console.error(e);
    } finally {
        isBusy = false;
    }
};

const toggleToday = async () => {
    const t = today();
    await toggle(dateKey(t.y, t.m, t.d));
};

// 注意：バックエンドに「全削除API」は作ってない前提。
// ここでは「今ロード済みのmarks + キャッシュ済みコース」を消す。
// 完全に全月消すなら、Laravel側で一括削除エンドポイントを作るのが正道。
const clearAll = async () => {
    console.log("marks keys:", Object.keys(marks));
    console.log("course keys:", courseStore.keys());
    const ok = confirm("記録（⭕️とコース）を全部消します。よろしいですか？");
    if (!ok) return;
    if (isBusy) return;

    isBusy = true;
    try {
        // 1) marks を全部 OFF（今持ってる分だけ）
        const keys = Object.keys(marks);
        for (const k of keys) {
            await setMarkOnServer(k, false);
        }
        marks = {};

        // 2) コースは「空配列」で上書き（キャッシュ分だけ）
        const ckeys = courseStore.keys();

        for (const k of ckeys) {
            await courseStore.saveForDay(k, []);
        }

        courseStore.clearCache();

        // 3) 画面状態も初期化
        path = [];
        if (polyline) polyline.setPath([]);

        renderSync();
        await loadCourseToMap();
    } catch (e) {
        alert("削除に失敗しました（通信/サーバを確認）");
        console.error(e);
    } finally {
        isBusy = false;
    }
};

// render は「描画だけ（同期）」と「月marksロード込み（非同期）」に分ける
const renderSync = () => {
    const t = today();
    const todayKeyStr = dateKey(t.y, t.m, t.d);

    renderHeader({ view, marks, todayKey: todayKeyStr });

    renderGrid({
        view,
        marks,
        selectedDateKey,
        onSelectDate: async (key) => {
            selectedDateKey = key;
            renderSync();
            await loadCourseToMap();
        },
        onToggleMark: async (key) => {
            await toggle(key);
        },
    });
    updateMapTitle(selectedDateKey);
};

const render = async () => {
    await loadMarksForMonth(view.y, view.m);
    renderSync();
};

// ===============================
// Google Maps init (callback=initMap)
// ===============================
const initMap = () => {
    const created = createMap();
    if (!created) return;

    map = created.map;
    polyline = created.polyline;

    // 地図クリックで点追加 → 自動保存（API）
    map.addListener("click", async (e) => {
        if (!selectedDateKey) return;
        if (isBusy) return;

        // 先に画面へ反映
        path = [...path, { lat: e.latLng.lat(), lng: e.latLng.lng() }];
        polyline.setPath(path);
        updateMapHint(path);

        try {
            await courseStore.saveForDay(selectedDateKey, path);
        } catch (err) {
            alert("コース保存に失敗しました（通信/サーバを確認）");
            console.error(err);
            // 失敗時はサーバ状態に戻す（安全）
            await loadCourseToMap();
        }
    });

    // ボタン：コース削除（APIで空配列保存）
    document
        .querySelector("#courseClear")
        ?.addEventListener("click", async () => {
            const ok = confirm(
                `${selectedDateKey} のコースを消します。よろしいですか？`,
            );
            if (!ok) return;

            if (isBusy) return;
            isBusy = true;

            try {
                path = [];
                polyline.setPath(path);
                updateMapHint(path);
                await courseStore.saveForDay(selectedDateKey, []);
            } catch (e) {
                alert("削除に失敗しました（通信/サーバを確認）");
                console.error(e);
                await loadCourseToMap();
            } finally {
                isBusy = false;
            }
        });

    document.querySelector("#courseFit")?.addEventListener("click", () => {
        fitCourse(map, path);
    });

    // 初回ロード
    loadCourseToMap();
    showMyLocation(map);
};

// callback から見えるように window に生やす
window.initMap = initMap;
