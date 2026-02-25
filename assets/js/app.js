const STORAGE_KEY = "kids_star_reward_v2";
const LEGACY_STORAGE_KEY = "kids_star_reward_v1";
const ROLE_KEY = "kids_star_role";
const AUTH_TOKEN_KEY = "kids_star_auth_token";
const AUTH_USER_KEY = "kids_star_auth_user";

const RATING_ACTIVE = "主动";
const RATING_REMIND = "提醒";
const RATING_PASSIVE = "被动";
const ratingList = [RATING_ACTIVE, RATING_REMIND, RATING_PASSIVE];

const feedbackByRating = {
  [RATING_ACTIVE]: "你今天很自觉，真棒！",
  [RATING_REMIND]: "有进步，明天争取更主动！",
  [RATING_PASSIVE]: "今天完成了，明天再试试主动。"
};

const defaultData = {
  stars: 0,
  lastBackupExportAt: 0,
  streakEnabled: true,
  weeklyGoal: 20,
  openStreakCount: 0,
  openStreakLastDay: "",
  streakMilestoneAwardDays: {},
  earningsByDay: {},
  rewardWeeklyUsage: {},
  redeemLog: [],
  soundEnabled: false,
  reduceMotion: false,
  pinEnabled: false,
  pin: "",
  pinGraceMinutes: 5,
  parentUnlockUntil: 0,
  checkinDays: {},
  ratingUndoStack: [],
  makeupConfig: {
    weeklyLimit: 1,
    windowDays: 1,
    countForMilestone: false,
    weeklyCardGrant: 1
  },
  makeupUsageByWeek: {},
  makeupDays: {},
  makeupCardBalance: 0,
  makeupCardGrantByWeek: {},
  serverSync: {
    enabled: true,
    autoPush: true,
    pendingChanges: false,
    lastSyncAt: 0,
    lastSyncStatus: "未同步"
  },
  timeConfig: {
    fixedOffsetMinutes: null
  },
  bonusConfig: {
    weeklyLimit: 30
  },
  bonusUsageByWeek: {},
  theme: "sunny",
  restorePoints: [],
  tasks: [
    { id: crypto.randomUUID(), name: "阅读20分钟", stars: 2, needProof: false },
    { id: crypto.randomUUID(), name: "整理玩具", stars: 1, needProof: false },
    { id: crypto.randomUUID(), name: "练字10分钟", stars: 2, needProof: false }
  ],
  rewards: [
    { id: crypto.randomUUID(), name: "周末电影时间", cost: 8, stock: null, cooldownDays: 0 },
    { id: crypto.randomUUID(), name: "选择一次晚餐", cost: 12, stock: null, cooldownDays: 0 }
  ],
  completions: {},
  history: []
};

const store = window.KSRStore?.createStore?.({
  storageKey: STORAGE_KEY,
  legacyStorageKey: LEGACY_STORAGE_KEY,
  defaultData
});

if (!store) {
  throw new Error("KSRStore not loaded");
}

const { state, persist } = store;

const syncClient = window.KSRSyncAuth?.createClient?.({
  authTokenKey: AUTH_TOKEN_KEY,
  authUserKey: AUTH_USER_KEY,
  getServerSync: () => state.serverSync,
  createSnapshotData: () => createSnapshotData()
});

if (!syncClient) {
  throw new Error("KSRSyncAuth not loaded");
}

const {
  authState,
  saveAuthState,
  clearAuthState,
  registerAccount,
  loginAccount,
  fetchMe,
  logoutAccount,
  syncAdapter
} = syncClient;

function normalizeDataShape() {
  if (!state.completions || typeof state.completions !== "object") state.completions = {};
  if (!state.earningsByDay || typeof state.earningsByDay !== "object") state.earningsByDay = {};
  if (!Array.isArray(state.history)) state.history = [];
  if (typeof state.lastBackupExportAt !== "number" || state.lastBackupExportAt < 0) state.lastBackupExportAt = 0;
  if (typeof state.streakEnabled !== "boolean") state.streakEnabled = true;
  if (typeof state.weeklyGoal !== "number" || state.weeklyGoal < 5) state.weeklyGoal = 20;
  if (typeof state.openStreakCount !== "number" || state.openStreakCount < 0) state.openStreakCount = 0;
  if (typeof state.openStreakLastDay !== "string") state.openStreakLastDay = "";
  if (!state.streakMilestoneAwardDays || typeof state.streakMilestoneAwardDays !== "object") state.streakMilestoneAwardDays = {};
  if (!state.rewardWeeklyUsage || typeof state.rewardWeeklyUsage !== "object") state.rewardWeeklyUsage = {};
  if (!Array.isArray(state.redeemLog)) state.redeemLog = [];
  if (typeof state.soundEnabled !== "boolean") state.soundEnabled = false;
  if (typeof state.reduceMotion !== "boolean") state.reduceMotion = false;
  if (typeof state.pinEnabled !== "boolean") state.pinEnabled = false;
  if (typeof state.pin !== "string") state.pin = "";
  if (typeof state.pinGraceMinutes !== "number" || state.pinGraceMinutes < 0) state.pinGraceMinutes = 5;
  if (typeof state.parentUnlockUntil !== "number") state.parentUnlockUntil = 0;
  if (!state.checkinDays || typeof state.checkinDays !== "object") state.checkinDays = {};
  if (!Array.isArray(state.ratingUndoStack)) state.ratingUndoStack = [];
  if (!state.makeupConfig || typeof state.makeupConfig !== "object") {
    state.makeupConfig = { weeklyLimit: 1, windowDays: 1, countForMilestone: false, weeklyCardGrant: 1 };
  }
  if (!state.makeupUsageByWeek || typeof state.makeupUsageByWeek !== "object") state.makeupUsageByWeek = {};
  if (!state.makeupDays || typeof state.makeupDays !== "object") state.makeupDays = {};
  if (typeof state.makeupCardBalance !== "number" || state.makeupCardBalance < 0) state.makeupCardBalance = 0;
  if (!state.makeupCardGrantByWeek || typeof state.makeupCardGrantByWeek !== "object") state.makeupCardGrantByWeek = {};
  if (!state.serverSync || typeof state.serverSync !== "object") {
    state.serverSync = {
      enabled: true,
      autoPush: true,
      lastSyncAt: 0,
      lastSyncStatus: "未同步"
    };
  }
  if (typeof state.serverSync.enabled !== "boolean") state.serverSync.enabled = true;
  state.serverSync.enabled = true;
  if (typeof state.serverSync.autoPush !== "boolean") state.serverSync.autoPush = true;
  if (typeof state.serverSync.pendingChanges !== "boolean") state.serverSync.pendingChanges = false;
  if (typeof state.serverSync.lastSyncAt !== "number" || state.serverSync.lastSyncAt < 0) state.serverSync.lastSyncAt = 0;
  if (typeof state.serverSync.lastSyncStatus !== "string") state.serverSync.lastSyncStatus = "未同步";
  if (!state.timeConfig || typeof state.timeConfig !== "object") state.timeConfig = { fixedOffsetMinutes: null };
  if (!Object.hasOwn(state.timeConfig, "fixedOffsetMinutes")) state.timeConfig.fixedOffsetMinutes = null;
  if (state.timeConfig.fixedOffsetMinutes !== null) {
    const offset = Number(state.timeConfig.fixedOffsetMinutes);
    state.timeConfig.fixedOffsetMinutes = Number.isFinite(offset)
      ? Math.max(-720, Math.min(840, Math.round(offset)))
      : null;
  }
  if (!state.bonusConfig || typeof state.bonusConfig !== "object") state.bonusConfig = { weeklyLimit: 30 };
  state.bonusConfig.weeklyLimit = Math.max(1, Number(state.bonusConfig.weeklyLimit || 30));
  if (!state.bonusUsageByWeek || typeof state.bonusUsageByWeek !== "object") state.bonusUsageByWeek = {};
  if (!Array.isArray(state.restorePoints)) state.restorePoints = [];
  if (typeof state.theme !== "string") state.theme = "sunny";
  state.makeupConfig.weeklyLimit = Math.max(0, Number(state.makeupConfig.weeklyLimit ?? 1));
  state.makeupConfig.windowDays = Math.max(1, Number(state.makeupConfig.windowDays ?? 1));
  state.makeupConfig.countForMilestone = Boolean(state.makeupConfig.countForMilestone);
  state.makeupConfig.weeklyCardGrant = Math.max(0, Number(state.makeupConfig.weeklyCardGrant ?? 1));

  state.tasks = (state.tasks || []).map((task) => ({ needProof: false, ...task }));
  state.rewards = (state.rewards || []).map((reward) => ({ stock: null, cooldownDays: 0, ...reward }));

  for (const day of Object.keys(state.completions)) {
    const dayMap = state.completions[day];
    if (!dayMap || typeof dayMap !== "object") {
      state.completions[day] = {};
      continue;
    }

    for (const taskId of Object.keys(dayMap)) {
      const value = dayMap[taskId];
      if (value === true) {
        dayMap[taskId] = { state: "rated", rating: RATING_ACTIVE, starsAwarded: 0, feedback: feedbackByRating[RATING_ACTIVE] };
      }
      const current = dayMap[taskId];
      if (current && typeof current === "object" && current.state === "rated" && typeof current.feedback !== "string") {
        current.feedback = feedbackByRating[current.rating] || "做得不错，继续加油。";
      }
      if (current && typeof current === "object" && ["pending", "rated", "rejected"].includes(current.state)) {
        state.checkinDays[day] = true;
      }
    }
  }

  state.history = state.history.map((item) => ({ type: "system", ...item }));
}

normalizeDataShape();

function saveData(options = {}) {
  const { markPending = true } = options;
  if (markPending && state.serverSync) state.serverSync.pendingChanges = true;
  persist();
  queueAutoSync();
}

function createSnapshotData() {
  const snapshot = JSON.parse(JSON.stringify(state));
  snapshot.restorePoints = [];
  return snapshot;
}

function captureRestorePoint(label) {
  state.restorePoints.unshift({
    id: crypto.randomUUID(),
    label,
    at: new Date().toLocaleString(),
    data: createSnapshotData()
  });
  state.restorePoints = state.restorePoints.slice(0, 5);
}

function renderRestorePoints() {
  if (!restorePointSelect) return;
  restorePointSelect.innerHTML = "";
  if (!state.restorePoints.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "暂无恢复点";
    restorePointSelect.appendChild(option);
    restorePointBtn.disabled = true;
    return;
  }

  for (const point of state.restorePoints) {
    const option = document.createElement("option");
    option.value = point.id;
    option.textContent = `${point.label} · ${point.at}`;
    restorePointSelect.appendChild(option);
  }
  restorePointBtn.disabled = false;
}

async function restoreFromPoint(pointId) {
  const point = state.restorePoints.find((item) => item.id === pointId);
  if (!point) {
    await showAlert("没有找到该恢复点。", "恢复失败");
    return;
  }

  const ok = await showConfirm("确认恢复到这个时间点吗？当前数据会被覆盖。", "恢复确认");
  if (!ok) return;

  const savedPoints = state.restorePoints;
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, JSON.parse(JSON.stringify(point.data)));
  state.restorePoints = savedPoints;
  normalizeDataShape();
  addHistory("已恢复到历史时间点", 0, "system");
  saveData();
  renderAll();
}

const roleSwitch = document.querySelector("#roleSwitch");
const themeSelect = document.querySelector("#themeSelect");
const welcomePanel = document.querySelector("#welcomePanel");
const welcomeAuthBtn = document.querySelector("#welcomeAuthBtn");
const childPanel = document.querySelector("#childPanel");
const parentPanel = document.querySelector("#parentPanel");
const todayDateText = document.querySelector("#todayDateText");
const authChip = document.querySelector("#authChip");
const authUserText = document.querySelector("#authUserText");
const authOpenBtn = document.querySelector("#authOpenBtn");
const authLogoutBtn = document.querySelector("#authLogoutBtn");
const childTopGrid = document.querySelector("#childTopGrid");
const childStreakCard = document.querySelector("#childStreakCard");

