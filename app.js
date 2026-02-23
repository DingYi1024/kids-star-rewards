const STORAGE_KEY = "kids_star_reward_v2";
const LEGACY_STORAGE_KEY = "kids_star_reward_v1";
const ROLE_KEY = "kids_star_role";

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
  weeklyGoal: 20,
  openStreakCount: 1,
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
    countForMilestone: false
  },
  makeupUsageByWeek: {},
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

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
  const source = raw || legacyRaw;
  if (!source) return structuredClone(defaultData);
  try {
    return JSON.parse(source);
  } catch {
    return structuredClone(defaultData);
  }
}

const state = loadData();

const syncAdapter = {
  mode: "local-only",
  async getStatus() {
    return {
      mode: this.mode,
      canSync: false,
      message: "当前仅本地存储，云同步未启用"
    };
  },
  async push() {
    return { ok: false, message: "云同步未启用" };
  },
  async pull() {
    return { ok: false, message: "云同步未启用" };
  }
};

function normalizeDataShape() {
  if (!state.completions || typeof state.completions !== "object") state.completions = {};
  if (!state.earningsByDay || typeof state.earningsByDay !== "object") state.earningsByDay = {};
  if (!Array.isArray(state.history)) state.history = [];
  if (typeof state.weeklyGoal !== "number" || state.weeklyGoal < 5) state.weeklyGoal = 20;
  if (typeof state.openStreakCount !== "number" || state.openStreakCount < 1) state.openStreakCount = 1;
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
    state.makeupConfig = { weeklyLimit: 1, windowDays: 1, countForMilestone: false };
  }
  if (!state.makeupUsageByWeek || typeof state.makeupUsageByWeek !== "object") state.makeupUsageByWeek = {};
  if (!Array.isArray(state.restorePoints)) state.restorePoints = [];
  if (typeof state.theme !== "string") state.theme = "sunny";
  state.makeupConfig.weeklyLimit = Math.max(0, Number(state.makeupConfig.weeklyLimit || 1));
  state.makeupConfig.windowDays = Math.max(1, Number(state.makeupConfig.windowDays || 1));
  state.makeupConfig.countForMilestone = Boolean(state.makeupConfig.countForMilestone);

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

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
const childPanel = document.querySelector("#childPanel");
const parentPanel = document.querySelector("#parentPanel");
const todayDateText = document.querySelector("#todayDateText");

const childStarCount = document.querySelector("#childStarCount");
const openStreakText = document.querySelector("#openStreakText");
const streakHintText = document.querySelector("#streakHintText");
const makeupInfoText = document.querySelector("#makeupInfoText");
const makeupCheckinBtn = document.querySelector("#makeupCheckinBtn");
const parentStarCount = document.querySelector("#parentStarCount");
const weeklyGoalText = document.querySelector("#weeklyGoalText");
const weeklyGoalBar = document.querySelector("#weeklyGoalBar");
const goalMotivateText = document.querySelector("#goalMotivateText");
const milestoneRow = document.querySelector("#milestoneRow");

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

const goalForm = document.querySelector("#goalForm");
const weeklyGoalInput = document.querySelector("#weeklyGoalInput");

const pinForm = document.querySelector("#pinForm");
const pinInput = document.querySelector("#pinInput");
const pinOffBtn = document.querySelector("#pinOffBtn");
const pinGraceForm = document.querySelector("#pinGraceForm");
const pinGraceInput = document.querySelector("#pinGraceInput");
const soundToggle = document.querySelector("#soundToggle");
const reduceMotionToggle = document.querySelector("#reduceMotionToggle");
const syncStatusText = document.querySelector("#syncStatusText");
const syncCheckBtn = document.querySelector("#syncCheckBtn");
const makeupConfigForm = document.querySelector("#makeupConfigForm");
const makeupWeeklyLimitInput = document.querySelector("#makeupWeeklyLimitInput");
const makeupCountMilestoneToggle = document.querySelector("#makeupCountMilestoneToggle");

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

