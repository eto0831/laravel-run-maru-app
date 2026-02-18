// ===============================
// Run Maru + Google Maps Course
// main.js（Laravel API / DB 版）
// ===============================

// ===============================
// Google Maps loader (config.js からキーを読む)
// ===============================
const loadGoogleMaps = () => {
    const apiKey = window.APP_CONFIG?.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
        alert("Google Maps API Key が見つかりません（config.js を確認）");
        return;
    }

    // 二重読み込み防止
    if (document.querySelector('script[data-gmaps="1"]')) return;

    const script = document.createElement("script");
    script.dataset.gmaps = "1";
    script.src =
        `https://maps.googleapis.com/maps/api/js` +
        `?key=${encodeURIComponent(apiKey)}` +
        `&libraries=geometry,marker` +
        `&callback=initMap` +
        `&loading=async`;

    script.async = true;
    document.head.appendChild(script);
};

// ===============================
// API helper
// ===============================
async function apiGet(url) {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
    return res.json();
}

async function apiPut(url, body) {
    const res = await fetch(url, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`PUT ${url} failed: ${res.status}`);
    return res.json();
}

// ===============================
// 日付ユーティリティ
// ===============================
const pad2 = (n) => String(n).padStart(2, "0");
const dateKey = (y, m, d) => `${y}-${pad2(m)}-${pad2(d)}`; // m:1-12
const today = () => {
    const t = new Date();
    return { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() };
};
const daysInMonth = (y, m) => new Date(y, m, 0).getDate(); // m:1-12
const firstDow = (y, m) => new Date(y, m - 1, 1).getDay(); // 0:Sun

// ===============================
// 状態（DBが正）
// ===============================
// marks: { "YYYY-MM-DD": true }
let marks = {};
// コースキャッシュ: { "YYYY-MM-DD": [{lat,lng}, ...] }
let courseCache = {};

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
    const data = await apiGet(`/api/runmaru/marks?y=${y}&m=${m}`);
    marks = data?.marks && typeof data.marks === "object" ? data.marks : {};
};

const setMarkOnServer = async (dayKey, marked) => {
    await apiPut("/api/runmaru/mark", { day: dayKey, marked });
};

// ===============================
// Course API
// ===============================
const getCourseFromCache = (dayKey) => {
    const arr = courseCache[dayKey];
    return Array.isArray(arr) ? arr : [];
};

const loadCourseForDay = async (dayKey) => {
    // 既にキャッシュあるならそれを使う（必要なら強制リロードも作れる）
    if (Array.isArray(courseCache[dayKey])) return courseCache[dayKey];

    const data = await apiGet(
        `/api/runmaru/course?day=${encodeURIComponent(dayKey)}`,
    );
    const pathArr = Array.isArray(data?.path) ? data.path : [];
    courseCache[dayKey] = pathArr;
    return pathArr;
};

const saveCourseForDay = async (dayKey, pathArr) => {
    // 先にキャッシュ更新（体感が速い）
    courseCache[dayKey] = Array.isArray(pathArr) ? pathArr : [];
    await apiPut("/api/runmaru/course", {
        day: dayKey,
        path: courseCache[dayKey],
    });
};

// ===============================
// Google Maps state
// ===============================
let map;
let polyline;
let path = []; // selectedDateKey の編集パス

// 距離計算（geometryライブラリが必要）
const computeDistanceKm = (pathArr) => {
    if (!pathArr || pathArr.length < 2) return 0;

    if (
        typeof window.google === "undefined" ||
        !window.google.maps?.geometry?.spherical?.computeLength
    ) {
        return 0;
    }

    const latLngs = pathArr.map(
        (p) => new window.google.maps.LatLng(p.lat, p.lng),
    );
    const meters = window.google.maps.geometry.spherical.computeLength(latLngs);
    return meters / 1000;
};

const updateMapTitle = () => {
    const el = document.querySelector("#map-title");
    if (!el) return;
    el.textContent = `コース（${selectedDateKey}）`;
};

const updateMapHint = (courseArr) => {
    const el = document.querySelector("#map-hint");
    if (!el) return;

    const course = Array.isArray(courseArr) ? courseArr : [];
    const km = computeDistanceKm(course);

    if (course.length < 2) {
        el.textContent =
            "地図をクリックして点を追加 → 線になります（自動保存）。2点以上で距離が出ます。";
    } else {
        el.textContent = `点:${course.length}  距離:${km.toFixed(
            2,
        )} km（クリックで点を追加 / コース消すで削除）`;
    }
};

const fitCourse = () => {
    if (!map || !path || path.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    for (const p of path) bounds.extend(p);
    map.fitBounds(bounds);
};

// 選択中の日付のコースを API→地図へ反映（async）
const loadCourseToMap = async () => {
    updateMapTitle();

    try {
        const course = await loadCourseForDay(selectedDateKey);
        updateMapHint(course);

        if (!map || !polyline) return;

        path = course;
        polyline.setPath(path);

        if (path.length >= 2) fitCourse();
    } catch (e) {
        console.error(e);
        updateMapHint([]); // 取れない時は空扱い
    }
};

// 現在地表示（AdvancedMarker版）
const showMyLocation = () => {
    if (!navigator.geolocation) {
        alert("このブラウザは位置情報に対応していません");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            if (!map) return;

            map.setCenter(me);
            map.setZoom(16);

            new google.maps.marker.AdvancedMarkerElement({
                position: me,
                map,
                title: "現在地",
            });
        },
        (err) => {
            alert(`現在地を取得できませんでした: ${err.message}`);
            console.error(err);
        },
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 60000 },
    );
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
        const ckeys = Object.keys(courseCache);
        for (const k of ckeys) {
            await saveCourseForDay(k, []);
        }
        courseCache = {};

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