const childStarCount = document.querySelector("#childStarCount");
const openStreakText = document.querySelector("#openStreakText");
const streakHintText = document.querySelector("#streakHintText");
const makeupInfoText = document.querySelector("#makeupInfoText");
const toggleStreakDetailsBtn = document.querySelector("#toggleStreakDetailsBtn");
const streakDetailPanel = document.querySelector("#streakDetailPanel");
const makeupCheckinBtn = document.querySelector("#makeupCheckinBtn");
const monthCheckinText = document.querySelector("#monthCheckinText");
const monthMakeupText = document.querySelector("#monthMakeupText");
const lifetimeCheckinText = document.querySelector("#lifetimeCheckinText");
const streakMonthHistory = document.querySelector("#streakMonthHistory");
const streakHeatmap = document.querySelector("#streakHeatmap");
const toggleStreakHeatmapBtn = document.querySelector("#toggleStreakHeatmapBtn");
const parentStarCount = document.querySelector("#parentStarCount");
const weeklyGoalText = document.querySelector("#weeklyGoalText");
const weeklyGoalBar = document.querySelector("#weeklyGoalBar");
const goalMotivateText = document.querySelector("#goalMotivateText");

const childTaskList = document.querySelector("#childTaskList");
const childRewardList = document.querySelector("#childRewardList");
const todayTaskSummary = document.querySelector("#todayTaskSummary");
const childHistoryList = document.querySelector("#childHistoryList");
const childHistoryFilter = document.querySelector("#childHistoryFilter");

const taskForm = document.querySelector("#taskForm");
const taskName = document.querySelector("#taskName");
const taskStars = document.querySelector("#taskStars");
const taskNeedProof = document.querySelector("#taskNeedProof");
const taskSubmitBtn = document.querySelector("#taskSubmitBtn");
const taskCancelEdit = document.querySelector("#taskCancelEdit");
const parentTaskList = document.querySelector("#parentTaskList");

const rewardForm = document.querySelector("#rewardForm");
const rewardName = document.querySelector("#rewardName");
const rewardCost = document.querySelector("#rewardCost");
const rewardStock = document.querySelector("#rewardStock");
const rewardCooldown = document.querySelector("#rewardCooldown");
const rewardSubmitBtn = document.querySelector("#rewardSubmitBtn");
const rewardCancelEdit = document.querySelector("#rewardCancelEdit");
const parentRewardList = document.querySelector("#parentRewardList");

const bonusForm = document.querySelector("#bonusForm");
const bonusReason = document.querySelector("#bonusReason");
const bonusStars = document.querySelector("#bonusStars");
const bonusLimitForm = document.querySelector("#bonusLimitForm");
const bonusWeeklyLimitInput = document.querySelector("#bonusWeeklyLimitInput");
const bonusLimitText = document.querySelector("#bonusLimitText");

const goalForm = document.querySelector("#goalForm");
const weeklyGoalInput = document.querySelector("#weeklyGoalInput");

const pinForm = document.querySelector("#pinForm");
const pinInput = document.querySelector("#pinInput");
const pinOffBtn = document.querySelector("#pinOffBtn");
const pinGraceForm = document.querySelector("#pinGraceForm");
const pinGraceInput = document.querySelector("#pinGraceInput");
const soundToggle = document.querySelector("#soundToggle");
const reduceMotionToggle = document.querySelector("#reduceMotionToggle");
const timezoneForm = document.querySelector("#timezoneForm");
const timezoneSelect = document.querySelector("#timezoneSelect");
const timezoneSummary = document.querySelector("#timezoneSummary");
const streakFeatureToggle = document.querySelector("#streakFeatureToggle");
const syncStatusText = document.querySelector("#syncStatusText");
const makeupConfigForm = document.querySelector("#makeupConfigForm");
const makeupWeeklyLimitInput = document.querySelector("#makeupWeeklyLimitInput");
const makeupCardWeeklyForm = document.querySelector("#makeupCardWeeklyForm");
const makeupCardWeeklyInput = document.querySelector("#makeupCardWeeklyInput");
const makeupCardGrantForm = document.querySelector("#makeupCardGrantForm");
const makeupCardGrantInput = document.querySelector("#makeupCardGrantInput");
const makeupCountMilestoneToggle = document.querySelector("#makeupCountMilestoneToggle");
const makeupRuleSummary = document.querySelector("#makeupRuleSummary");
const makeupSettingsCol = document.querySelector("#makeupSettingsCol");

const parentPendingList = document.querySelector("#parentPendingList");
const pendingSearchInput = document.querySelector("#pendingSearchInput");
const resetTodayBtn = document.querySelector("#resetTodayBtn");
const approveAllActiveBtn = document.querySelector("#approveAllActiveBtn");
const approveAllRemindBtn = document.querySelector("#approveAllRemindBtn");
const undoLastRatingBtn = document.querySelector("#undoLastRatingBtn");
const statsRange = document.querySelector("#statsRange");
const statsBox = document.querySelector("#statsBox");
const parentHistoryList = document.querySelector("#parentHistoryList");
const parentHistoryFilter = document.querySelector("#parentHistoryFilter");
const historySearchInput = document.querySelector("#historySearchInput");

const exportBtn = document.querySelector("#exportBtn");
const exportCsvBtn = document.querySelector("#exportCsvBtn");
const importInput = document.querySelector("#importInput");
const backupReminderBadge = document.querySelector("#backupReminderBadge");
const restorePointSelect = document.querySelector("#restorePointSelect");
const restorePointBtn = document.querySelector("#restorePointBtn");

const redeemModal = document.querySelector("#redeemModal");
const redeemModalText = document.querySelector("#redeemModalText");
const redeemConfirmBtn = document.querySelector("#redeemConfirmBtn");
const redeemCancelBtn = document.querySelector("#redeemCancelBtn");

const pinModal = document.querySelector("#pinModal");
const pinVerifyInput = document.querySelector("#pinVerifyInput");
const pinVerifyBtn = document.querySelector("#pinVerifyBtn");
const pinCancelBtn = document.querySelector("#pinCancelBtn");

const uiModal = document.querySelector("#uiModal");
const uiModalTitle = document.querySelector("#uiModalTitle");
const uiModalMessage = document.querySelector("#uiModalMessage");
const uiModalInput = document.querySelector("#uiModalInput");
const uiModalConfirmBtn = document.querySelector("#uiModalConfirmBtn");
const uiModalCancelBtn = document.querySelector("#uiModalCancelBtn");

const authModal = document.querySelector("#authModal");
const authUsernameInput = document.querySelector("#authUsernameInput");
const authPasswordInput = document.querySelector("#authPasswordInput");
const authModeLoginBtn = document.querySelector("#authModeLoginBtn");
const authModeRegisterBtn = document.querySelector("#authModeRegisterBtn");
const authModalTitleText = document.querySelector("#authModalTitleText");
const authModalDescText = document.querySelector("#authModalDescText");
const authHintText = document.querySelector("#authHintText");
const authSubmitBtn = document.querySelector("#authSubmitBtn");
const authSwitchBtn = document.querySelector("#authSwitchBtn");
const authCancelBtn = document.querySelector("#authCancelBtn");

const ui = {
  role: localStorage.getItem(ROLE_KEY) === "parent" ? "parent" : "child",
  authMode: "login",
  editingTaskId: null,
  editingRewardId: null,
  pendingRedeemId: null,
  pinFailCount: 0,
  uiModalResolver: null,
  streakDetailsExpanded: false,
  streakHeatmapExpanded: false
};

const modalService = window.KSRModals?.createModalService?.({
  uiState: ui,
  pinModal,
  pinVerifyInput,
  uiModal,
  uiModalTitle,
  uiModalMessage,
  uiModalInput,
  uiModalConfirmBtn,
  uiModalCancelBtn
});

if (!modalService) {
  throw new Error("KSRModals not loaded");
}

const {
  openPinModal,
  closePinModal,
  showAlert,
  showConfirm,
  showPrompt,
  bindUiModalEvents
} = modalService;

let lastRenderedStars = state.stars;
let autoSyncTimer = null;
let autoSyncRunning = false;
let autoSyncPending = false;

async function flushAutoSync() {
  if (autoSyncRunning) {
    autoSyncPending = true;
    return;
  }
  if (!state.serverSync?.autoPush || !authState.token) return;

  autoSyncRunning = true;
  const result = await syncAdapter.push();
  state.serverSync.lastSyncAt = Date.now();
  state.serverSync.lastSyncStatus = result.ok ? "自动保存成功" : "自动保存失败";
  if (result.ok) state.serverSync.pendingChanges = false;
  persist();
  autoSyncRunning = false;

  if (autoSyncPending) {
    autoSyncPending = false;
    flushAutoSync();
  }
}

function queueAutoSync() {
  if (!state.serverSync?.autoPush || !authState.token) return;
  if (autoSyncTimer) clearTimeout(autoSyncTimer);
  autoSyncTimer = setTimeout(() => {
    autoSyncTimer = null;
    flushAutoSync();
  }, 900);
}

if (state.pinEnabled && ui.role === "parent") {
  ui.role = "child";
}

const {
  todayKey,
  formatTodayLabel,
  weekStartKey,
  shiftDay,
  daysBetween,
  buildMonthKey,
  buildDayKey,
  setFixedOffsetMinutes
} = window.KSRDateUtils || {};

if (!todayKey || !formatTodayLabel || !weekStartKey || !shiftDay || !daysBetween || !buildMonthKey || !buildDayKey || !setFixedOffsetMinutes) {
  throw new Error("KSRDateUtils not loaded");
}

applyTimezoneConfig();

function weeklyEarned() {
  const start = weekStartKey();
  let total = 0;
  for (let i = 0; i < 7; i += 1) {
    const day = shiftDay(start, i);
    total += Number(state.earningsByDay[day] || 0);
  }
  return total;
}

function dayDiff(fromDateKey, toDateKey) {
  const from = new Date(`${fromDateKey}T00:00:00`).getTime();
  const to = new Date(`${toDateKey}T00:00:00`).getTime();
  return Math.floor((to - from) / (24 * 60 * 60 * 1000));
}

function nextWeekResetLabel() {
  const next = shiftDay(weekStartKey(), 7);
  return `${next} 周一`;
}

function getWeekUsageMap(weekKey) {
  if (!state.rewardWeeklyUsage[weekKey]) state.rewardWeeklyUsage[weekKey] = {};
  return state.rewardWeeklyUsage[weekKey];
}

function usedStockThisWeek(rewardId) {
  const usage = getWeekUsageMap(weekStartKey());
  return Number(usage[rewardId] || 0);
}

function getMakeupUsageMap(weekKey) {
  if (!state.makeupUsageByWeek[weekKey]) state.makeupUsageByWeek[weekKey] = { count: 0 };
  return state.makeupUsageByWeek[weekKey];
}

function getBonusUsageMap(weekKey) {
  if (!state.bonusUsageByWeek[weekKey]) state.bonusUsageByWeek[weekKey] = { stars: 0 };
  return state.bonusUsageByWeek[weekKey];
}

function getBonusRemainThisWeek() {
  const weeklyLimit = Math.max(1, Number(state.bonusConfig.weeklyLimit || 30));
  const usage = getBonusUsageMap(weekStartKey());
  return Math.max(0, weeklyLimit - Number(usage.stars || 0));
}

function timezoneOffsetText(offsetMinutes) {
  if (offsetMinutes === null || offsetMinutes === undefined || offsetMinutes === "") return "跟随设备时区";
  const total = Number(offsetMinutes);
  if (!Number.isFinite(total)) return "跟随设备时区";
  const sign = total >= 0 ? "+" : "-";
  const abs = Math.abs(total);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `UTC${sign}${hh}:${mm}`;
}

function applyTimezoneConfig() {
  const fixedOffsetMinutes = state.timeConfig?.fixedOffsetMinutes;
  setFixedOffsetMinutes(fixedOffsetMinutes === null || fixedOffsetMinutes === "" ? null : Number(fixedOffsetMinutes));
}

