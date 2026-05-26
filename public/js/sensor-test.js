let rx = 0;
let ry = 0;
let rz = 0;

const DEAD = 1200;
const SCALE = 0.000015;

let biasX = 0;
let biasY = 0;
let biasZ = 0;
let biasCount = 0;
const BIAS_N = 50;

const sensorQs = (q) => document.querySelector(q);

const SERVICE_UUID = "12345678-1234-1234-1234-1234567890ab";
const CHARACTERISTIC_UUID = "abcd1234-5678-1234-5678-abcdef123456";

async function connectBle() {
    if (!("bluetooth" in navigator)) {
        alert("Web Bluetooth非対応です。Android Chromeで開いてね。");
        return;
    }

    try {
        sensorQs("#rawTest").textContent = "接続待機中...";

        const device = await navigator.bluetooth.requestDevice({
            filters: [{ namePrefix: "ETO" }],
            optionalServices: [SERVICE_UUID],
        });

        sensorQs("#rawTest").textContent = "接続中...";

        const server = await device.gatt.connect();
        const service = await server.getPrimaryService(SERVICE_UUID);
        const characteristic =
            await service.getCharacteristic(CHARACTERISTIC_UUID);

        await characteristic.startNotifications();

        characteristic.addEventListener(
            "characteristicvaluechanged",
            (event) => {
                const line = new TextDecoder()
                    .decode(event.target.value)
                    .trim();
                handleSensorLine(line);
            },
        );

        sensorQs("#rawTest").textContent = "BLE connected";

        device.addEventListener("gattserverdisconnected", () => {
            sensorQs("#rawTest").textContent = "BLE disconnected";
        });
    } catch (err) {
        console.error(err);
        alert("BLE接続に失敗しました");
        sensorQs("#rawTest").textContent = String(err);
    }
}

function handleSensorLine(line) {
    if (!line) return;

    sensorQs("#rawTest").textContent = line;

    try {
        const data = JSON.parse(line);

        if (data.type === "dht") {
            if (data.ok) {
                sensorQs("#tempTest").textContent = String(data.t);
                sensorQs("#humTest").textContent = String(data.h);
            }
            return;
        }

        if (data.type === "mpu") {
            applyRotation(data.gx, data.gy, data.gz);
            return;
        }
    } catch (err) {
        console.log("JSON parse error:", line);
    }
}

function applyRotation(gx, gy, gz) {
    const viewer = sensorQs("#viewerTest");

    if (!viewer) {
        console.log("viewerTest not found");
        return;
    }

    if (biasCount < BIAS_N) {
        biasX += gx;
        biasY += gy;
        biasZ += gz;
        biasCount++;

        if (biasCount === BIAS_N) {
            biasX /= BIAS_N;
            biasY /= BIAS_N;
            biasZ /= BIAS_N;
            console.log("bias fixed", biasX, biasY, biasZ);
        }

        return;
    }

    gx -= biasX;
    gy -= biasY;
    gz -= biasZ;

    if (Math.abs(gx) < DEAD) gx = 0;
    if (Math.abs(gy) < DEAD) gy = 0;
    if (Math.abs(gz) < DEAD) gz = 0;

    ry += gx * SCALE;
    rx += -gy * SCALE;
    rz += gz * SCALE;

    viewer.orientation = `${rx}rad ${ry}rad ${rz}rad`;
}

document.addEventListener("DOMContentLoaded", () => {
    sensorQs("#sensorConnectTest")?.addEventListener("click", connectBle);
});
