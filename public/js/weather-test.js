// const $ = (q) => document.querySelector(q);

// function getCurrentPositionAsync() {
//     return new Promise((resolve, reject) => {
//         navigator.geolocation.getCurrentPosition(resolve, reject);
//     });
// }

async function testCurrentLocation() {
    try {
        const pos = await getCurrentPositionAsync();

        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        const res = await fetch(`api/weather?lat=${lat}&lon=${lon}`);

        if (!res.ok) {
            const text = await res.text();
            console.error("HTTPエラー:", res.status, text);
            document.querySelector("#result").textContent =
                `HTTP ${res.status}\n${text}`;
            return;
        }
        const data = await res.json();

        console.log(data);

        const HOUR = 60 * 60 * 1000;
        const baseTime = new Date(Date.now() + 8 * HOUR);

        const picked = pickRainByTargetTime(data, baseTime);

        $("#result").textContent =
            `基準時刻: ${baseTime.toLocaleString()}\n` +
            `取得時刻:${picked.time}\n` +
            `降水確率:${picked.rain} %`;
    } catch (err) {
        console.error(err);
        $("#result").textContent = "現在地の取得に失敗しました";
    }
}
document
    .querySelector("#btnCurrentLocation")
    ?.addEventListener("click", testCurrentLocation);

function pickRainByTargetTime(data, baseTime) {
    const times = data.times;
    const rain = data.rain_prob;

    // TODO 2: 一番近い index を探す
    let nearestIndex = 0;
    let minDiff = Infinity;

    for (let i = 0; i < times.length; i++) {
        const target = new Date(times[i]);
        const diff = Math.abs(target.getTime() - baseTime.getTime());

        if (diff < minDiff) {
            minDiff = diff;
            nearestIndex = i;
        }
    }

    // TODO 3: rain_prob[index] を返す
    return {
        time: times[nearestIndex],
        rain: rain[nearestIndex],
    };
}