function getMakeupRemainThisWeek() {
  const usage = getMakeupUsageMap(weekStartKey());
  return Math.max(0, Number(state.makeupConfig.weeklyLimit || 0) - Number(usage.count || 0));
}

function grantMakeupCards(count, reason) {
  const grantCount = Math.max(0, Number(count || 0));
  if (!grantCount) return;
  state.makeupCardBalance = Number(state.makeupCardBalance || 0) + grantCount;
  addHistory(`${reason}，获得补签卡 ${grantCount} 张`, 0, "system");
}

function ensureWeeklyMakeupCardGrant() {
  const weekKey = weekStartKey();
  if (state.makeupCardGrantByWeek[weekKey]) return false;
  state.makeupCardGrantByWeek[weekKey] = true;
  const weeklyGrant = Math.max(0, Number(state.makeupConfig.weeklyCardGrant || 0));
  if (weeklyGrant > 0) {
    grantMakeupCards(weeklyGrant, `本周补签卡发放（${weekKey}）`);
  }
  return true;
}

function calculateStreakEnding(dateKey) {
  let count = 0;
  let cursor = dateKey;
  while (state.checkinDays[cursor]) {
    count += 1;
    cursor = shiftDay(cursor, -1);
  }
  return count;
}

function hasCheckinOnDay(dayKey) {
  if (state.checkinDays[dayKey]) return true;
  const dayMap = state.completions[dayKey];
  if (!dayMap || typeof dayMap !== "object") return false;
  for (const item of Object.values(dayMap)) {
    if (item === true) return true;
    if (item && typeof item === "object" && ["pending", "rated", "rejected"].includes(item.state)) {
      return true;
    }
  }
  return false;
}

function remainingStock(reward) {
  if (!Number.isFinite(reward.stock)) return Infinity;
  return Math.max(0, reward.stock - usedStockThisWeek(reward.id));
}

function getLastRedeemDay(rewardId) {
  for (const item of state.redeemLog) {
    if (item.rewardId === rewardId) return item.day;
  }
  return null;
}

function canRedeemByCooldown(reward) {
  const cooldown = Number(reward.cooldownDays || 0);
  if (!cooldown) return true;
  const lastDay = getLastRedeemDay(reward.id);
  if (!lastDay) return true;
  return dayDiff(lastDay, todayKey()) >= cooldown;
}

function playSound(type) {
  if (!state.soundEnabled) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;
  const base = type === "good" ? 660 : type === "redeem" ? 520 : 420;
  osc.frequency.setValueAtTime(base, now);
  osc.frequency.linearRampToValueAtTime(base + 160, now + 0.08);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
  osc.start(now);
  osc.stop(now + 0.17);
}

function applyMilestoneAward(day, allowAward) {
  if (!allowAward) return;
  const bonusByMilestone = { 3: 1, 7: 2, 14: 4 };
  const makeupCardBonusByMilestone = { 7: 1, 14: 1, 21: 2 };
  const streak = state.openStreakCount;
  const bonus = bonusByMilestone[streak];
  const makeupCardBonus = Number(makeupCardBonusByMilestone[streak] || 0);
  const awardKey = `${day}-${streak}`;
  if ((bonus || makeupCardBonus) && !state.streakMilestoneAwardDays[awardKey]) {
    state.streakMilestoneAwardDays[awardKey] = true;
    if (bonus) {
      awardStars(bonus, "system", `连续打卡 ${streak} 天奖励`);
    }
    if (makeupCardBonus > 0) {
      grantMakeupCards(makeupCardBonus, `连续打卡 ${streak} 天奖励`);
    }
    addHistory(`连胜里程碑达成：${streak} 天`, 0, "system");
    playSound("good");
  }
}

function updateCheckinStreak(day, options = {}) {
  const { allowMilestone = true } = options;
  state.checkinDays[day] = true;
  state.openStreakLastDay = day;
  state.openStreakCount = calculateStreakEnding(day);
  applyMilestoneAward(day, allowMilestone);
}

function findMakeupDay() {
  const yesterday = shiftDay(todayKey(), -1);
  return hasCheckinOnDay(yesterday) ? null : yesterday;
}

function refreshStreakFromCheckins() {
  const today = todayKey();
  const targetDay = state.checkinDays[today] ? today : shiftDay(today, -1);
  if (state.checkinDays[targetDay]) {
    state.openStreakLastDay = targetDay;
    state.openStreakCount = calculateStreakEnding(targetDay);
  } else {
    state.openStreakLastDay = "";
    state.openStreakCount = 0;
  }
}

async function tryUseMakeupCard() {
  ensureWeeklyMakeupCardGrant();
  const cardBalance = Number(state.makeupCardBalance || 0);
  if (cardBalance <= 0) {
    await showAlert("当前没有补签卡，请先获得补签卡后再使用。", "补签不可用");
    return;
  }

  const remain = getMakeupRemainThisWeek();
  if (remain <= 0) {
    await showAlert("本周补签次数已用完。", "补签不可用");
    return;
  }

  const makeupDay = findMakeupDay();
  if (!makeupDay) {
    await showAlert("最近没有可补签日期。", "补签不可用");
    return;
  }

  const ok = await showConfirm(`确认使用补签卡补 ${makeupDay} 吗？`, "使用补签卡");
  if (!ok) return;

  captureRestorePoint("补签前");
  const usage = getMakeupUsageMap(weekStartKey());
  usage.count = Number(usage.count || 0) + 1;
  state.makeupCardBalance = Math.max(0, Number(state.makeupCardBalance || 0) - 1);
  state.checkinDays[makeupDay] = true;
  state.makeupDays[makeupDay] = true;
  state.openStreakCount = calculateStreakEnding(todayKey());
  state.openStreakLastDay = todayKey();
  applyMilestoneAward(makeupDay, Boolean(state.makeupConfig.countForMilestone));
  addHistory(`使用补签卡补签：${makeupDay}`, 0, "system");
  saveData();
  renderAll();
}

function addHistory(text, delta, type = "system") {
  state.history.unshift({
    id: crypto.randomUUID(),
    text,
    delta,
    type,
    dateKey: todayKey(),
    at: new Date().toLocaleString()
  });
  state.history = state.history.slice(0, 60);
}

function awardStars(stars, type, text) {
  if (!Number.isFinite(stars) || stars <= 0) return;
  state.stars += stars;
  const day = todayKey();
  state.earningsByDay[day] = Number(state.earningsByDay[day] || 0) + stars;
  addHistory(text, stars, type);
}

function renderRole() {
  const isLoggedIn = Boolean(authState.token);
  if (welcomePanel) welcomePanel.classList.toggle("hidden", isLoggedIn);
  roleSwitch.classList.toggle("hidden", !isLoggedIn);
  themeSelect.classList.toggle("hidden", !isLoggedIn);

  if (!isLoggedIn) {
    childPanel.classList.add("hidden");
    parentPanel.classList.add("hidden");
    return;
  }

  childPanel.classList.toggle("hidden", ui.role !== "child");
  parentPanel.classList.toggle("hidden", ui.role !== "parent");

  const buttons = roleSwitch.querySelectorAll(".role-btn");
  for (const button of buttons) {
    const isActive = button.dataset.role === ui.role;
    button.classList.toggle("is-active", isActive);
  }
}

function clearTaskEdit() {
  ui.editingTaskId = null;
  taskForm.reset();
  taskStars.value = "1";
  taskNeedProof.checked = false;
  taskSubmitBtn.textContent = "添加任务";
  taskCancelEdit.classList.add("hidden");
}

function clearRewardEdit() {
  ui.editingRewardId = null;
  rewardForm.reset();
  rewardCost.value = "5";
  rewardStock.value = "";
  rewardCooldown.value = "";
  rewardSubmitBtn.textContent = "添加奖励";
  rewardCancelEdit.classList.add("hidden");
}

async function openRedeemModal(rewardId) {
  const reward = state.rewards.find((r) => r.id === rewardId);
  if (!reward) return;
  if (remainingStock(reward) <= 0) {
    await showAlert("这个奖励本周库存已用完，下周会自动恢复。", "无法兑换");
    return;
  }
  if (!canRedeemByCooldown(reward)) {
    const lastDay = getLastRedeemDay(reward.id);
    const wait = Math.max(1, Number(reward.cooldownDays || 0) - dayDiff(lastDay, todayKey()));
    await showAlert(`这个奖励还在冷却中，还需 ${wait} 天。`, "冷却中");
    return;
  }
  ui.pendingRedeemId = rewardId;
  redeemModalText.textContent = `确认兑换「${reward.name}」吗？将扣除 ${reward.cost}⭐。`;
  redeemModal.classList.remove("hidden");
}

function closeRedeemModal() {
  ui.pendingRedeemId = null;
  redeemModal.classList.add("hidden");
}

async function submitTaskByChild(taskId) {
  const day = todayKey();
  if (!state.completions[day]) state.completions[day] = {};
  const existing = state.completions[day][taskId];
  if (existing && existing.state !== "rejected") return;

  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;

  let proofName = "";
  if (task.needProof) {
    const proofInput = childTaskList.querySelector(`input[data-proof-task-id="${taskId}"]`);
    proofName = proofInput?.files?.[0]?.name || "";
    if (!proofName) {
      await showAlert("这个任务需要上传拍照凭证后再提交。", "需要凭证");
      return;
    }
  }

  captureRestorePoint("提交任务前");
  state.completions[day][taskId] = { state: "pending", proofName };
  updateCheckinStreak(day);
  addHistory(`孩子提交任务「${task.name}」，待家长评分`, 0, "task");
  playSound("tap");
  saveData();
  renderAll();
}

function rateTaskByParent(taskId, rating, options = {}) {
  if (!ratingList.includes(rating)) return;
  const { silent = false, partialStars = null } = options;
  const day = todayKey();
  const dayMap = state.completions[day] || {};
  const completion = dayMap[taskId];
  if (!completion || completion.state !== "pending") return;

  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;

  const starsAwarded = partialStars === null
    ? (rating === RATING_PASSIVE ? 0 : task.stars)
    : Math.max(0, Number(partialStars));
  const feedback = feedbackByRating[rating];
  captureRestorePoint("评分前");
  state.ratingUndoStack.push({
    day,
    taskId,
    previous: { ...completion },
    starsBefore: state.stars,
    earningsBefore: Number(state.earningsByDay[day] || 0)
  });
  state.ratingUndoStack = state.ratingUndoStack.slice(-30);
  dayMap[taskId] = { state: "rated", rating, starsAwarded, feedback };
  state.completions[day] = dayMap;

  if (starsAwarded > 0) {
    awardStars(starsAwarded, "task", `家长评分「${task.name}」：${rating}`);
    if (!silent) playSound("good");
  } else {
    addHistory(`家长评分「${task.name}」：${rating}`, 0, "task");
  }
  addHistory(`鼓励语：${feedback}`, 0, "system");
  saveData();
  renderAll();
}

async function undoLastRating() {
  const last = state.ratingUndoStack.pop();
  if (!last) {
    await showAlert("没有可撤销的评分记录。", "撤销失败");
    return;
  }

  if (!state.completions[last.day]) state.completions[last.day] = {};
  state.completions[last.day][last.taskId] = last.previous;
  state.stars = last.starsBefore;
  state.earningsByDay[last.day] = last.earningsBefore;
  addHistory("已撤销上一条评分", 0, "system");
  saveData();
  renderAll();
}

function redeemRewardByChild(rewardId) {
  const reward = state.rewards.find((item) => item.id === rewardId);
  if (!reward || state.stars < reward.cost) return;
  if (!canRedeemByCooldown(reward)) return;
  if (remainingStock(reward) <= 0) return;

  captureRestorePoint("兑换前");
  state.stars -= reward.cost;
  const usage = getWeekUsageMap(weekStartKey());
  usage[reward.id] = Number(usage[reward.id] || 0) + 1;
  state.redeemLog.unshift({ rewardId: reward.id, day: todayKey() });
  state.redeemLog = state.redeemLog.slice(0, 200);
  addHistory(`兑换奖励「${reward.name}」`, -reward.cost, "redeem");
  playSound("redeem");
  saveData();
  renderAll();
}

