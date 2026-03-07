// ===============================
// 日付ユーティリティ
// ===============================
export const pad2 = (n) => String(n).padStart(2, "0");
export const dateKey = (y, m, d) => `${y}-${pad2(m)}-${pad2(d)}`; // m:1-12
export const today = () => {
    const t = new Date();
    return { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() };
};
export const daysInMonth = (y, m) => new Date(y, m, 0).getDate(); // m:1-12
export const firstDow = (y, m) => new Date(y, m - 1, 1).getDay(); // 0:Sun

// ===============================
// 描画（カレンダー）
// ===============================
export const renderDow = () => {
    const dow = document.querySelector("#dow");
    const labels = ["日", "月", "火", "水", "木", "金", "土"];
    dow.innerHTML = labels.map((l) => `<div class="dow">${l}</div>`).join("");
};

export const renderHeader = ({ view, marks, todayKey }) => {
    document.querySelector("#title").textContent = `${view.y}年 ${view.m}月`;

    const btn = document.querySelector("#toggleToday");
    if (btn)
        btn.textContent = marks[todayKey] ? "今日の⭕️を外す" : "今日を⭕️にする";

    document.querySelector("#status").textContent = marks[todayKey]
        ? `✅ 今日は⭕️（${todayKey}）`
        : `⬜ 今日は未記録（${todayKey}）`;
};

export const renderGrid = ({
    view,
    marks,
    selectedDateKey,
    onSelectDate,
    onToggleMark,
}) => {
    const grid = document.querySelector("#grid");
    grid.innerHTML = "";

    const { y, m } = view;
    const total = daysInMonth(y, m);
    const start = firstDow(y, m);

    // 空白セル
    for (let i = 0; i < start; i++) {
        const div = document.createElement("div");
        div.className = "cell muted";
        div.style.cursor = "default";
        div.innerHTML = `<div class="day"> </div><div class="mark"> </div>`;
        grid.append(div);
    }

    const t = today();
    const todayKeyStr = dateKey(t.y, t.m, t.d);

    for (let d = 1; d <= total; d++) {
        const key = dateKey(y, m, d);
        const div = document.createElement("div");
        div.className = "cell";

        // 今日枠
        if (key === todayKeyStr) div.classList.add("today");

        // 選択中の日（コース編集対象）
        if (key === selectedDateKey) {
            div.style.background = "#f0f7ff";
            div.style.border = "2px solid #3b82f6";
        }

        const marked = !!marks[key];
        div.innerHTML = `
      <div class="day">${d}</div>
      <div class="mark">${marked ? "⭕️" : ""}</div>
    `;

        // クリックで：①日付選択（コース用） ② Shift+クリックで⭕️もトグル
        div.addEventListener("click", async (e) => {
            await onSelectDate(key);

            if (e.shiftKey) {
                await onToggleMark(key);
            }
        });

        grid.append(div);
    }

    // 端数埋め
    const cells = start + total;
    const remainder = (7 - (cells % 7)) % 7;
    for (let i = 0; i < remainder; i++) {
        const div = document.createElement("div");
        div.className = "cell muted";
        div.style.cursor = "default";
        div.innerHTML = `<div class="day"> </div><div class="mark"> </div>`;
        grid.append(div);
    }
};
