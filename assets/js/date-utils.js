(function initDateUtils(globalObj) {
  let fixedOffsetMinutes = null;

  function normalizeOffsetMinutes(input) {
    if (input === null || input === undefined || input === "") return null;
    const parsed = Number(input);
    if (!Number.isFinite(parsed)) return null;
    const clamped = Math.max(-720, Math.min(840, Math.round(parsed)));
    return clamped;
  }

  function setFixedOffsetMinutes(input) {
    fixedOffsetMinutes = normalizeOffsetMinutes(input);
    return fixedOffsetMinutes;
  }

  function getFixedOffsetMinutes() {
    return fixedOffsetMinutes;
  }

  function nowWithConfiguredTimezone() {
    if (fixedOffsetMinutes === null) return new Date();
    const localNow = new Date();
    const utcMs = localNow.getTime() + localNow.getTimezoneOffset() * 60 * 1000;
    return new Date(utcMs + fixedOffsetMinutes * 60 * 1000);
  }

  function todayKey() {
    const now = nowWithConfiguredTimezone();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function formatTodayLabel() {
    const now = nowWithConfiguredTimezone();
    const weekNames = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day} ${weekNames[now.getDay()]}`;
  }

  function weekStartKey(dateKey = todayKey()) {
    const date = new Date(`${dateKey}T00:00:00`);
    const day = date.getDay() || 7;
    date.setDate(date.getDate() - day + 1);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function shiftDay(dateKey, deltaDays) {
    const date = new Date(`${dateKey}T00:00:00`);
    date.setDate(date.getDate() + deltaDays);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function daysBetween(fromMs, toMs = Date.now()) {
    if (!fromMs) return Infinity;
    const diff = Math.max(0, toMs - fromMs);
    return Math.floor(diff / (24 * 60 * 60 * 1000));
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function buildMonthKey(year, monthIndex) {
    return `${year}-${pad2(monthIndex + 1)}`;
  }

  function buildDayKey(year, monthIndex, day) {
    return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
  }

  globalObj.KSRDateUtils = {
    todayKey,
    formatTodayLabel,
    weekStartKey,
    shiftDay,
    daysBetween,
    pad2,
    buildMonthKey,
    buildDayKey,
    setFixedOffsetMinutes,
    getFixedOffsetMinutes
  };
}(window));