async function grantBonusByParent(reason, stars) {
  if (!reason || Number.isNaN(stars) || stars < 1) return false;
  const remain = getBonusRemainThisWeek();
  if (stars > remain) {
    await showAlert(`本周额外奖励还剩 ${remain}⭐，请调小分值或下周再发放。`, "超出每周上限");
    return false;
  }
  captureRestorePoint("额外奖励前");
  const usage = getBonusUsageMap(weekStartKey());
  usage.stars = Number(usage.stars || 0) + stars;
  awardStars(stars, "bonus", `家长额外奖励：${reason}`);
  saveData();
  renderAll();
  return true;
}

function removeTask(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  captureRestorePoint("删除任务前");
  state.tasks = state.tasks.filter((item) => item.id !== taskId);
  for (const day of Object.keys(state.completions)) {
    if (state.completions[day] && state.completions[day][taskId]) delete state.completions[day][taskId];
  }
  if (task) addHistory(`删除任务「${task.name}」`, 0, "system");
  if (ui.editingTaskId === taskId) clearTaskEdit();
  saveData();
  renderAll();
}

function removeReward(rewardId) {
  const reward = state.rewards.find((item) => item.id === rewardId);
  captureRestorePoint("删除奖励前");
  state.rewards = state.rewards.filter((item) => item.id !== rewardId);
  if (reward) addHistory(`删除奖励「${reward.name}」`, 0, "system");
  if (ui.editingRewardId === rewardId) clearRewardEdit();
  saveData();
  renderAll();
}

function moveTask(taskId, direction) {
  const index = state.tasks.findIndex((item) => item.id === taskId);
  if (index < 0) return;
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= state.tasks.length) return;

  captureRestorePoint("任务排序前");
  const [task] = state.tasks.splice(index, 1);
  state.tasks.splice(targetIndex, 0, task);
  addHistory(`已调整任务顺序：${task.name}`, 0, "system");
  saveData();
  renderAll();
}

function moveReward(rewardId, direction) {
  const index = state.rewards.findIndex((item) => item.id === rewardId);
  if (index < 0) return;
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= state.rewards.length) return;

  captureRestorePoint("奖励排序前");
  const [reward] = state.rewards.splice(index, 1);
  state.rewards.splice(targetIndex, 0, reward);
  addHistory(`已调整奖励顺序：${reward.name}`, 0, "system");
  saveData();
  renderAll();
}

function renderWeeklyGoal() {
  const earned = weeklyEarned();
  const goal = Math.max(5, Number(state.weeklyGoal || 20));
  const percent = Math.min(100, Math.round((earned / goal) * 100));
  const left = Math.max(0, goal - earned);
  weeklyGoalText.textContent = `本周进度：${earned}/${goal}⭐`;
  weeklyGoalBar.style.width = `${percent}%`;
  weeklyGoalBar.classList.toggle("done", earned >= goal);

  if (earned >= goal) {
    goalMotivateText.textContent = "已达成本周目标！解锁本周成就感！";
  } else {
    goalMotivateText.textContent = `再拿 ${left}⭐，解锁本周目标宝箱！`;
  }
}

function renderStreak() {
  const streak = state.openStreakCount;
  let title = "准备出发";
  const milestones = [3, 7, 14, 21];
  const nextMilestone = milestones.find((item) => item > streak);
  let hint = nextMilestone
    ? `再打卡 ${nextMilestone - streak} 天，可解锁 ${nextMilestone} 天奖励！`
    : "你已经突破所有里程碑，继续冲刺吧！";

  if (streak <= 0) {
    hint = "今天完成第一项任务并提交，就能点亮连续打卡。";
  }

  if (streak >= 3) title = "坚持达人";
  if (streak >= 7) title = "超级连胜";
  if (streak >= 14) title = "星光王者";

  if (streak >= 7) openStreakText.classList.add("super");
  else openStreakText.classList.remove("super");

  openStreakText.textContent = `连续打卡 ${streak} 天 · ${title}`;
  streakHintText.textContent = hint;

  if (toggleStreakDetailsBtn) {
    toggleStreakDetailsBtn.textContent = ui.streakDetailsExpanded ? "收起打卡详情" : "展开打卡详情";
  }
  if (streakDetailPanel) {
    streakDetailPanel.classList.toggle("hidden", !ui.streakDetailsExpanded);
  }

  ensureWeeklyMakeupCardGrant();
  const remain = getMakeupRemainThisWeek();
  const cardBalance = Number(state.makeupCardBalance || 0);
  if (cardBalance <= 0) {
    makeupInfoText.textContent = `补签卡 0 张 | 可通过连续打卡里程碑或家长奖励获得（每周自动发卡 ${state.makeupConfig.weeklyCardGrant || 0} 张）`;
  } else {
    makeupInfoText.textContent = `补签卡 ${cardBalance} 张 | 本周补签剩余 ${remain} 次（仅可补昨天）`;
  }
  const makeupDay = findMakeupDay();
  const canUseMakeup = remain > 0 && cardBalance > 0 && Boolean(makeupDay);
  makeupCheckinBtn.textContent = "使用补签卡";
  makeupCheckinBtn.disabled = false;
  makeupCheckinBtn.classList.toggle("hidden", !canUseMakeup);

  const allCheckinDays = Object.keys(state.checkinDays)
    .filter((day) => state.checkinDays[day])
    .sort((a, b) => b.localeCompare(a));
  const currentMonth = todayKey().slice(0, 7);
  const monthCheckins = allCheckinDays.filter((day) => day.startsWith(currentMonth));
  const monthMakeups = monthCheckins.filter((day) => Boolean(state.makeupDays[day]));

  if (monthCheckinText) monthCheckinText.textContent = `本月打卡：${monthCheckins.length} 天`;
  if (monthMakeupText) monthMakeupText.textContent = `本月补签：${monthMakeups.length} 天`;
  if (lifetimeCheckinText) lifetimeCheckinText.textContent = `累计打卡：${allCheckinDays.length} 天`;

  if (streakMonthHistory) {
    const byMonth = {};
    for (const day of allCheckinDays) {
      const monthKey = day.slice(0, 7);
      if (!byMonth[monthKey]) byMonth[monthKey] = { checkins: 0, makeups: 0 };
      byMonth[monthKey].checkins += 1;
      if (state.makeupDays[day]) byMonth[monthKey].makeups += 1;
    }

    const monthRows = Object.entries(byMonth)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 4);

    streakMonthHistory.innerHTML = "";
    if (!monthRows.length) {
      const li = document.createElement("li");
      li.textContent = "暂无月度打卡记录";
      streakMonthHistory.appendChild(li);
    } else {
      for (const [month, info] of monthRows) {
        const li = document.createElement("li");
        const label = month === currentMonth ? `${month}（本月）` : month;
        li.innerHTML = `<strong>${label}</strong><small>打卡 ${info.checkins} 天 | 补签 ${info.makeups} 天</small>`;
        streakMonthHistory.appendChild(li);
      }
    }
  }

  if (streakHeatmap) {
    const today = new Date();
    const todayStr = todayKey();
    const cards = [];

    for (let offset = 0; offset < 3; offset += 1) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - offset, 1);
      const year = monthDate.getFullYear();
      const monthIndex = monthDate.getMonth();
      const monthKey = buildMonthKey(year, monthIndex);
      const monthLabel = `${monthKey}${offset === 0 ? "（本月）" : ""}`;
      const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
      const startWeekday = new Date(year, monthIndex, 1).getDay();

      let monthDone = 0;
      let monthMakeup = 0;
      const cells = [];

      for (let i = 0; i < startWeekday; i += 1) {
        cells.push('<span class="heat-cell empty"></span>');
      }

      for (let day = 1; day <= daysInMonth; day += 1) {
        const dayKey = buildDayKey(year, monthIndex, day);
        const isDone = Boolean(state.checkinDays[dayKey]);
        const isMakeup = Boolean(state.makeupDays[dayKey]);
        const isToday = dayKey === todayStr;
        let cls = "none";
        if (isDone && isMakeup) cls = "makeup";
        else if (isDone) cls = "done";
        if (isDone) monthDone += 1;
        if (isMakeup) monthMakeup += 1;
        const title = `${dayKey} ${isDone ? (isMakeup ? "补签" : "打卡") : "未打卡"}`;
        cells.push(`<span class="heat-cell ${cls} ${isToday ? "today" : ""}" title="${title}">${day}</span>`);
      }

      cards.push(`
        <article class="heat-card">
          <div class="heat-card-head">
            <strong>${monthLabel}</strong>
            <small>打卡 ${monthDone} 天 | 补签 ${monthMakeup} 天</small>
          </div>
          <div class="heat-week-head"><span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span></div>
          <div class="heat-grid">${cells.join("")}</div>
        </article>
      `);
    }

    streakHeatmap.innerHTML = cards.join("");
    streakHeatmap.classList.toggle("hidden", !ui.streakHeatmapExpanded);
  }

  if (toggleStreakHeatmapBtn) {
    toggleStreakHeatmapBtn.textContent = ui.streakHeatmapExpanded ? "收起月历" : "展开月历";
  }
}

function renderChildTasks() {
  const dayMap = state.completions[todayKey()] || {};
  childTaskList.innerHTML = "";
  let completedCount = 0;

  for (const task of state.tasks) {
    const completion = dayMap[task.id];
    let action = `<button data-child-task-submit="${task.id}">提交完成</button>`;

    if (completion?.state === "pending") {
      action = '<span class="badge-pending">已提交，待家长评分</span>';
    }
    if (completion?.state === "rejected") {
      action = `<span class="badge-pending">已驳回：${completion.reason || "请补充后再提交"}</span><button data-child-task-submit="${task.id}">重新提交</button>`;
    }
    if (completion?.state === "rated") {
      const starsAwarded = typeof completion.starsAwarded === "number" ? completion.starsAwarded : 0;
      action = `<span class="badge-ok">已评分：${completion.rating} ${starsAwarded > 0 ? `+${starsAwarded}` : "+0"}⭐</span><small>${completion.feedback || ""}</small>`;
      completedCount += 1;
    }

    const proofHtml = task.needProof && !completion
      ? `<div class="child-task-proof"><small>需要拍照凭证</small><input type="file" accept="image/*" data-proof-task-id="${task.id}" /></div>`
      : task.needProof
        ? `<div class="child-task-proof"><small>需要拍照凭证</small></div>`
        : "";

    const li = document.createElement("li");
    li.className = `item child-task-item ${!completion || completion?.state === "rejected" ? "pending-highlight" : ""}`;
    li.innerHTML = `
      <div class="child-task-main">
        <strong>${task.name}</strong>
        <small class="child-task-meta">满分可得 ${task.stars}⭐ | 预计 +${task.stars}⭐</small>
        ${proofHtml}
      </div>
      <div class="task-actions">${action}</div>
    `;
    childTaskList.appendChild(li);
  }

  if (todayTaskSummary) {
    todayTaskSummary.textContent = `今天已完成 ${completedCount}/${state.tasks.length} 项`;
  }
}

function renderChildRewards() {
  childRewardList.innerHTML = "";
  for (const reward of state.rewards) {
    const leftStock = remainingStock(reward);
    const hasStock = leftStock > 0;
    const canCooldown = canRedeemByCooldown(reward);
    const canRedeem = state.stars >= reward.cost && hasStock && canCooldown;
    const stockText = Number.isFinite(reward.stock) ? ` | 本周还能换 ${leftStock} 次` : "";
    const cooldownText = Number(reward.cooldownDays || 0) > 0 ? ` | 冷却${reward.cooldownDays}天` : "";
    const shortfallText = state.stars < reward.cost ? ` | 还差 ${reward.cost - state.stars}⭐` : " | 可兑换";
    const resetTip = Number.isFinite(reward.stock) ? ` | 下次恢复 ${nextWeekResetLabel()}` : "";
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `
      <div>
        <strong>${reward.name}</strong><br />
        <small>需要 ${reward.cost}⭐${stockText}${cooldownText}${shortfallText}${resetTip}</small>
      </div>
      <button data-child-reward="${reward.id}" ${canRedeem ? "" : "disabled"}>兑换</button>
    `;
    childRewardList.appendChild(li);
  }
}