const ui = {
  role: localStorage.getItem(ROLE_KEY) === "parent" ? "parent" : "child",
  editingTaskId: null,
  editingRewardId: null,
  pendingRedeemId: null,
  pinFailCount: 0,
  uiModalResolver: null
};

let lastRenderedStars = state.stars;

if (state.pinEnabled && ui.role === "parent") {
  ui.role = "child";
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatTodayLabel() {
  const now = new Date();
  const weekNames = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day} ${weekNames[now.getDay()]}`;
}

function weekStartKey(dateKey = todayKey()) {
  const date = new Date(`${dateKey}T00:00:00`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

function shiftDay(dateKey, deltaDays) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

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

function getMakeupRemainThisWeek() {
  const usage = getMakeupUsageMap(weekStartKey());
  return Math.max(0, Number(state.makeupConfig.weeklyLimit || 0) - Number(usage.count || 0));
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
  const streak = state.openStreakCount;
  const bonus = bonusByMilestone[streak];
  const awardKey = `${day}-${streak}`;
  if (bonus && !state.streakMilestoneAwardDays[awardKey]) {
    state.streakMilestoneAwardDays[awardKey] = true;
    awardStars(bonus, "system", `连续打卡 ${streak} 天奖励`);
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
    state.openStreakCount = 1;
  }
}

async function tryUseMakeupCard() {
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
  state.checkinDays[makeupDay] = true;
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

function grantBonusByParent(reason, stars) {
  if (!reason || Number.isNaN(stars) || stars < 1) return;
  captureRestorePoint("额外奖励前");
  awardStars(stars, "bonus", `家长额外奖励：${reason}`);
  saveData();
  renderAll();
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

  const marks = [Math.ceil(goal * 0.3), Math.ceil(goal * 0.6), goal];
  milestoneRow.innerHTML = "";
  for (const mark of marks) {
    const chip = document.createElement("span");
    chip.className = `milestone-chip ${earned >= mark ? "done" : ""}`;
    chip.textContent = earned >= mark ? `已达成 ${mark}⭐` : `目标 ${mark}⭐`;
    milestoneRow.appendChild(chip);
  }
}

function renderStreak() {
  const streak = state.openStreakCount;
  let title = "打卡新手";
  const milestones = [3, 7, 14, 21];
  const nextMilestone = milestones.find((item) => item > streak);
  let hint = nextMilestone
    ? `再打卡 ${nextMilestone - streak} 天，可解锁 ${nextMilestone} 天奖励！`
    : "你已经突破所有里程碑，继续冲刺吧！";

  if (streak >= 3) title = "坚持达人";
  if (streak >= 7) title = "超级连胜";
  if (streak >= 14) title = "星光王者";

  if (streak >= 7) openStreakText.classList.add("super");
  else openStreakText.classList.remove("super");

  openStreakText.textContent = `连续打卡 ${streak} 天 · ${title}`;
  streakHintText.textContent = hint;

  const remain = getMakeupRemainThisWeek();
  makeupInfoText.textContent = `本周补签剩余 ${remain} 次（仅可补昨天）`;
  const canShowMakeup = remain > 0 && Boolean(findMakeupDay());
  makeupCheckinBtn.classList.toggle("hidden", !canShowMakeup);
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
      ? `<br /><small>需要拍照凭证</small><br /><input type="file" accept="image/*" data-proof-task-id="${task.id}" />`
      : task.needProof
        ? `<br /><small>需要拍照凭证</small>`
        : "";

    const li = document.createElement("li");
    li.className = `item ${!completion || completion?.state === "rejected" ? "pending-highlight" : ""}`;
    li.innerHTML = `
      <div>
        <strong>${task.name}</strong><br />
        <small>满分可得 ${task.stars}⭐ | 预计 +${task.stars}⭐</small>${proofHtml}
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
  for (const task of state.tasks) {
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `
      <div>
        <strong>${task.name}</strong><br />
        <small>星星值：${task.stars}⭐${task.needProof ? " | 需凭证" : ""}</small>
      </div>
      <div class="task-actions">
        <button class="btn-soft" data-parent-task-edit="${task.id}">修改</button>
        <button class="btn-passive" data-parent-task-delete="${task.id}">删除</button>
      </div>
    `;
    parentTaskList.appendChild(li);
  }
}

