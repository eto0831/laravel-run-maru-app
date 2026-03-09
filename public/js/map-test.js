// const $ = (q) => document.querySelector(q);
let map;
let marker;

// function getCurrentPositionAsync() {
//     return new Promise((resolve, reject) => {
//         navigator.geolocation.getCurrentPosition(resolve, reject);
//     });
// }

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