function renderParentTasks() {
  parentTaskList.innerHTML = "";
  for (const [index, task] of state.tasks.entries()) {
    const canMoveUp = index > 0;
    const canMoveDown = index < state.tasks.length - 1;
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `
      <div>
        <strong>${index + 1}. ${task.name}</strong><br />
        <small>星星值：${task.stars}⭐${task.needProof ? " | 需凭证" : ""}</small>
      </div>
      <div class="task-actions">
        <div class="rate-buttons">
          <button class="btn-ghost" data-parent-task-move="${task.id}" data-direction="up" ${canMoveUp ? "" : "disabled"}>上移</button>
          <button class="btn-ghost" data-parent-task-move="${task.id}" data-direction="down" ${canMoveDown ? "" : "disabled"}>下移</button>
        </div>
        <button class="btn-soft" data-parent-task-edit="${task.id}">修改</button>
        <button class="btn-passive" data-parent-task-delete="${task.id}">删除</button>
      </div>
    `;
    parentTaskList.appendChild(li);
  }
}

function renderParentRewards() {
  parentRewardList.innerHTML = "";
  for (const [index, reward] of state.rewards.entries()) {
    const canMoveUp = index > 0;
    const canMoveDown = index < state.rewards.length - 1;
    const stockText = Number.isFinite(reward.stock) ? `每周${reward.stock}，余${remainingStock(reward)}` : "不限";
    const cooldownText = Number(reward.cooldownDays || 0) > 0 ? ` | 冷却：${reward.cooldownDays}天` : "";
    const resetTip = Number.isFinite(reward.stock) ? ` | 恢复：${nextWeekResetLabel()}` : "";
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `
      <div>
        <strong>${index + 1}. ${reward.name}</strong><br />
        <small>兑换值：${reward.cost}⭐ | 库存：${stockText}${cooldownText}${resetTip}</small>
      </div>
      <div class="task-actions">
        <div class="rate-buttons">
          <button class="btn-ghost" data-parent-reward-move="${reward.id}" data-direction="up" ${canMoveUp ? "" : "disabled"}>上移</button>
          <button class="btn-ghost" data-parent-reward-move="${reward.id}" data-direction="down" ${canMoveDown ? "" : "disabled"}>下移</button>
        </div>
        <button class="btn-soft" data-parent-reward-edit="${reward.id}">修改</button>
        <button class="btn-passive" data-parent-reward-delete="${reward.id}">删除</button>
      </div>
    `;
    parentRewardList.appendChild(li);
  }
}

function renderParentPending() {
  parentPendingList.innerHTML = "";
  const dayMap = state.completions[todayKey()] || {};
  const keyword = (pendingSearchInput?.value || "").trim().toLowerCase();
  const pendingTasks = state.tasks.filter((task) => {
    if (dayMap[task.id]?.state !== "pending") return false;
    if (!keyword) return true;
    return task.name.toLowerCase().includes(keyword);
  });

  if (!pendingTasks.length) {
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = "<small>今天没有待评分任务。</small>";
    parentPendingList.appendChild(li);
    return;
  }

  for (const task of pendingTasks) {
    const completion = dayMap[task.id];
    const proofInfo = completion?.proofName ? `凭证：${completion.proofName}` : "无凭证";
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `
      <div>
        <strong>${task.name}</strong><br />
        <small>满分 ${task.stars}⭐ | ${proofInfo}</small>
      </div>
      <div class="task-actions">
        <div class="rate-buttons">
          <button class="btn-rate btn-active" data-parent-rate="${task.id}" data-rating="${RATING_ACTIVE}">${RATING_ACTIVE}</button>
          <button class="btn-rate btn-remind" data-parent-rate="${task.id}" data-rating="${RATING_REMIND}">${RATING_REMIND}</button>
          <button class="btn-rate btn-passive" data-parent-rate="${task.id}" data-rating="${RATING_PASSIVE}">${RATING_PASSIVE}</button>
        </div>
        <div class="partial-rate-row">
          <input type="number" min="0" max="99" value="${task.stars}" data-partial-input="${task.id}" />
          <button class="btn-soft" data-parent-partial="${task.id}">部分给⭐</button>
        </div>
        <button class="btn-passive" data-parent-reject="${task.id}">驳回</button>
      </div>
    `;
    parentPendingList.appendChild(li);
  }
}

function toDateKeyFromHistory(item) {
  if (typeof item.dateKey === "string" && item.dateKey) return item.dateKey;
  if (typeof item.at === "string") {
    const parsed = new Date(item.at);
    if (!Number.isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, "0");
      const d = String(parsed.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }
  return "unknown";
}

function historyDayLabel(dateKey) {
  if (dateKey === "unknown") return "更早记录";
  const today = todayKey();
  if (dateKey === today) return "今天";
  if (dateKey === shiftDay(today, -1)) return "昨天";
  return dateKey;
}

function renderHistory(target, filter) {
  target.innerHTML = "";
  let list = state.history;
  const keyword = (historySearchInput?.value || "").trim().toLowerCase();
  if (filter === "today") {
    const today = todayKey();
    list = state.history.filter((item) => toDateKeyFromHistory(item) === today);
  } else if (filter !== "all") {
    list = state.history.filter((item) => item.type === filter);
  }

  if (keyword) {
    list = list.filter((item) => String(item.text || "").toLowerCase().includes(keyword));
  }
  if (!list.length) {
    const li = document.createElement("li");
    li.textContent = "还没有记录。";
    target.appendChild(li);
    return;
  }

  let currentGroup = "";
  for (const item of list) {
    const dateKey = toDateKeyFromHistory(item);
    const label = historyDayLabel(dateKey);
    if (label !== currentGroup) {
      currentGroup = label;
      const groupLi = document.createElement("li");
      groupLi.className = "history-group";
      groupLi.textContent = label;
      target.appendChild(groupLi);
    }

    const li = document.createElement("li");
    const cls = item.delta >= 0 ? "plus" : "minus";
    const sign = item.delta >= 0 ? "+" : "";
    const deltaText = item.delta !== 0 ? ` <span class="${cls}">${sign}${item.delta}⭐</span>` : "";
    li.innerHTML = `<strong>${item.text}</strong>${deltaText}<br /><small>${item.at}</small>`;
    target.appendChild(li);
  }
}

function renderStats() {
  const range = statsRange?.value || "week";
  const startOfWeek = weekStartKey();
  const ratedList = [];
  const scopedHistory = state.history.filter((item) => {
    if (range !== "week") return true;
    const day = toDateKeyFromHistory(item);
    if (day === "unknown") return false;
    return day >= startOfWeek;
  });

  let earnedStars = 0;
  let spentStars = 0;
  for (const item of scopedHistory) {
    const delta = Number(item.delta || 0);
    if (delta > 0) earnedStars += delta;
    if (delta < 0) spentStars += Math.abs(delta);
  }

  const trendDays = [];
  const historyByDay = {};
  for (const item of state.history) {
    const day = toDateKeyFromHistory(item);
    if (day === "unknown") continue;
    if (!historyByDay[day]) historyByDay[day] = [];
    historyByDay[day].push(item);
  }

  for (let i = 6; i >= 0; i -= 1) {
    const day = shiftDay(todayKey(), -i);
    const dayHistory = historyByDay[day] || [];
    let plus = 0;
    let minus = 0;
    for (const item of dayHistory) {
      const delta = Number(item.delta || 0);
      if (delta > 0) plus += delta;
      if (delta < 0) minus += Math.abs(delta);
    }
    const ratedCount = Object.values(state.completions[day] || {}).filter((item) => item?.state === "rated").length;
    trendDays.push({ day, net: plus - minus, ratedCount });
  }

  const contributionMap = {};
  for (const [dayKey, dayMap] of Object.entries(state.completions)) {
    if (range === "week" && dayKey < startOfWeek) continue;
    for (const [taskId, completion] of Object.entries(dayMap)) {
      if (completion?.state !== "rated") continue;
      if (!contributionMap[taskId]) {
        contributionMap[taskId] = {
          taskId,
          stars: 0,
          count: 0,
          activeCount: 0
        };
      }
      contributionMap[taskId].stars += Number(completion.starsAwarded || 0);
      contributionMap[taskId].count += 1;
      if (completion.rating === RATING_ACTIVE) contributionMap[taskId].activeCount += 1;
    }
  }

  for (const [dayKey, dayMap] of Object.entries(state.completions)) {
    if (range === "week" && dayKey < startOfWeek) continue;
    for (const completion of Object.values(dayMap)) {
      if (completion?.state === "rated") ratedList.push(completion);
    }
  }

  const total = ratedList.length;
  const active = ratedList.filter((item) => item.rating === RATING_ACTIVE).length;
  const remind = ratedList.filter((item) => item.rating === RATING_REMIND).length;
  const passive = ratedList.filter((item) => item.rating === RATING_PASSIVE).length;
  const activeRate = total ? Math.round((active / total) * 100) : 0;
  const remindRate = total ? Math.round((remind / total) * 100) : 0;
  const passiveRate = total ? Math.round((passive / total) * 100) : 0;
  const rangeText = range === "week" ? "本周" : "全部";
  const goalEarned = range === "week" ? weeklyEarned() : earnedStars;
  const goal = Math.max(5, Number(state.weeklyGoal || 20));
  const goalRate = Math.min(100, Math.round((goalEarned / goal) * 100));
  const netStars = earnedStars - spentStars;
  const redeemCount = scopedHistory.filter((item) => item.type === "redeem").length;

  const maxTrendAbs = Math.max(1, ...trendDays.map((item) => Math.abs(item.net)));
  const trendWidth = 330;
  const trendHeight = 118;
  const trendPadding = 14;
  const trendStep = (trendWidth - trendPadding * 2) / Math.max(1, trendDays.length - 1);
  const trendToY = (value) => {
    const normalized = (value + maxTrendAbs) / (maxTrendAbs * 2);
    return Math.round((1 - normalized) * (trendHeight - trendPadding * 2) + trendPadding);
  };
  const trendPoints = trendDays
    .map((item, index) => `${Math.round(trendPadding + trendStep * index)},${trendToY(item.net)}`)
    .join(" ");
  const trendDots = trendDays
    .map((item, index) => {
      const x = Math.round(trendPadding + trendStep * index);
      const y = trendToY(item.net);
      return `<circle cx="${x}" cy="${y}" r="3"></circle>`;
    })
    .join("");
  const trendLabels = trendDays
    .map((item) => `<span title="${item.day} 净增长 ${item.net >= 0 ? "+" : ""}${item.net}⭐">${item.day.slice(5)}</span>`)
    .join("");

  const contributionRows = Object.values(contributionMap)
    .sort((a, b) => b.stars - a.stars || b.count - a.count)
    .slice(0, 5)
    .map((item) => {
      const task = state.tasks.find((taskItem) => taskItem.id === item.taskId);
      const taskName = task?.name || "已删除任务";
      const activeRateByTask = item.count ? Math.round((item.activeCount / item.count) * 100) : 0;
      return {
        taskName,
        stars: item.stars,
        count: item.count,
        activeRateByTask
      };
    });
  const maxContributionStars = Math.max(1, ...contributionRows.map((row) => row.stars));
  const contributionHtml = contributionRows.length
    ? contributionRows.map((row, index) => {
      const width = Math.max(10, Math.round((row.stars / maxContributionStars) * 100));
      return `
        <li class="rank-row">
          <div class="rank-main">
            <small class="rank-index">TOP ${index + 1}</small>
            <strong>${row.taskName}</strong>
            <small>完成 ${row.count} 次 | 主动率 ${row.activeRateByTask}%</small>
          </div>
          <div class="rank-side">
            <b>+${row.stars}⭐</b>
            <div class="rank-track"><div class="rank-fill" style="width:${width}%"></div></div>
          </div>
        </li>
      `;
    }).join("")
    : "<div class=\"rank-empty\">还没有可统计的评分数据。</div>";

  const bestDay = trendDays.reduce((best, item) => (item.net > best.net ? item : best), trendDays[0]);
  const supportDay = trendDays.reduce((worst, item) => (item.net < worst.net ? item : worst), trendDays[0]);
  const avgRated = Math.round((trendDays.reduce((sum, item) => sum + item.ratedCount, 0) / trendDays.length) * 10) / 10;
  const todayMap = state.completions[todayKey()] || {};
  const pendingToday = Object.values(todayMap).filter((item) => item?.state === "pending").length;
  const rejectedToday = Object.values(todayMap).filter((item) => item?.state === "rejected").length;
  const passiveToday = Object.values(todayMap).filter((item) => item?.state === "rated" && item?.rating === RATING_PASSIVE).length;
  const submittedToday = Object.keys(todayMap).length;
  const notSubmittedToday = Math.max(0, state.tasks.length - submittedToday);

  let liveFocusText = "今天节奏不错，继续保持稳定输出。";
  if (rejectedToday > 0) {
    liveFocusText = `今天有 ${rejectedToday} 项被驳回，建议晚点一起复盘细节。`;
  } else if (pendingToday > 0) {
    liveFocusText = `今天还有 ${pendingToday} 项待家长评分，建议今天内完成反馈。`;
  } else if (passiveToday > 0) {
    liveFocusText = `今天出现 ${passiveToday} 项被动完成，建议先肯定再引导主动。`;
  } else if (notSubmittedToday === state.tasks.length && state.tasks.length > 0) {
    liveFocusText = "今天还没开始提交任务，可以先完成最简单的一项。";
  }

  statsBox.innerHTML = `
    <div class="stat-item stat-hero">
      <small>${rangeText}星星变化</small>
      <b>${netStars >= 0 ? "+" : ""}${netStars}⭐</b>
      <em>${rangeText}目标进度 ${goalEarned}/${goal}⭐（${goalRate}%）</em>
    </div>
    <div class="stat-item stat-live-focus">
      <small>今日即时关注</small>
      <b>${pendingToday + rejectedToday + passiveToday} 条</b>
      <em>${liveFocusText}</em>
    </div>
    <div class="stat-item stat-pill"><small>${rangeText}总评分</small><b>${total}</b></div>
    <div class="stat-item stat-pill"><small>主动率</small><b>${activeRate}%</b></div>
    <div class="stat-item stat-pill"><small>提醒次数</small><b>${remind}</b></div>
    <div class="stat-item stat-pill"><small>被动次数</small><b>${passive}</b></div>
    <div class="stat-item stat-pill"><small>${rangeText}获得</small><b>+${earnedStars}⭐</b></div>
    <div class="stat-item stat-pill"><small>${rangeText}兑换</small><b>-${spentStars}⭐（${redeemCount}次）</b></div>
    <div class="stat-item stat-pill"><small>最近最闪亮一天</small><b>${bestDay.day.slice(5)}（${bestDay.net >= 0 ? "+" : ""}${bestDay.net}⭐）</b></div>
    <div class="stat-item stat-pill"><small>最近最需鼓励一天（历史）</small><b>${supportDay.day.slice(5)}（${supportDay.net >= 0 ? "+" : ""}${supportDay.net}⭐）</b></div>
    <div class="stat-item stat-pill"><small>最近日均评分任务</small><b>${avgRated} 项</b></div>
    <div class="stat-chart stat-rating-chart">
      <div class="stat-chart-title">评分分布</div>
      <div class="chart-row"><small>主动</small><div class="chart-track"><div class="chart-fill fill-active" style="width:${activeRate}%"></div></div><small>${activeRate}%</small></div>
      <div class="chart-row"><small>提醒</small><div class="chart-track"><div class="chart-fill fill-remind" style="width:${remindRate}%"></div></div><small>${remindRate}%</small></div>
      <div class="chart-row"><small>被动</small><div class="chart-track"><div class="chart-fill fill-passive" style="width:${passiveRate}%"></div></div><small>${passiveRate}%</small></div>
    </div>
    <div class="stat-chart stat-trend-chart">
      <div class="stat-chart-title">最近7天星星变化</div>
      <small class="stat-chart-sub">上方越高，表示当天净增加的⭐越多。</small>
      <svg viewBox="0 0 ${trendWidth} ${trendHeight}" role="img" aria-label="近7天净增长趋势图">
        <line class="trend-midline" x1="0" y1="${trendToY(0)}" x2="${trendWidth}" y2="${trendToY(0)}"></line>
        <polyline class="trend-line" fill="none" points="${trendPoints}"></polyline>
        ${trendDots}
      </svg>
      <div class="trend-labels">${trendLabels}</div>
    </div>
    <div class="stat-chart stat-rank-chart">
      <div class="stat-chart-title">最给力任务榜</div>
      <small class="stat-chart-sub">看看哪些任务最能稳定赚⭐。</small>
      <ul class="rank-list">${contributionHtml}</ul>
    </div>
  `;
}

function renderBackupReminder() {
  if (!backupReminderBadge) return;
  const days = daysBetween(Number(state.lastBackupExportAt || 0));
  const hasData = state.history.length > 0 || state.tasks.length > 0 || state.rewards.length > 0;
  const shouldShow = hasData && days >= 7;
  backupReminderBadge.classList.toggle("hidden", !shouldShow);
  if (!shouldShow) return;

  if (!state.lastBackupExportAt) {
    backupReminderBadge.textContent = "建议先导出一次 JSON 备份，避免浏览器数据意外丢失。";
    return;
  }

  backupReminderBadge.textContent = `距离上次 JSON 备份已 ${days} 天，建议今天导出一次。`;
}

function renderSyncStatus() {
  if (!syncStatusText) return;
  const sync = state.serverSync;
  const lastSyncText = sync.lastSyncAt ? new Date(sync.lastSyncAt).toLocaleString() : "首次使用";
  syncStatusText.textContent = `同步模式：服务器SQLite（自动保存，最近：${lastSyncText}）`;
}

function setSyncStatus(text) {
  state.serverSync.lastSyncAt = Date.now();
  state.serverSync.lastSyncStatus = text;
}

function applyPulledServerData(serverData, options = {}) {
  const {
    captureLabel,
    successStatus = "拉取成功",
    historyText = "已从服务器拉取数据"
  } = options;

  if (captureLabel) captureRestorePoint(captureLabel);

  const keepServerSync = { ...state.serverSync };
  const keepRestorePoints = [...state.restorePoints];
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, { ...structuredClone(defaultData), ...serverData });
  state.serverSync = keepServerSync;
  state.serverSync.pendingChanges = false;
  setSyncStatus(successStatus);
  state.restorePoints = keepRestorePoints;
  normalizeDataShape();
  if (historyText) addHistory(historyText, 0, "system");
  saveData({ markPending: false });
  renderAll();
}

