// const $ = (q) => document.querySelector(q);

// function getCurrentPositionAsync() {
//     return new Promise((resolve, reject) => {
//         navigator.geolocation.getCurrentPosition(resolve, reject);
//     });
// }

let map;
let marker;

async function showCurrentLocationMap() {
    try {
        const pos = await getCurrentPositionAsync();

        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        $("#mapResult").textContent = `lat: ${lat}\nlon: ${lon}`;

        const center = { lat, lng: lon };

        if (!map) {
            map = new google.maps.Map($("#testMap"), {
                center,
                zoom: 16,
                mapId: APP_CONFIG.GOOGLE_MAPS_MAP_ID,
            });

            marker = new google.maps.marker.AdvancedMarkerElement({
                position: center,
                map: map,
            });
        } else {
            map.setCenter(center);
            marker.setPosition(center);
        }
    } catch (err) {
        console.error(err);
        $("#mapResult").textContent = "現在地の取得に失敗しました";
    }
}

$("#btnShowMap")?.addEventListener("click", showCurrentLocationMap);

let lineMap;
let lineMarkers = [];
let linePoints = [];
let polyline;

let directionsRenderer = null;

async function showLineMap() {
    try {
        const pos = await getCurrentPositionAsync();
        console.log(pos.coords);

        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        const center = { lat, lng: lon };

        $("#lineMapResult").textContent =
            "地図をクリックすると点が増えて、線でつながります";

        if (lineMap) {
            lineMap.setCenter(center);
            return;
        }

        lineMap = new google.maps.Map($("#testLineMap"), {
            center,
            zoom: 16,
            mapId: APP_CONFIG.GOOGLE_MAPS_MAP_ID,
        });

        polyline = new google.maps.Polyline({
            map: lineMap,
            path: [],
            geodesic: true,
            strokeOpacity: 1.0,
            strokeWeight: 3,
        });

        // 歩行者ルート用レンダラー部分
        directionsRenderer = new google.maps.DirectionsRenderer({
            suppressMarkers: false,
            preserveViewport: true,
        });
        directionsRenderer.setMap(lineMap);

        lineMap.addListener("click", (e) => {
            const point = {
                lat: e.latLng.lat(),
                lng: e.latLng.lng(),
            };

            linePoints.push(point);

            const marker = new google.maps.marker.AdvancedMarkerElement({
                map: lineMap,
                position: point,
            });

            lineMarkers.push(marker);

            polyline.setPath(linePoints);
            renderDistance();
            renderSegmentDistance();

            $("#lineMapResult").textContent =
                `点の数: ${linePoints.length}\n` +
                `最後の点: ${point.lat}, ${point.lng}`;
        });
    } catch (err) {
        console.error(err);
        $("#lineMapResult").textContent = "線用マップの表示に失敗しました";
    }
}

$("#btnShowLineMap")?.addEventListener("click", showLineMap);

function undoLastPoint() {
    if (linePoints.length === 0) {
        $("#lineMapResult").textContent = "戻せる点がありません";
        return;
    }

    linePoints.pop();

    const lastMarker = lineMarkers.pop();
    if (lastMarker) {
        lastMarker.map = null;
    }

    polyline.setPath(linePoints);
    renderDistance();
    renderSegmentDistance();

    if (linePoints.length === 0) {
        $("#lineMapResult").textContent = "点が０個になりました。";
        return;
    }
    const lastPoint = linePoints[linePoints.length - 1];
    $("#lineMapResult").textContent =
        `点の数: ${linePoints.length}\n` +
        `最後の点: ${lastPoint.lat}, ${lastPoint.lng}`;
}

$("#btnUndoPoint")?.addEventListener("click", undoLastPoint);

function clearAllPointForDay() {
    // 削除対象があるか確認
    if (linePoints.length === 0) {
        $("#lineMapResult").textContent = "削除できる点がありません";
        return;
    }

    // マーカを地図から外す必要がある
    lineMarkers.forEach((marker) => {
        marker.map = null;
    });

    // 配列リセット
    linePoints = [];
    lineMarkers = [];

    // 線も消す
    polyline.setPath(linePoints);
    renderDistance();
    renderSegmentDistance();

    $("#lineMapResult").textContent = "全て削除しました";
}

$("#clearAllPoints")?.addEventListener("click", clearAllPointForDay);

