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

$("#btnShowLineMap")?.addEventListener("click", showLineMap);
$("#btnUndoPoint")?.addEventListener("click", undoLastPoint);
$("#clearAllPoints")?.addEventListener("click", clearAllPointForDay);