function renderAuthStatus() {
  if (authChip) authChip.classList.toggle("is-authenticated", Boolean(authState.token));
  if (authUserText) authUserText.textContent = authState.username ? `账号：${authState.username}` : "未登录";
  if (authOpenBtn) authOpenBtn.classList.toggle("hidden", Boolean(authState.token));
  if (authLogoutBtn) authLogoutBtn.classList.toggle("hidden", !authState.token);
}

function setAuthMode(mode) {
  ui.authMode = mode === "register" ? "register" : "login";
  const isRegister = ui.authMode === "register";

  if (authModeLoginBtn) authModeLoginBtn.classList.toggle("is-active", !isRegister);
  if (authModeRegisterBtn) authModeRegisterBtn.classList.toggle("is-active", isRegister);
  if (authModalTitleText) authModalTitleText.textContent = isRegister ? "注册账号" : "登录账号";
  if (authModalDescText) authModalDescText.textContent = isRegister
    ? "注册后将自动登录，并开始同步你的家庭数据。"
    : "使用已有账号登录，继续你的任务与奖励记录。";
  if (authHintText) authHintText.textContent = isRegister
    ? "已有账号？可直接切回登录。"
    : "没有账号？先注册再自动登录。";
  if (authSubmitBtn) authSubmitBtn.textContent = isRegister ? "注册并登录" : "登录";
  if (authSwitchBtn) authSwitchBtn.textContent = isRegister ? "去登录" : "去注册";
}

function openAuthModal(mode = "login") {
  if (!authModal) return;
  setAuthMode(mode);
  authModal.classList.remove("hidden");
  if (authUsernameInput) authUsernameInput.focus();
}

function closeAuthModal() {
  if (!authModal) return;
  authModal.classList.add("hidden");
  if (authPasswordInput) authPasswordInput.value = "";
}

async function showAuthError(message, title) {
  const currentMode = ui.authMode;
  const currentUsername = String(authUsernameInput?.value || "");
  closeAuthModal();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await showAlert(message, title);
  openAuthModal(currentMode);
  if (authUsernameInput) authUsernameInput.value = currentUsername;
}

function renderAll() {
  applyTimezoneConfig();
  const activeElement = document.activeElement;
  const activeInputState = activeElement instanceof HTMLInputElement && activeElement.id
    ? {
      id: activeElement.id,
      start: activeElement.selectionStart,
      end: activeElement.selectionEnd
    }
    : null;
  const starsChanged = lastRenderedStars !== state.stars;
  const weeklyGrantApplied = ensureWeeklyMakeupCardGrant();
  if (weeklyGrantApplied) saveData();
  refreshStreakFromCheckins();
  todayDateText.textContent = `今天是 ${formatTodayLabel()}`;
  document.body.dataset.theme = state.theme || "sunny";
  childStarCount.textContent = String(state.stars);
  parentStarCount.textContent = String(state.stars);
  soundToggle.checked = Boolean(state.soundEnabled);
  reduceMotionToggle.checked = Boolean(state.reduceMotion);
  if (streakFeatureToggle) streakFeatureToggle.checked = Boolean(state.streakEnabled);
  if (childStreakCard) childStreakCard.classList.toggle("hidden", !state.streakEnabled);
  if (childTopGrid) childTopGrid.classList.toggle("streak-off", !state.streakEnabled);
  if (makeupSettingsCol) makeupSettingsCol.classList.toggle("hidden", !state.streakEnabled);
  document.body.classList.toggle("reduce-motion", Boolean(state.reduceMotion));
  weeklyGoalInput.value = String(state.weeklyGoal);
  pinGraceInput.value = String(state.pinGraceMinutes);
  if (timezoneSelect) {
    timezoneSelect.value = state.timeConfig.fixedOffsetMinutes === null ? "" : String(state.timeConfig.fixedOffsetMinutes);
  }
  if (timezoneSummary) {
    timezoneSummary.textContent = `当前：${timezoneOffsetText(state.timeConfig.fixedOffsetMinutes)}`;
  }
  makeupWeeklyLimitInput.value = String(state.makeupConfig.weeklyLimit);
  if (makeupCardWeeklyInput) makeupCardWeeklyInput.value = String(state.makeupConfig.weeklyCardGrant || 0);
  makeupCountMilestoneToggle.checked = Boolean(state.makeupConfig.countForMilestone);
  if (makeupRuleSummary) {
    const remain = getMakeupRemainThisWeek();
    const limit = Number(state.makeupConfig.weeklyLimit || 0);
    const weeklyGrant = Number(state.makeupConfig.weeklyCardGrant || 0);
    const balance = Number(state.makeupCardBalance || 0);
    makeupRuleSummary.textContent = `当前：每周最多补签 ${limit} 次，每周自动发卡 ${weeklyGrant} 张，库存 ${balance} 张，本周剩余 ${remain} 次（仅支持补昨天）`;
  }
  themeSelect.value = state.theme || "sunny";
  if (bonusWeeklyLimitInput) {
    bonusWeeklyLimitInput.value = String(state.bonusConfig.weeklyLimit || 30);
  }
  if (bonusLimitText) {
    bonusLimitText.textContent = `本周额外奖励剩余：${getBonusRemainThisWeek()}⭐（每周上限 ${state.bonusConfig.weeklyLimit}⭐）`;
  }
  renderAuthStatus();
  renderSyncStatus();
  renderRole();
  renderStreak();
  renderWeeklyGoal();

  renderChildTasks();
  renderChildRewards();
  renderParentTasks();
  renderParentRewards();
  renderParentPending();
  renderStats();
  renderBackupReminder();
  if (childHistoryList && childHistoryFilter) {
    renderHistory(childHistoryList, childHistoryFilter.value);
  }
  renderHistory(parentHistoryList, parentHistoryFilter.value);
  renderRestorePoints();

  if (starsChanged) {
    childStarCount.classList.remove("count-pop");
    parentStarCount.classList.remove("count-pop");
    void childStarCount.offsetWidth;
    childStarCount.classList.add("count-pop");
    parentStarCount.classList.add("count-pop");
    lastRenderedStars = state.stars;
  }

  if (activeInputState) {
    const nextActive = document.getElementById(activeInputState.id);
    if (nextActive instanceof HTMLInputElement) {
      nextActive.focus({ preventScroll: true });
      if (typeof activeInputState.start === "number" && typeof activeInputState.end === "number") {
        nextActive.setSelectionRange(activeInputState.start, activeInputState.end);
      }
    }
  }
}

