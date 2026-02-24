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
                if (data.ok) {
                    $("#temp").textContent = String(data.t);
                    $("#hum").textContent = String(data.h);
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
