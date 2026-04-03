let port;
let reader;

let rx = 0;
let ry = 0;
let rz = 0;

const DEAD = 1200;
const SCALE = 0.0000065;

let biasX = 0;
let biasY = 0;
let biasZ = 0;
let biasCount = 0;
const BIAS_N = 50;

// const $ = (q) => document.querySelector(q);

async function connectSerial() {
    // なぜ：対応ブラウザか確認して落ち方をわかりやすくする
    if (!("serial" in navigator)) {
        alert("Web Serial非対応です。Chrome / Edgeで開いてね。");
        return;
    }

    try {
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 115200 });

        const decoder = new TextDecoderStream();
        port.readable.pipeTo(decoder.writable);
        reader = decoder.readable.getReader();

        readLoop();
    } catch (err) {
        console.error(err);
        alert("シリアル接続に失敗しました");
    }
}

async function readLoop() {
    let buf = "";

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;

        buf += value;

        let idx;

        while ((idx = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, idx).trim();
            buf = buf.slice(idx + 1);

            if (!line) continue;

            if ($("#rawTest")) {
                $("#rawTest").textContent = line;
            }

            try {
                const data = JSON.parse(line);

                if (data.type === "dht") {
                    if (data.ok) {
                        if ($("#tempTest"))
                            $("#tempTest").textContent = String(data.t);
                        if ($("#humTest"))
                            $("#humTest").textContent = String(data.h);
                    }
                }

                if (data.type === "mpu") {
                    applyRotation?.(data.gx, data.gy, data.gz);
                }
            } catch (err) {
                // JSONじゃない行は無視
            }
        }
    }
}

function applyRotation(gx, gy, gz) {
    const viewer = $("#viewerTest");
    if (!viewer) return;

    // なぜ：起動直後の静止値を平均してドリフトを少し減らすため
    if (biasCount < BIAS_N) {
        biasX += gx;
        biasY += gy;
        biasZ += gz;
        biasCount++;

        if (biasCount === BIAS_N) {
            biasX /= BIAS_N;
            biasY /= BIAS_N;
            biasZ /= BIAS_N;
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
    $("#sensorConnectTest")?.addEventListener("click", connectSerial);
});
