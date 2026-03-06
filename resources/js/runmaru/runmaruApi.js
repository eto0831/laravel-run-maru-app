export async function apiGet(url) {
    const res = await fetch(url, {
        headers: {
            Accept: "application/json",
        },
    });
    if (!res.ok) {
        throw new Error(`GET ${url} failed: ${res.status}`);
    }
    return res.json();
}

export async function apiPut(url, body) {
    const res = await fetch(url, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        throw new Error(`PUT ${url} failed: ${res.status}`);
    }
    return res.json();
}

export async function fetchMarksForMonth(y, m) {
    const data = await apiGet(`/api/runmaru/marks?y=${y}&m=${m}`);
    return data?.marks && typeof data.marks === "object" ? data.marks : {};
}

export async function saveMark(day, marked) {
    return await apiPut("/api/runmaru/mark", { day, marked });
}

export async function fetchCourseForDay(day) {
    const data = await apiGet(
        `/api/runmaru/course?day=${encodeURIComponent(day)}`,
    );
    return Array.isArray(data?.path) ? data.path : [];
}

export async function saveCourse(day, path) {
    return await apiPut("/api/runmaru/course", {
        day,
        path: Array.isArray(path) ? path : [],
    });
}
