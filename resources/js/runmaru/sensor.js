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

                if (data.type === "dht") {
                    if (data.ok) {
                        $("#temp").textContent = String(data.t);
                        $("#hum").textContent = String(data.h);
                    }
                }

                if (data.type === "mpu") {
                    applyRotation?.(data.gx, data.gy, data.gz);
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
    ry = 0,
    rz = 0; // TODO: rz(=yaw) を追加

const DEAD = 1200;
const SCALE = 0.0000065;

let biasX = 0,
    biasY = 0,
    biasZ = 0; // TODO: Zのバイアスも取る
let biasCount = 0;
const BIAS_N = 50;

function applyRotation(gx, gy, gz) {
    const viewer = document.querySelector("#viewer");
    if (!viewer) return;

    // TODO: 起動直後だけゼロ点合わせ（この間センサー動かさない）
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

    // TODO: yaw(Z) を積分する（机上クルクルはココが動く）
    ry += gx * SCALE;
    rx += -gy * SCALE; // ← ここだけマイナス
    rz += gz * SCALE;

    // model-viewer の orientation は Roll/Pitch/Yaw を3つ与える例が公式デモにある :contentReference[oaicite:1]{index=1}
    viewer.orientation = `${rx}rad ${ry}rad ${rz}rad`;
}