// ===============================
// 描画（カレンダー）
// ===============================
const renderDow = () => {
    const dow = document.querySelector("#dow");
    const labels = ["日", "月", "火", "水", "木", "金", "土"];
    dow.innerHTML = labels.map((l) => `<div class="dow">${l}</div>`).join("");
};

const renderHeader = () => {
    document.querySelector("#title").textContent = `${view.y}年 ${view.m}月`;

    const t = today();
    const key = dateKey(t.y, t.m, t.d);

    const btn = document.querySelector("#toggleToday");
    if (btn) btn.textContent = marks[key] ? "今日の⭕️を外す" : "今日を⭕️にする";

    document.querySelector("#status").textContent = marks[key]
        ? `✅ 今日は⭕️（${key}）`
        : `⬜ 今日は未記録（${key}）`;
};

const renderGrid = () => {
    const grid = document.querySelector("#grid");
    grid.innerHTML = "";

    const { y, m } = view;
    const total = daysInMonth(y, m);
    const start = firstDow(y, m);

    // 空白セル
    for (let i = 0; i < start; i++) {
        const div = document.createElement("div");
        div.className = "cell muted";
        div.style.cursor = "default";
        div.innerHTML = `<div class="day"> </div><div class="mark"> </div>`;
        grid.append(div);
    }

    const t = today();
    const todayKeyStr = dateKey(t.y, t.m, t.d);

    for (let d = 1; d <= total; d++) {
        const key = dateKey(y, m, d);
        const div = document.createElement("div");
        div.className = "cell";

        // 今日枠
        if (key === todayKeyStr) div.classList.add("today");

        // 選択中の日（コース編集対象）
        if (key === selectedDateKey) {
            div.style.background = "#f0f7ff";
            div.style.border = "2px solid #3b82f6";
        }

        const marked = !!marks[key];
        div.innerHTML = `
      <div class="day">${d}</div>
      <div class="mark">${marked ? "⭕️" : ""}</div>
    `;

        // クリックで：①日付選択（コース用） ② Shift+クリックで⭕️もトグル
        div.addEventListener("click", async (e) => {
            selectedDateKey = key;
            renderSync(); // 選択の見た目更新
            await loadCourseToMap(); // 地図にその日のコースを反映（API）

            if (e.shiftKey) {
                await toggle(key);
            }
        });

        grid.append(div);
    }

    // 端数埋め
    const cells = start + total;
    const remainder = (7 - (cells % 7)) % 7;
    for (let i = 0; i < remainder; i++) {
        const div = document.createElement("div");
        div.className = "cell muted";
        div.style.cursor = "default";
        div.innerHTML = `<div class="day"> </div><div class="mark"> </div>`;
        grid.append(div);
    }
};

// render は「描画だけ（同期）」と「月marksロード込み（非同期）」に分ける
const renderSync = () => {
    renderHeader();
    renderGrid();
    updateMapTitle(); // mapが無くてもタイトルは更新できる
};

const render = async () => {
    await loadMarksForMonth(view.y, view.m);
    renderSync();
};

// ===============================
// Google Maps init (callback=initMap)
// ===============================
const initMap = () => {
    const mapEl = document.querySelector("#map");
    if (!mapEl) return;

    map = new google.maps.Map(mapEl, {
        center: { lat: 35.681236, lng: 139.767125 }, // 東京駅
        zoom: 14,
        mapId: window.APP_CONFIG?.GOOGLE_MAPS_MAP_ID,
        clickableIcons: false,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
    });

    polyline = new google.maps.Polyline({
        map,
        path: [],
        geodesic: true,
    });

    // 地図クリックで点追加 → 自動保存（API）
    map.addListener("click", async (e) => {
        if (!selectedDateKey) return;
        if (isBusy) return;

        // 先に画面へ反映
        path = [...path, { lat: e.latLng.lat(), lng: e.latLng.lng() }];
        polyline.setPath(path);
        updateMapHint(path);

        try {
            await saveCourseForDay(selectedDateKey, path);
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
                await saveCourseForDay(selectedDateKey, []);
            } catch (e) {
                alert("削除に失敗しました（通信/サーバを確認）");
                console.error(e);
                await loadCourseToMap();
            } finally {
                isBusy = false;
            }
        });

    document.querySelector("#courseFit")?.addEventListener("click", () => {
        fitCourse();
    });

    // 初回ロード
    loadCourseToMap();
    showMyLocation();
};

// callback から見えるように window に生やす
window.initMap = initMap;

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

    document.querySelector("#clearAll")?.addEventListener("click", clearAll);

    renderDow();

    // 最初の月marksを取って描画
    await render();

    // mapがまだでもヒント/タイトルは更新しておく
    updateMapTitle();
    updateMapHint(getCourseFromCache(selectedDateKey));

    // Google Maps を動的ロード（完了後 callback=initMap）
    loadGoogleMaps();
});
