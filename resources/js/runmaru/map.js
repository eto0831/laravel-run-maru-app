import { APP_CONFIG } from "./config.js";

// ===============================
// Google Maps loader (config.js からキーを読む)
// ===============================
export const loadGoogleMaps = () => {
    const apiKey = APP_CONFIG?.GOOGLE_MAPS_API_KEY;

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
// 距離計算
// ===============================
export const computeDistanceKm = (pathArr) => {
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

// ===============================
// UI更新
// ===============================
export const updateMapTitle = (selectedDateKey) => {
    const el = document.querySelector("#map-title");
    if (!el) return;
    el.textContent = `コース（${selectedDateKey}）`;
};

export const updateMapHint = (courseArr) => {
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

// ===============================
// 表示補助
// ===============================
export const fitCourse = (map, path) => {
    if (!map || !path || path.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    for (const p of path) bounds.extend(p);
    map.fitBounds(bounds);
};

// 現在地表示（AdvancedMarker版）
export const showMyLocation = (map) => {
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

export const createMap = () => {
    const mapEl = document.querySelector("#map");
    if (!mapEl) return null;

    const map = new google.maps.Map(mapEl, {
        center: { lat: 35.681236, lng: 139.767125 }, // 東京駅
        zoom: 14,
        mapId: APP_CONFIG?.GOOGLE_MAPS_MAP_ID,
        clickableIcons: false,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
    });

    const polyline = new google.maps.Polyline({
        map,
        path: [],
        geodesic: true,
    });

    return { map, polyline };
};