function showDistanceAlongPath(pathArr) {
    if (!pathArr || pathArr.length < 2) return 0;

    if (
        typeof window.google === "undefined" ||
        !window.google.maps?.geometry?.spherical?.computeLength
    ) {
        console.log("geometry library が読み込まれていません");
        return 0;
    }

    const latLngs = pathArr.map(
        (p) => new window.google.maps.LatLng(p.lat, p.lng),
    );

    const meters = window.google.maps.geometry.spherical.computeLength(latLngs);

    return meters / 1000;
}

function renderDistance() {
    const el = $("#mapDistance");
    if (!el) return;

    const distance = showDistanceAlongPath(linePoints);
    el.textContent = `距離: ${distance.toFixed(2)} km`;
}

function getLastSegmentDistance(points) {
    if (!points || points.length < 2) return 0;
    const last = points[points.length - 1];
    const prev = points[points.length - 2];

    const p1 = new google.maps.LatLng(prev.lat, prev.lng);
    const p2 = new google.maps.LatLng(last.lat, last.lng);

    const meters = google.maps.geometry.spherical.computeDistanceBetween(
        p1,
        p2,
    );
    return meters;
}

function renderSegmentDistance() {
    const meters = getLastSegmentDistance(linePoints);

    $("#segmentDistance").textContent = `この区間: ${meters.toFixed(0)} m`;
}

let watchId = null;

function startTracking() {
    if (!navigator.geolocation) {
        $("#trackStatus").textContent = "このブラウザでは位置情報が使えません";
        return;
    }

    if (!lineMap || !polyline) {
        $("#trackStatus").textContent = "先に線用マップを表示してください";
        return;
    }

    if (watchId !== null) {
        $("#trackStatus").textContent = "すでに記録中です";
        return;
    }

    $("#trackStatus").textContent = "記録中...";

    watchId = navigator.geolocation.watchPosition(
        (pos) => {
            const point = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
            };

            linePoints.push(point);
            polyline.setPath(linePoints);

            lineMap.setCenter(point);
            renderDistance();

            $("#lineMapResult").textContent =
                `点の数: ${linePoints.length}\n` +
                `lat: ${point.lat}\nlng: ${point.lng}`;
        },
        (err) => {
            console.error(err);
            $("#trackStatus").textContent = `位置取得エラー: ${err.message}`;
        },
        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000,
        },
    );
}

$("#btnStartTrack")?.addEventListener("click", startTracking);

function stopTracking() {
    if (watchId === null) {
        $("#trackStatus").textContent = "記録していません";
        return;
    }

    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    $("#trackStatus").textContent = "停止中";
}

$("#btnStopTrack")?.addEventListener("click", stopTracking);

async function drawWalkingRoute(origin, destination) {
    try {
        const directionsService = new google.maps.DirectionsService();

        const result = await directionsService.route({
            origin,
            destination,
            travelMode: google.maps.TravelMode.WALKING,
        });

        if (!directionsRenderer) {
            directionsRenderer = new google.maps.DirectionsRenderer({
                suppressMarkers: false,
                preserveViewport: true,
            });
            directionsRenderer.setMap(lineMap);
        }

        // ① ルートを地図に描画
        directionsRenderer.setDirections(result);

        // ②ルート全体が見えるように表示範囲を調整
        const bounds = new google.maps.LatLngBounds();
        const route = result.routes[0].overview_path;

        route.forEach((p) => {
            bounds.extend(p);
        });

        lineMap.fitBounds(bounds);

        // ③ 距離と時間を表示
        const leg = result.routes[0]?.legs?.[0];
        if (leg && $("#routeResult")) {
            $("#routeResult").textContent =
                `距離: ${leg.distance?.text ?? "-"}\n` +
                `時間: ${leg.duration?.text ?? "-"}`;
        }
    } catch (err) {
        console.error(err);
        if ($("#routeResult")) {
            $("#routeResult").textContent = "歩行ルート取得に失敗しました";
        }
    }
}

async function drawWalkingRouteFromPoints() {
    if (!lineMap) {
        $("#routeResult").textContent = "先に線用マップを表示してください";
        return;
    }

    if (linePoints.length < 2) {
        $("#routeResult").textContent = "2点以上置いてください";
        return;
    }

    const origin = linePoints[0];
    const destination = linePoints[linePoints.length - 1];
    await drawWalkingRoute(origin, destination);
}

$("#btnDrawWalkingRoute")?.addEventListener(
    "click",
    drawWalkingRouteFromPoints,
);
