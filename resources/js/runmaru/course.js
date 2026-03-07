export function createCourseStore({ fetchCourseForDay, saveCourse }) {
    // なぜ：cache を main.js から隔離する
    // コースキャッシュ: { "YYYY-MM-DD": [{lat,lng}, ...] }
    const courseCache = {};

    // =========================
    // TODO ① cache取得
    // =========================
    const getFromCache = (dayKey) => {
        const arr = courseCache[dayKey];
        return Array.isArray(arr) ? arr : [];
    };

    // =========================
    // TODO ② APIロード
    // =========================
    const loadForDay = async (dayKey) => {
        if (Array.isArray(courseCache[dayKey])) {
            return courseCache[dayKey];
        }

        const pathArr = await fetchCourseForDay(dayKey);

        courseCache[dayKey] = pathArr;
        return pathArr;
    };
    // =========================
    // TODO ③ 保存
    // =========================
    const saveForDay = async (dayKey, pathArr) => {
        courseCache[dayKey] = Array.isArray(pathArr) ? pathArr : [];

        await saveCourse(dayKey, courseCache[dayKey]);
    };

    // =========================
    // cache keys
    // =========================
    const keys = () => {
        return Object.keys(courseCache);
    };

    // =========================
    // cache clear
    // =========================
    const clearCache = () => {
        for (const k of Object.keys(courseCache)) {
            delete courseCache[k];
        }
    };

    return {
        getFromCache,
        loadForDay,
        saveForDay,
        keys,
        clearCache,
    };
}
