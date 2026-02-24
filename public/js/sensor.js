let port;
let reader;

const $ = (q) => document.querySelector(q);

async function connectSerial() {
    // なぜ：対応ブラウザか確認して落ち方をわかりやすくする
    if (!("serial" in navigator)) {
        alert("Web Serial非対応です。Chrome / Edgeで開いてね。");
        return;
    }

    // ユーザー操作必須（ボタン押下でしか開けない）
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });

    const decoder = new TextDecoderStream();
    port.readable.pipeTo(decoder.writable);
    reader = decoder.readable.getReader();

    readLoop();
}

async function readLoop() {
    let buf = "";

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;

        buf += value;

        // 1行（\n）ずつ処理
        let idx;
        while ((idx = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, idx).trim();
            buf = buf.slice(idx + 1);
            if (!line) continue;

            $("#raw").textContent = line;

            try {
                const data = JSON.parse(line);

                // 温湿度
                if (data.ok) {
                    $("#temp").textContent = String(data.t);
                    $("#hum").textContent = String(data.h);
                }

                // MPU6050
                if (data.type === "mpu") {
                    window.applyRotation?.(data.gx, data.gy);
                }
            } catch {
                // JSONじゃない行は無視
            }
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    $("#sensorConnect")?.addEventListener("click", connectSerial);
});

// sensor.js の上の方に追加
let rx = 0,
    ry = 0;
const DEAD = 1200;
const SCALE = 0.0000075;

let biasX = 0,
    biasY = 0;
let biasCount = 0;
const BIAS_N = 50;

function applyRotation(gx, gy) {
    const viewer = document.querySelector("#viewer");
    if (!viewer) return;

    // 起動直後だけゼロ点合わせ（この間センサー動かさない）
    if (biasCount < BIAS_N) {
        biasX += gx;
        biasY += gy;
        biasCount++;
        if (biasCount === BIAS_N) {
            biasX /= BIAS_N;
            biasY /= BIAS_N;
        }
        return;
    }

    gx -= biasX;
    gy -= biasY;

    if (Math.abs(gx) < DEAD) gx = 0;
    if (Math.abs(gy) < DEAD) gy = 0;

    ry += gx * SCALE;
    rx += gy * SCALE;

    viewer.orientation = `${rx}rad ${ry}rad 0rad`;
}