roleSwitch.addEventListener("click", (event) => {
  if (!authState.token) {
    openAuthModal();
    return;
  }

  const button = event.target instanceof Element ? event.target.closest("button") : null;
  if (!(button instanceof HTMLButtonElement) || !roleSwitch.contains(button)) return;
  const role = button.dataset.role;
  if (role !== "child" && role !== "parent") return;

  const parentUnlockValid = Date.now() < Number(state.parentUnlockUntil || 0);
  if (role === "parent" && state.pinEnabled && !parentUnlockValid) {
    openPinModal();
    return;
  }

  ui.role = role;
  localStorage.setItem(ROLE_KEY, role);
  renderRole();
});

pinVerifyBtn.addEventListener("click", async () => {
  if (pinVerifyInput.value !== state.pin) {
    ui.pinFailCount += 1;
    const tip = ui.pinFailCount >= 3 ? "请确认是否使用了最新PIN。" : "请再试一次。";
    await showAlert(`PIN不正确。${tip}`, "验证失败");
    return;
  }
  closePinModal();
  ui.pinFailCount = 0;
  state.parentUnlockUntil = Date.now() + Number(state.pinGraceMinutes || 0) * 60 * 1000;
  ui.role = "parent";
  localStorage.setItem(ROLE_KEY, "parent");
  saveData();
  renderRole();
});

pinVerifyInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    pinVerifyBtn.click();
  }
});

pinCancelBtn.addEventListener("click", closePinModal);
pinModal.addEventListener("click", (event) => {
  if (event.target === pinModal) closePinModal();
});

bindUiModalEvents();

goalForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const goal = Number(weeklyGoalInput.value);
  if (!Number.isFinite(goal) || goal < 5) return;
  captureRestorePoint("修改每周目标前");
  state.weeklyGoal = goal;
  addHistory(`设置每周目标：${goal}⭐`, 0, "system");
  saveData();
  renderAll();
});

pinForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const pin = pinInput.value.trim();
  if (pin.length < 4 || pin.length > 8) {
    await showAlert("PIN长度需为4-8位", "PIN格式不正确");
    return;
  }
  captureRestorePoint("修改PIN前");
  state.pinEnabled = true;
  state.pin = pin;
  addHistory("已更新家长PIN", 0, "system");
  saveData();
  pinForm.reset();
});

pinOffBtn.addEventListener("click", () => {
  captureRestorePoint("关闭PIN前");
  state.pinEnabled = false;
  state.pin = "";
  state.parentUnlockUntil = 0;
  addHistory("已关闭家长PIN", 0, "system");
  saveData();
});

pinGraceForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const minutes = Number(pinGraceInput.value);
  if (!Number.isFinite(minutes) || minutes < 0 || minutes > 120) return;
  captureRestorePoint("修改PIN免输时长前");
  state.pinGraceMinutes = minutes;
  addHistory(`已更新PIN免输时长：${minutes}分钟`, 0, "system");
  saveData();
});

soundToggle.addEventListener("change", () => {
  captureRestorePoint("切换音效前");
  state.soundEnabled = soundToggle.checked;
  addHistory(state.soundEnabled ? "已开启音效反馈" : "已关闭音效反馈", 0, "system");
  saveData();
});

reduceMotionToggle.addEventListener("change", () => {
  captureRestorePoint("切换动画模式前");
  state.reduceMotion = reduceMotionToggle.checked;
  addHistory(state.reduceMotion ? "已开启简化动画" : "已关闭简化动画", 0, "system");
  saveData();
  renderAll();
});

if (timezoneForm) {
  timezoneForm.addEventListener("submit", (event) => {
    event.preventDefault();
    captureRestorePoint("修改家庭时区前");
    const raw = String(timezoneSelect?.value || "").trim();
    state.timeConfig.fixedOffsetMinutes = raw === "" ? null : Number(raw);
    applyTimezoneConfig();
    addHistory(`已更新家庭时区：${timezoneOffsetText(state.timeConfig.fixedOffsetMinutes)}`, 0, "system");
    saveData();
    renderAll();
  });
}

if (streakFeatureToggle) {
  streakFeatureToggle.addEventListener("change", () => {
    captureRestorePoint("切换连续打卡功能前");
    state.streakEnabled = streakFeatureToggle.checked;
    addHistory(state.streakEnabled ? "已开启连续打卡功能" : "已关闭连续打卡功能", 0, "system");
    saveData();
    renderAll();
  });
}

makeupConfigForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const weeklyLimit = Number(makeupWeeklyLimitInput.value);
  if (!Number.isFinite(weeklyLimit) || weeklyLimit < 0) return;
  captureRestorePoint("修改补签规则前");
  state.makeupConfig.weeklyLimit = weeklyLimit;
  state.makeupConfig.windowDays = 1;
  addHistory("已更新补签规则", 0, "system");
  saveData();
  renderAll();
});

if (makeupCardWeeklyForm) {
  makeupCardWeeklyForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const weeklyGrant = Number(makeupCardWeeklyInput.value);
    if (!Number.isFinite(weeklyGrant) || weeklyGrant < 0) return;
    captureRestorePoint("修改每周补签卡发放前");
    state.makeupConfig.weeklyCardGrant = weeklyGrant;
    addHistory(`已更新每周补签卡发放：${weeklyGrant} 张`, 0, "system");
    saveData();
    renderAll();
  });
}

if (makeupCardGrantForm) {
  makeupCardGrantForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const grantCount = Number(makeupCardGrantInput.value);
    if (!Number.isFinite(grantCount) || grantCount < 1) return;
    captureRestorePoint("家长奖励补签卡前");
    grantMakeupCards(grantCount, "家长奖励补签卡");
    saveData();
    renderAll();
  });
}

makeupCountMilestoneToggle.addEventListener("change", () => {
  captureRestorePoint("切换补签里程碑前");
  state.makeupConfig.countForMilestone = makeupCountMilestoneToggle.checked;
  addHistory(state.makeupConfig.countForMilestone ? "补签可触发里程碑奖励" : "补签不触发里程碑奖励", 0, "system");
  saveData();
});

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = taskName.value.trim();
  const stars = Number(taskStars.value);
  if (!name || Number.isNaN(stars) || stars < 1) return;
  captureRestorePoint(ui.editingTaskId ? "编辑任务前" : "新增任务前");

  if (ui.editingTaskId) {
    const task = state.tasks.find((item) => item.id === ui.editingTaskId);
    if (!task) return;
    task.name = name;
    task.stars = stars;
    task.needProof = Boolean(taskNeedProof.checked);
    addHistory(`修改任务「${name}」`, 0, "system");
  } else {
    state.tasks.push({ id: crypto.randomUUID(), name, stars, needProof: Boolean(taskNeedProof.checked) });
    addHistory(`新增任务「${name}」`, 0, "system");
  }

  clearTaskEdit();
  saveData();
  renderAll();
});

rewardForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = rewardName.value.trim();
  const cost = Number(rewardCost.value);
  const stockValue = rewardStock.value.trim();
  const stock = stockValue === "" ? null : Number(stockValue);
  const cooldownValue = rewardCooldown.value.trim();
  const cooldownDays = cooldownValue === "" ? 0 : Number(cooldownValue);
  if (!name || Number.isNaN(cost) || cost < 1) return;
  if (stock !== null && (Number.isNaN(stock) || stock < 0)) return;
  if (!Number.isFinite(cooldownDays) || cooldownDays < 0) return;
  captureRestorePoint(ui.editingRewardId ? "编辑奖励前" : "新增奖励前");

  if (ui.editingRewardId) {
    const reward = state.rewards.find((item) => item.id === ui.editingRewardId);
    if (!reward) return;
    reward.name = name;
    reward.cost = cost;
    reward.stock = stock;
    reward.cooldownDays = cooldownDays;
    addHistory(`修改奖励「${name}」`, 0, "system");
  } else {
    state.rewards.push({ id: crypto.randomUUID(), name, cost, stock, cooldownDays });
    addHistory(`新增奖励「${name}」`, 0, "system");
  }

  clearRewardEdit();
  saveData();
  renderAll();
});

bonusForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const reason = bonusReason.value.trim();
  const stars = Number(bonusStars.value);
  const ok = await grantBonusByParent(reason, stars);
  if (!ok) return;
  bonusForm.reset();
  bonusStars.value = "1";
});

if (bonusLimitForm) {
  bonusLimitForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const weeklyLimit = Number(bonusWeeklyLimitInput?.value || 0);
    if (!Number.isFinite(weeklyLimit) || weeklyLimit < 1) return;
    captureRestorePoint("修改额外奖励上限前");
    state.bonusConfig.weeklyLimit = Math.round(weeklyLimit);
    addHistory(`已更新每周额外奖励上限：${state.bonusConfig.weeklyLimit}⭐`, 0, "system");
    saveData();
    renderAll();
  });
}

taskCancelEdit.addEventListener("click", clearTaskEdit);
rewardCancelEdit.addEventListener("click", clearRewardEdit);

if (childHistoryFilter) {
  childHistoryFilter.addEventListener("change", renderAll);
}
parentHistoryFilter.addEventListener("change", renderAll);
if (statsRange) {
  statsRange.addEventListener("change", renderAll);
}
if (historySearchInput) {
  historySearchInput.addEventListener("input", renderAll);
}
if (pendingSearchInput) {
  pendingSearchInput.addEventListener("input", renderAll);
}

themeSelect.addEventListener("change", () => {
  state.theme = themeSelect.value;
  saveData();
  renderAll();
});

if (authOpenBtn) {
  authOpenBtn.addEventListener("click", () => {
    openAuthModal();
  });
}

if (welcomeAuthBtn) {
  welcomeAuthBtn.addEventListener("click", () => {
    openAuthModal();
  });
}

if (authModeLoginBtn) {
  authModeLoginBtn.addEventListener("click", () => {
    setAuthMode("login");
  });
}

if (authModeRegisterBtn) {
  authModeRegisterBtn.addEventListener("click", () => {
    setAuthMode("register");
  });
}

if (authSwitchBtn) {
  authSwitchBtn.addEventListener("click", () => {
    setAuthMode(ui.authMode === "register" ? "login" : "register");
  });
}

if (authCancelBtn) {
  authCancelBtn.addEventListener("click", () => {
    closeAuthModal();
  });
}

if (authModal) {
  authModal.addEventListener("click", (event) => {
    if (event.target === authModal) closeAuthModal();
  });
}