function renderParentRewards() {
  parentRewardList.innerHTML = "";
  for (const reward of state.rewards) {
    const stockText = Number.isFinite(reward.stock) ? `每周${reward.stock}，余${remainingStock(reward)}` : "不限";
    const cooldownText = Number(reward.cooldownDays || 0) > 0 ? ` | 冷却：${reward.cooldownDays}天` : "";
    const resetTip = Number.isFinite(reward.stock) ? ` | 恢复：${nextWeekResetLabel()}` : "";
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `
      <div>
        <strong>${reward.name}</strong><br />
        <small>兑换值：${reward.cost}⭐ | 库存：${stockText}${cooldownText}${resetTip}</small>
      </div>
      <div class="task-actions">
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
  const earned = weeklyEarned();
  const goal = Math.max(5, Number(state.weeklyGoal || 20));
  const goalRate = Math.min(100, Math.round((earned / goal) * 100));

  statsBox.innerHTML = `
    <div class="stat-item"><small>${rangeText}总评分</small><b>${total}</b></div>
    <div class="stat-item"><small>主动率</small><b>${activeRate}%</b></div>
    <div class="stat-item"><small>提醒次数</small><b>${remind}</b></div>
    <div class="stat-item"><small>被动次数</small><b>${passive}</b></div>
    <div class="stat-item"><small>本周目标达成</small><b>${earned}/${goal}⭐ (${goalRate}%)</b></div>
    <div class="stat-chart">
      <div class="chart-row"><small>主动</small><div class="chart-track"><div class="chart-fill fill-active" style="width:${activeRate}%"></div></div><small>${activeRate}%</small></div>
      <div class="chart-row"><small>提醒</small><div class="chart-track"><div class="chart-fill fill-remind" style="width:${remindRate}%"></div></div><small>${remindRate}%</small></div>
      <div class="chart-row"><small>被动</small><div class="chart-track"><div class="chart-fill fill-passive" style="width:${passiveRate}%"></div></div><small>${passiveRate}%</small></div>
    </div>
  `;
}

function renderAll() {
  const starsChanged = lastRenderedStars !== state.stars;
  refreshStreakFromCheckins();
  todayDateText.textContent = `今天是 ${formatTodayLabel()}`;
  document.body.dataset.theme = state.theme || "sunny";
  childStarCount.textContent = String(state.stars);
  parentStarCount.textContent = String(state.stars);
  soundToggle.checked = Boolean(state.soundEnabled);
  reduceMotionToggle.checked = Boolean(state.reduceMotion);
  document.body.classList.toggle("reduce-motion", Boolean(state.reduceMotion));
  weeklyGoalInput.value = String(state.weeklyGoal);
  pinGraceInput.value = String(state.pinGraceMinutes);
  makeupWeeklyLimitInput.value = String(state.makeupConfig.weeklyLimit);
  makeupCountMilestoneToggle.checked = Boolean(state.makeupConfig.countForMilestone);
  themeSelect.value = state.theme || "sunny";
  if (syncStatusText) {
    syncStatusText.textContent = `同步模式：${syncAdapter.mode}（云同步未启用）`;
  }
  renderRole();
  renderStreak();
  renderWeeklyGoal();

  renderChildTasks();
  renderChildRewards();
  renderParentTasks();
  renderParentRewards();
  renderParentPending();
  renderStats();
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
}

function openPinModal() {
  pinVerifyInput.value = "";
  ui.pinFailCount = 0;
  pinModal.classList.remove("hidden");
  pinVerifyInput.focus();
}

function closePinModal() {
  pinModal.classList.add("hidden");
}

function closeUiModal(result) {
  uiModal.classList.add("hidden");
  uiModalInput.classList.add("hidden");
  const resolver = ui.uiModalResolver;
  ui.uiModalResolver = null;
  if (resolver) resolver(result);
}

function openUiModal(options) {
  const {
    title = "提示",
    message = "",
    confirmText = "确认",
    cancelText = "取消",
    showCancel = true,
    input = false,
    inputValue = "",
    inputPlaceholder = ""
  } = options;

  uiModalTitle.textContent = title;
  uiModalMessage.textContent = message;
  uiModalConfirmBtn.textContent = confirmText;
  uiModalCancelBtn.textContent = cancelText;
  uiModalCancelBtn.classList.toggle("hidden", !showCancel);

  if (input) {
    uiModalInput.classList.remove("hidden");
    uiModalInput.value = inputValue;
    uiModalInput.placeholder = inputPlaceholder;
  } else {
    uiModalInput.classList.add("hidden");
    uiModalInput.value = "";
    uiModalInput.placeholder = "";
  }

  uiModal.classList.remove("hidden");
  if (input) uiModalInput.focus();
  else uiModalConfirmBtn.focus();

  return new Promise((resolve) => {
    ui.uiModalResolver = resolve;
  });
}

async function showAlert(message, title = "提示") {
  await openUiModal({ title, message, confirmText: "我知道了", showCancel: false });
}

async function showConfirm(message, title = "确认") {
  const result = await openUiModal({ title, message, confirmText: "确认", cancelText: "取消", showCancel: true });
  return result.confirmed;
}

async function showPrompt(message, defaultValue = "", title = "请输入") {
  const result = await openUiModal({
    title,
    message,
    confirmText: "确认",
    cancelText: "取消",
    showCancel: true,
    input: true,
    inputValue: defaultValue,
    inputPlaceholder: "请输入"
  });
  if (!result.confirmed) return null;
  return result.value;
}

roleSwitch.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  const role = target.dataset.role;
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

uiModalConfirmBtn.addEventListener("click", () => {
  closeUiModal({ confirmed: true, value: uiModalInput.value });
});

uiModalCancelBtn.addEventListener("click", () => {
  closeUiModal({ confirmed: false, value: "" });
});

uiModal.addEventListener("click", (event) => {
  if (event.target === uiModal) {
    closeUiModal({ confirmed: false, value: "" });
  }
});

uiModalInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    uiModalConfirmBtn.click();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !uiModal.classList.contains("hidden")) {
    closeUiModal({ confirmed: false, value: "" });
  }
});

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

bonusForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const reason = bonusReason.value.trim();
  const stars = Number(bonusStars.value);
  grantBonusByParent(reason, stars);
  bonusForm.reset();
  bonusStars.value = "1";
});

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

syncCheckBtn.addEventListener("click", async () => {
  const status = await syncAdapter.getStatus();
  await showAlert(`${status.message}\n模式：${status.mode}`, "同步状态");
});

restorePointBtn.addEventListener("click", () => {
  const pointId = restorePointSelect.value;
  if (!pointId) return;
  restoreFromPoint(pointId);
});

makeupCheckinBtn.addEventListener("click", () => {
  tryUseMakeupCard();
});

undoLastRatingBtn.addEventListener("click", () => {
  undoLastRating();
});

childTaskList.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  const taskId = target.dataset.childTaskSubmit;
  if (!taskId) return;
  await submitTaskByChild(taskId);
});

childRewardList.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  const rewardId = target.dataset.childReward;
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
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;

  const partialTaskId = target.dataset.parentPartial;
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

  const rejectTaskId = target.dataset.parentReject;
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

  const taskId = target.dataset.parentRate;
  const rating = target.dataset.rating;
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
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;

  const editId = target.dataset.parentTaskEdit;
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

  const deleteId = target.dataset.parentTaskDelete;
  if (deleteId) {
    const ok = await showConfirm("确认删除这个任务吗？", "删除任务");
    if (!ok) return;
    removeTask(deleteId);
  }
});

parentRewardList.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;

  const editId = target.dataset.parentRewardEdit;
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

  const deleteId = target.dataset.parentRewardDelete;
  if (deleteId) {
    const ok = await showConfirm("确认删除这个奖励吗？", "删除奖励");
    if (!ok) return;
    removeReward(deleteId);
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

clearTaskEdit();
clearRewardEdit();
saveData();
renderAll();