async function submitAuth() {
  const username = String(authUsernameInput?.value || "").trim();
  const password = String(authPasswordInput?.value || "").trim();
  const isRegister = ui.authMode === "register";

  if (isRegister) {
    if (username.length < 3 || password.length < 6) {
      await showAuthError("用户名至少3位，密码至少6位。", "注册失败");
      return;
    }

    const registerResult = await registerAccount(username, password);
    if (!registerResult.ok) {
      await showAuthError(registerResult.message, "注册失败");
      return;
    }

    authState.token = registerResult.data.token;
    authState.username = registerResult.data.username;
    saveAuthState();
    closeAuthModal();
    renderAll();
    await bootstrapServerState();
    await showAlert("注册并登录成功。", "欢迎");
    return;
  }

  if (!username || !password) {
    await showAuthError("请输入用户名和密码。", "登录失败");
    return;
  }

  const loginResult = await loginAccount(username, password);
  if (!loginResult.ok) {
    await showAuthError(loginResult.message, "登录失败");
    return;
  }

  authState.token = loginResult.data.token;
  authState.username = loginResult.data.username;
  saveAuthState();
  closeAuthModal();
  renderAll();
  await bootstrapServerState();
  await showAlert("登录成功。", "欢迎回来");
}

if (authSubmitBtn) {
  authSubmitBtn.addEventListener("click", async () => {
    await submitAuth();
  });
}

if (authPasswordInput) {
  authPasswordInput.addEventListener("keydown", async (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    await submitAuth();
  });
}

if (authLogoutBtn) {
  authLogoutBtn.addEventListener("click", async () => {
    await logoutAccount();
    renderAll();
    await showAlert("已退出登录。", "账户");
  });
}

restorePointBtn.addEventListener("click", () => {
  const pointId = restorePointSelect.value;
  if (!pointId) return;
  restoreFromPoint(pointId);
});

makeupCheckinBtn.addEventListener("click", () => {
  tryUseMakeupCard();
});

if (toggleStreakDetailsBtn) {
  toggleStreakDetailsBtn.addEventListener("click", () => {
    ui.streakDetailsExpanded = !ui.streakDetailsExpanded;
    if (!ui.streakDetailsExpanded) ui.streakHeatmapExpanded = false;
    renderStreak();
  });
}

if (toggleStreakHeatmapBtn) {
  toggleStreakHeatmapBtn.addEventListener("click", () => {
    ui.streakHeatmapExpanded = !ui.streakHeatmapExpanded;
    renderStreak();
  });
}

undoLastRatingBtn.addEventListener("click", () => {
  undoLastRating();
});

childTaskList.addEventListener("click", async (event) => {
  const button = event.target instanceof Element ? event.target.closest("button") : null;
  if (!(button instanceof HTMLButtonElement) || !childTaskList.contains(button)) return;
  const taskId = button.dataset.childTaskSubmit;
  if (!taskId) return;
  await submitTaskByChild(taskId);
});

childRewardList.addEventListener("click", async (event) => {
  const button = event.target instanceof Element ? event.target.closest("button") : null;
  if (!(button instanceof HTMLButtonElement) || !childRewardList.contains(button)) return;
  const rewardId = button.dataset.childReward;
  if (!rewardId) return;
  await openRedeemModal(rewardId);
});

redeemConfirmBtn.addEventListener("click", () => {
  if (!ui.pendingRedeemId) return;
  const id = ui.pendingRedeemId;
  closeRedeemModal();
  redeemRewardByChild(id);
});

redeemCancelBtn.addEventListener("click", closeRedeemModal);
redeemModal.addEventListener("click", (event) => {
  if (event.target === redeemModal) closeRedeemModal();
});

parentPendingList.addEventListener("click", async (event) => {
  const button = event.target instanceof Element ? event.target.closest("button") : null;
  if (!(button instanceof HTMLButtonElement) || !parentPendingList.contains(button)) return;

  const partialTaskId = button.dataset.parentPartial;
  if (partialTaskId) {
    const input = parentPendingList.querySelector(`input[data-partial-input="${partialTaskId}"]`);
    const stars = Number(input?.value || 0);
    if (!Number.isFinite(stars) || stars < 0) {
      await showAlert("请输入有效的部分星值。", "部分给星");
      return;
    }
    rateTaskByParent(partialTaskId, RATING_REMIND, { partialStars: stars });
    return;
  }

  const rejectTaskId = button.dataset.parentReject;
  if (rejectTaskId) {
    const reason = await showPrompt("请输入驳回原因", "请补充拍照凭证或任务细节", "驳回任务");
    if (reason === null) return;
    const day = todayKey();
    const completion = state.completions[day]?.[rejectTaskId];
    if (!completion || completion.state !== "pending") return;
    completion.state = "rejected";
    completion.reason = reason.trim() || "请补充后再提交";
    addHistory(`驳回任务，原因：${completion.reason}`, 0, "task");
    saveData();
    renderAll();
    return;
  }

  const taskId = button.dataset.parentRate;
  const rating = button.dataset.rating;
  if (!taskId || !rating) return;
  rateTaskByParent(taskId, rating);
});

async function approveAllPendingAs(rating) {
  const dayMap = state.completions[todayKey()] || {};
  const pendingTaskIds = state.tasks
    .filter((task) => dayMap[task.id]?.state === "pending")
    .map((task) => task.id);

  if (!pendingTaskIds.length) {
    await showAlert("今天没有待评分任务。", "无需操作");
    return;
  }
  const ok = await showConfirm(`确认将 ${pendingTaskIds.length} 个任务一键评为“${rating}”吗？`, "批量评分");
  if (!ok) return;

  for (const taskId of pendingTaskIds) {
    rateTaskByParent(taskId, rating, { silent: true });
  }
  playSound("good");
  renderAll();
}

approveAllActiveBtn.addEventListener("click", () => {
  approveAllPendingAs(RATING_ACTIVE);
});

approveAllRemindBtn.addEventListener("click", () => {
  approveAllPendingAs(RATING_REMIND);
});

parentTaskList.addEventListener("click", async (event) => {
  const button = event.target instanceof Element ? event.target.closest("button") : null;
  if (!(button instanceof HTMLButtonElement) || !parentTaskList.contains(button)) return;

  const editId = button.dataset.parentTaskEdit;
  if (editId) {
    const task = state.tasks.find((item) => item.id === editId);
    if (!task) return;
    ui.editingTaskId = editId;
    taskName.value = task.name;
    taskStars.value = String(task.stars);
    taskNeedProof.checked = Boolean(task.needProof);
    taskSubmitBtn.textContent = "保存任务";
    taskCancelEdit.classList.remove("hidden");
    return;
  }

  const deleteId = button.dataset.parentTaskDelete;
  if (deleteId) {
    const ok = await showConfirm("确认删除这个任务吗？", "删除任务");
    if (!ok) return;
    removeTask(deleteId);
    return;
  }

  const moveId = button.dataset.parentTaskMove;
  if (moveId) {
    const direction = button.dataset.direction;
    if (direction === "up" || direction === "down") {
      moveTask(moveId, direction);
    }
  }
});

parentRewardList.addEventListener("click", async (event) => {
  const button = event.target instanceof Element ? event.target.closest("button") : null;
  if (!(button instanceof HTMLButtonElement) || !parentRewardList.contains(button)) return;

  const editId = button.dataset.parentRewardEdit;
  if (editId) {
    const reward = state.rewards.find((item) => item.id === editId);
    if (!reward) return;
    ui.editingRewardId = editId;
    rewardName.value = reward.name;
    rewardCost.value = String(reward.cost);
    rewardStock.value = Number.isFinite(reward.stock) ? String(reward.stock) : "";
    rewardCooldown.value = Number(reward.cooldownDays || 0) > 0 ? String(reward.cooldownDays) : "";
    rewardSubmitBtn.textContent = "保存奖励";
    rewardCancelEdit.classList.remove("hidden");
    return;
  }

  const deleteId = button.dataset.parentRewardDelete;
  if (deleteId) {
    const ok = await showConfirm("确认删除这个奖励吗？", "删除奖励");
    if (!ok) return;
    removeReward(deleteId);
    return;
  }

  const moveId = button.dataset.parentRewardMove;
  if (moveId) {
    const direction = button.dataset.direction;
    if (direction === "up" || direction === "down") {
      moveReward(moveId, direction);
    }
  }
});

resetTodayBtn.addEventListener("click", async () => {
  const ok = await showConfirm("确认重置今天的任务状态吗？", "重置确认");
  if (!ok) return;
  captureRestorePoint("重置当天任务前");
  const day = todayKey();
  state.completions[day] = {};
  delete state.checkinDays[day];
  addHistory("已重置今天任务状态", 0, "system");
  saveData();
  renderAll();
});

exportBtn.addEventListener("click", () => {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kids-star-reward-${todayKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  state.lastBackupExportAt = Date.now();
  saveData();
  renderBackupReminder();
});

exportCsvBtn.addEventListener("click", () => {
  const rows = [["日期", "类型", "内容", "星星变化"]];
  for (const item of state.history) {
    rows.push([
      item.dateKey || "",
      item.type || "system",
      String(item.text || "").replaceAll('"', '""'),
      String(item.delta || 0)
    ]);
  }
  const csv = rows
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kids-star-reward-history-${todayKey()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

importInput.addEventListener("change", () => {
  const file = importInput.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const parsed = JSON.parse(String(reader.result || ""));
      const backupReady = await showConfirm("导入前建议先点一次“导出数据”做备份。你已经备份了吗？", "导入提醒");
      if (!backupReady) return;

      const previewStars = Number(parsed.stars ?? defaultData.stars);
      const previewTasks = Array.isArray(parsed.tasks) ? parsed.tasks.length : defaultData.tasks.length;
      const previewRewards = Array.isArray(parsed.rewards) ? parsed.rewards.length : defaultData.rewards.length;
      const previewHistory = Array.isArray(parsed.history) ? parsed.history.length : 0;
      const ok = await showConfirm(
        `即将导入数据:\n` +
        `当前⭐: ${previewStars}\n` +
        `任务数量: ${previewTasks}\n` +
        `奖励数量: ${previewRewards}\n` +
        `记录数量: ${previewHistory}\n\n` +
        `导入会覆盖当前数据，是否继续？`,
        "导入确认"
      );
      if (!ok) return;

      captureRestorePoint("导入数据前");
      const merged = { ...structuredClone(defaultData), ...parsed };
      for (const key of Object.keys(state)) delete state[key];
      Object.assign(state, merged);
      normalizeDataShape();
      addHistory("已导入数据", 0, "system");
      saveData();
      renderAll();
    } catch {
      await showAlert("导入失败，文件格式不正确。", "导入失败");
    }
  };
  reader.readAsText(file);
});

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {
      // ignore registration errors in unsupported hosting setups
    });
  });
}

async function bootstrapServerState() {
  const status = await syncAdapter.getStatus();
  if (!status.canSync) return;

  if (state.serverSync?.pendingChanges) {
    const pushed = await syncAdapter.push();
    setSyncStatus(pushed.ok ? "恢复未同步数据成功" : "恢复未同步数据失败");
    if (pushed.ok) state.serverSync.pendingChanges = false;
    persist();
    renderAll();
    return;
  }

  const result = await syncAdapter.pull();
  if (result.ok && result.data) {
    applyPulledServerData(result.data, {
      successStatus: "启动拉取成功",
      historyText: ""
    });
    return;
  }

  if (String(result.message || "").includes("暂无") || String(result.message || "").includes("no state")) {
    const pushed = await syncAdapter.push();
    setSyncStatus(pushed.ok ? "初始化上传成功" : "初始化上传失败");
    saveData({ markPending: false });
    renderAll();
  }
}

async function initApp() {
  if (authState.token) {
    const me = await fetchMe();
    if (me.ok) {
      authState.username = me.username;
      saveAuthState();
    } else {
      clearAuthState();
    }
  }

  clearTaskEdit();
  clearRewardEdit();
  saveData({ markPending: false });
  renderAll();
  await bootstrapServerState();

  const status = await syncAdapter.getStatus();
  const shouldWarnServerDown =
    Boolean(authState.token) &&
    !status.canSync &&
    !String(status.message || "").includes("请先登录账户") &&
    sessionStorage.getItem("ksr_sync_warned") !== "1";

  if (shouldWarnServerDown) {
    sessionStorage.setItem("ksr_sync_warned", "1");
    await showAlert("服务器当前不可用，数据暂存本地，恢复后会继续自动保存。", "同步提醒");
  }
}

initApp();
