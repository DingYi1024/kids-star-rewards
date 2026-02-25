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
  weeklyGoalChest: {
    title: "周目标宝箱",
    stars: 3
  },
  weeklyGoalChestClaimedByWeek: {},
  unclaimedGoalChests: [],
  weeklyGoalRolloverCursor: "",
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
    lastSyncStatus: "未同步",
    version: 0
  },
  security: {
    tamperLocked: false,
    tamperDetectedAt: 0
  },
  timeConfig: {
    fixedOffsetMinutes: null
  },
  bonusConfig: {
    weeklyLimit: 30
  },
  bonusUsageByWeek: {},
  bankConfig: {
    enabled: true,
    weeklyRatePercent: 10,
    weeklyInterestCap: 5,
    allowChildWithdraw: true,
    minDeposit: 5,
    earlyWithdrawPenaltyPercent: 10,
    earlyWithdrawDays: 7
  },
  bank: {
    balance: 0,
    lastInterestWeek: "",
    lastDepositDay: ""
  },
  pricingConfig: {
    hotStockThreshold: 1,
    hotMarkupPercent: 20
  },
  gachaConfig: {
    enabled: true,
    cost: 5,
    pool: [
      { id: crypto.randomUUID(), name: "棒棒糖", stars: 0, weight: 3 },
      { id: crypto.randomUUID(), name: "今天免一次小家务", stars: 0, weight: 2 },
      { id: crypto.randomUUID(), name: "再得 2⭐", stars: 2, weight: 2 },
      { id: crypto.randomUUID(), name: "再来一次", stars: 0, weight: 1 }
    ]
  },
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

const { state, persist, meta: storeMeta } = store;

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
  if (!state.weeklyGoalChest || typeof state.weeklyGoalChest !== "object") {
    state.weeklyGoalChest = { title: "周目标宝箱", stars: 3 };
  }
  if (typeof state.weeklyGoalChest.title !== "string" || !state.weeklyGoalChest.title.trim()) {
    state.weeklyGoalChest.title = "周目标宝箱";
  }
  if (typeof state.weeklyGoalChest.stars !== "number" || state.weeklyGoalChest.stars < 0) {
    state.weeklyGoalChest.stars = 3;
  }
  if (!state.weeklyGoalChestClaimedByWeek || typeof state.weeklyGoalChestClaimedByWeek !== "object") {
    state.weeklyGoalChestClaimedByWeek = {};
  }
  if (!Array.isArray(state.unclaimedGoalChests)) state.unclaimedGoalChests = [];
  state.unclaimedGoalChests = state.unclaimedGoalChests
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      id: item.id || crypto.randomUUID(),
      weekKey: String(item.weekKey || ""),
      title: String(item.title || "周目标宝箱"),
      stars: Math.max(0, Number(item.stars || 0)),
      createdAt: Number(item.createdAt || Date.now())
    }))
    .slice(0, 24);
  if (typeof state.weeklyGoalRolloverCursor !== "string") state.weeklyGoalRolloverCursor = "";
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
  if (typeof state.serverSync.autoPush !== "boolean") state.serverSync.autoPush = true;
  if (typeof state.serverSync.pendingChanges !== "boolean") state.serverSync.pendingChanges = false;
  if (typeof state.serverSync.lastSyncAt !== "number" || state.serverSync.lastSyncAt < 0) state.serverSync.lastSyncAt = 0;
  if (typeof state.serverSync.lastSyncStatus !== "string") state.serverSync.lastSyncStatus = "未同步";
  if (typeof state.serverSync.version !== "number" || state.serverSync.version < 0) state.serverSync.version = 0;
  if (!state.security || typeof state.security !== "object") {
    state.security = { tamperLocked: false, tamperDetectedAt: 0 };
  }
  state.security.tamperLocked = Boolean(state.security.tamperLocked);
  if (typeof state.security.tamperDetectedAt !== "number" || state.security.tamperDetectedAt < 0) {
    state.security.tamperDetectedAt = 0;
  }
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
  if (!state.bankConfig || typeof state.bankConfig !== "object") {
    state.bankConfig = { weeklyRatePercent: 1, weeklyInterestCap: 20, allowChildWithdraw: true };
  }
  state.bankConfig.enabled = state.bankConfig.enabled !== false;
  state.bankConfig.weeklyRatePercent = Math.max(0, Number(state.bankConfig.weeklyRatePercent ?? 10));
  state.bankConfig.weeklyInterestCap = Math.max(1, Number(state.bankConfig.weeklyInterestCap ?? 5));
  state.bankConfig.allowChildWithdraw = state.bankConfig.allowChildWithdraw !== false;
  state.bankConfig.minDeposit = Math.max(1, Number(state.bankConfig.minDeposit ?? 5));
  state.bankConfig.earlyWithdrawPenaltyPercent = Math.max(0, Number(state.bankConfig.earlyWithdrawPenaltyPercent ?? 10));
  state.bankConfig.earlyWithdrawDays = Math.max(0, Number(state.bankConfig.earlyWithdrawDays ?? 7));
  if (!state.bank || typeof state.bank !== "object") state.bank = { balance: 0, lastInterestWeek: "", lastDepositDay: "" };
  state.bank.balance = Math.max(0, Number(state.bank.balance || 0));
  if (typeof state.bank.lastInterestWeek !== "string") state.bank.lastInterestWeek = "";
  if (typeof state.bank.lastDepositDay !== "string") state.bank.lastDepositDay = "";
  if (!state.pricingConfig || typeof state.pricingConfig !== "object") {
    state.pricingConfig = { hotStockThreshold: 1, hotMarkupPercent: 20 };
  }
  state.pricingConfig.hotStockThreshold = Math.max(1, Number(state.pricingConfig.hotStockThreshold || 1));
  state.pricingConfig.hotMarkupPercent = Math.max(0, Number(state.pricingConfig.hotMarkupPercent || 0));
  if (!state.gachaConfig || typeof state.gachaConfig !== "object") {
    state.gachaConfig = { enabled: true, cost: 5, pool: [] };
  }
  state.gachaConfig.enabled = Boolean(state.gachaConfig.enabled);
  state.gachaConfig.cost = Math.max(1, Number(state.gachaConfig.cost || 5));
  if (!Array.isArray(state.gachaConfig.pool) || !state.gachaConfig.pool.length) {
    state.gachaConfig.pool = [
      { id: crypto.randomUUID(), name: "棒棒糖", stars: 0, weight: 3 },
      { id: crypto.randomUUID(), name: "今天免一次小家务", stars: 0, weight: 2 },
      { id: crypto.randomUUID(), name: "再得 2⭐", stars: 2, weight: 2 },
      { id: crypto.randomUUID(), name: "再来一次", stars: 0, weight: 1 }
    ];
  }
  state.gachaConfig.pool = state.gachaConfig.pool
    .map((item) => ({
      id: item?.id || crypto.randomUUID(),
      name: String(item?.name || "神秘奖励").trim() || "神秘奖励",
      stars: Math.max(0, Number(item?.stars || 0)),
      weight: Math.max(1, Number(item?.weight || 1))
    }))
    .slice(0, 20);
  if (!Array.isArray(state.restorePoints)) state.restorePoints = [];
  const allowedThemes = ["sunny", "ocean", "space", "festival"];
  if (typeof state.theme !== "string" || !allowedThemes.includes(state.theme)) state.theme = "sunny";
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

  state.history = state.history.map((item) => ({
    type: "system",
    actor: "system",
    audit: false,
    action: "",
    detail: "",
    ...item
  }));
}

normalizeDataShape();

function saveData(options = {}) {
  const { markPending = true, feedbackText = "" } = options;
  if (markPending && state.serverSync) state.serverSync.pendingChanges = true;
  persist();
  if (markPending && authState.token) {
    queueAutoSync();
    flushAutoSync();
  }
  if (feedbackText) showActionToast(feedbackText);
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
  saveData({ feedbackText: "恢复成功" });
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
const bankSummaryText = document.querySelector("#bankSummaryText");
const bankActionForm = document.querySelector("#bankActionForm");
const bankActionType = document.querySelector("#bankActionType");
const bankActionAmount = document.querySelector("#bankActionAmount");
const bankRulesInline = document.querySelector("#bankRulesInline");
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
const goalChestText = document.querySelector("#goalChestText");
const claimGoalChestBtn = document.querySelector("#claimGoalChestBtn");
const carryoverChestWrap = document.querySelector("#carryoverChestWrap");
const carryoverChestList = document.querySelector("#carryoverChestList");

const childTaskList = document.querySelector("#childTaskList");
const childRewardList = document.querySelector("#childRewardList");
const gachaBoxWrap = document.querySelector("#gachaBoxWrap");
const gachaHintText = document.querySelector("#gachaHintText");
const gachaDrawBtn = document.querySelector("#gachaDrawBtn");
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
const dynamicPricingForm = document.querySelector("#dynamicPricingForm");
const hotStockThresholdInput = document.querySelector("#hotStockThresholdInput");
const hotMarkupPercentInput = document.querySelector("#hotMarkupPercentInput");
const dynamicPricingSummary = document.querySelector("#dynamicPricingSummary");
const gachaConfigForm = document.querySelector("#gachaConfigForm");
const gachaCostInput = document.querySelector("#gachaCostInput");
const gachaEnabledToggle = document.querySelector("#gachaEnabledToggle");
const gachaRuleSummary = document.querySelector("#gachaRuleSummary");
const gachaPoolInput = document.querySelector("#gachaPoolInput");
const saveGachaPoolBtn = document.querySelector("#saveGachaPoolBtn");
const gachaPoolSummary = document.querySelector("#gachaPoolSummary");
const gachaPoolPreview = document.querySelector("#gachaPoolPreview");
const rewardSubmitBtn = document.querySelector("#rewardSubmitBtn");
const rewardCancelEdit = document.querySelector("#rewardCancelEdit");
const parentRewardList = document.querySelector("#parentRewardList");

const bonusForm = document.querySelector("#bonusForm");
const bonusReason = document.querySelector("#bonusReason");
const bonusStars = document.querySelector("#bonusStars");
const bankConfigForm = document.querySelector("#bankConfigForm");
const bankRateInput = document.querySelector("#bankRateInput");
const bankCapInput = document.querySelector("#bankCapInput");
const bankWithdrawToggle = document.querySelector("#bankWithdrawToggle");
const bankRuleSummary = document.querySelector("#bankRuleSummary");
const bankEnabledToggle = document.querySelector("#bankEnabledToggle");
const childBankCard = document.querySelector("#childBankCard");
const bankPenaltyForm = document.querySelector("#bankPenaltyForm");
const bankMinDepositInput = document.querySelector("#bankMinDepositInput");
const bankPenaltyPercentInput = document.querySelector("#bankPenaltyPercentInput");
const bankPenaltyDaysInput = document.querySelector("#bankPenaltyDaysInput");
const bonusLimitForm = document.querySelector("#bonusLimitForm");
const bonusWeeklyLimitInput = document.querySelector("#bonusWeeklyLimitInput");
const bonusLimitText = document.querySelector("#bonusLimitText");

const goalForm = document.querySelector("#goalForm");
const weeklyGoalInput = document.querySelector("#weeklyGoalInput");
const goalChestForm = document.querySelector("#goalChestForm");
const goalChestTitleInput = document.querySelector("#goalChestTitleInput");
const goalChestStarsInput = document.querySelector("#goalChestStarsInput");
const goalChestParentText = document.querySelector("#goalChestParentText");

const pinForm = document.querySelector("#pinForm");
const pinInput = document.querySelector("#pinInput");
const pinOffBtn = document.querySelector("#pinOffBtn");
const tamperLockNotice = document.querySelector("#tamperLockNotice");
const tamperUnlockBtn = document.querySelector("#tamperUnlockBtn");
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
const actionToast = document.querySelector("#actionToast");

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
let toastTimer = null;
let livePullTimer = null;

function showActionToast(message) {
  if (!actionToast || !message) return;
  actionToast.textContent = `✅ ${message}`;
  actionToast.classList.remove("hidden");
  actionToast.classList.add("show");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    actionToast.classList.remove("show");
    setTimeout(() => actionToast.classList.add("hidden"), 220);
  }, 1850);
}

async function flushAutoSync() {
  if (autoSyncRunning) {
    autoSyncPending = true;
    return;
  }
  if (!state.serverSync?.autoPush || !authState.token) return;

  const localSnapshot = createSnapshotData();
  autoSyncRunning = true;
  const result = await syncAdapter.push(localSnapshot);
  state.serverSync.lastSyncAt = Date.now();

  if (result.conflict) {
    if (typeof result.serverVersion === "number") {
      state.serverSync.version = result.serverVersion;
    }
    state.serverSync.lastSyncStatus = "检测到多端同时修改，正在自动合并";
    const pulled = await syncAdapter.pull();
    if (pulled.ok && pulled.data) {
      const mergedData = mergeStatesForConflict(pulled.data, localSnapshot);
      const mergePush = await syncAdapter.push(mergedData);
      if (mergePush.ok) {
        applyPulledServerData(mergedData, {
          captureLabel: "冲突自动合并前",
          successStatus: "冲突已自动合并并保存",
          historyText: "检测到多端同时修改，已自动合并",
          version: mergePush.version
        });
        showActionToast("多端冲突已自动合并");
      } else {
        applyPulledServerData(pulled.data, {
          captureLabel: "冲突回退前",
          successStatus: "检测到冲突，已切换服务器最新版本",
          historyText: "多端冲突自动合并失败，已采用服务器最新版本",
          version: pulled.version
        });
        showActionToast("冲突合并失败，已切换服务器版本");
      }
    }
  } else {
    state.serverSync.lastSyncStatus = result.ok ? "自动保存成功" : "自动保存失败";
    if (result.ok) state.serverSync.pendingChanges = false;
  }
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
if (!state.bank.lastInterestWeek) state.bank.lastInterestWeek = weekStartKey();
if (!state.weeklyGoalRolloverCursor) state.weeklyGoalRolloverCursor = weekStartKey();

function weeklyEarned() {
  const start = weekStartKey();
  let total = 0;
  for (let i = 0; i < 7; i += 1) {
    const day = shiftDay(start, i);
    total += Number(state.earningsByDay[day] || 0);
  }
  return total;
}

function currentWeekKey() {
  return weekStartKey();
}

function isWeeklyGoalReached() {
  return weeklyEarned() >= Math.max(5, Number(state.weeklyGoal || 20));
}

function hasClaimedWeeklyGoalChest(weekKey = currentWeekKey()) {
  return Boolean(state.weeklyGoalChestClaimedByWeek?.[weekKey]);
}

function weeklyEarnedForWeek(weekKey) {
  let total = 0;
  for (let i = 0; i < 7; i += 1) {
    const day = shiftDay(weekKey, i);
    total += Number(state.earningsByDay[day] || 0);
  }
  return total;
}

function rolloverUnclaimedWeeklyGoalChest() {
  const currentWeek = currentWeekKey();
  if (!state.weeklyGoalRolloverCursor) {
    state.weeklyGoalRolloverCursor = currentWeek;
    return false;
  }

  let changed = false;
  let cursor = state.weeklyGoalRolloverCursor;
  while (cursor < currentWeek) {
    const reached = weeklyEarnedForWeek(cursor) >= Math.max(5, Number(state.weeklyGoal || 20));
    const claimed = Boolean(state.weeklyGoalChestClaimedByWeek?.[cursor]);
    const queued = state.unclaimedGoalChests.some((item) => item.weekKey === cursor);
    if (reached && !claimed && !queued) {
      state.unclaimedGoalChests.unshift({
        id: crypto.randomUUID(),
        weekKey: cursor,
        title: String(state.weeklyGoalChest?.title || "周目标宝箱"),
        stars: Math.max(0, Number(state.weeklyGoalChest?.stars || 0)),
        createdAt: Date.now()
      });
      addHistory(`已保留上周未领取宝箱（${cursor}）`, 0, "system", { actor: "system" });
      addAudit("上周目标宝箱自动保留", 0, "system", {
        actor: "system",
        action: "weekly_goal_chest_rollover",
        detail: `week:${cursor}`
      });
      changed = true;
    }
    cursor = shiftDay(cursor, 7);
  }
  state.weeklyGoalRolloverCursor = currentWeek;
  return changed;
}

function isSecurityLocked() {
  return Boolean(state.security?.tamperLocked);
}

async function ensureSecurityUnlocked(actionText = "该操作") {
  if (!isSecurityLocked()) return true;
  await showAlert(`检测到本地数据异常，星星资产已冻结，暂不能执行${actionText}。请家长在“家长安全”里确认解锁。`, "安全锁定");
  return false;
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

function gachaPoolToText() {
  const pool = Array.isArray(state.gachaConfig?.pool) ? state.gachaConfig.pool : [];
  return pool.map((item) => `${item.name}|${Math.max(0, Number(item.stars || 0))}|${Math.max(1, Number(item.weight || 1))}`).join("\n");
}

function parseGachaPoolText(rawText) {
  const lines = String(rawText || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  const parsed = [];
  for (const line of lines) {
    const [nameRaw, starsRaw = "0", weightRaw = "1"] = line.split("|");
    const name = String(nameRaw || "").trim();
    const stars = Math.max(0, Number(starsRaw || 0));
    const weight = Math.max(1, Number(weightRaw || 1));
    if (!name || !Number.isFinite(stars) || !Number.isFinite(weight)) continue;
    parsed.push({ id: crypto.randomUUID(), name, stars, weight });
  }
  return parsed.slice(0, 20);
}

function gachaPoolPreviewText() {
  const pool = Array.isArray(state.gachaConfig?.pool) ? state.gachaConfig.pool : [];
  if (!pool.length) return "当前概率预览：暂无";
  const totalWeight = pool.reduce((sum, item) => sum + Math.max(1, Number(item.weight || 1)), 0);
  const preview = pool
    .slice(0, 5)
    .map((item) => {
      const weight = Math.max(1, Number(item.weight || 1));
      const ratio = Math.round((weight / totalWeight) * 100);
      const stars = Math.max(0, Number(item.stars || 0));
      return `${item.name}${stars > 0 ? `(+${stars}⭐)` : ""}≈${ratio}%`;
    })
    .join(" / ");
  const more = pool.length > 5 ? ` 等${pool.length}项` : "";
  return `当前概率预览：${preview}${more}`;
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

function dynamicMarkupApplies(reward) {
  if (!Number.isFinite(reward.stock)) return false;
  const threshold = Math.max(1, Number(state.pricingConfig?.hotStockThreshold || 1));
  return remainingStock(reward) <= threshold;
}

function getDynamicRewardCost(reward) {
  const base = Math.max(1, Number(reward.cost || 1));
  if (!dynamicMarkupApplies(reward)) return base;
  const markupPercent = Math.max(0, Number(state.pricingConfig?.hotMarkupPercent || 0));
  return Math.ceil(base * (1 + markupPercent / 100));
}

function drawGachaReward() {
  const pool = Array.isArray(state.gachaConfig?.pool) ? state.gachaConfig.pool : [];
  if (!pool.length) return null;
  const totalWeight = pool.reduce((sum, item) => sum + Math.max(1, Number(item.weight || 1)), 0);
  let roll = Math.random() * totalWeight;
  for (const item of pool) {
    roll -= Math.max(1, Number(item.weight || 1));
    if (roll <= 0) return item;
  }
  return pool[pool.length - 1] || null;
}

function estimateWeeklyBankInterest() {
  const balance = Math.max(0, Number(state.bank?.balance || 0));
  const rate = Math.max(0, Number(state.bankConfig?.weeklyRatePercent || 0)) / 100;
  const cap = Math.max(1, Number(state.bankConfig?.weeklyInterestCap || 20));
  return Math.min(cap, Math.floor(balance * rate));
}

function settleBankInterestIfNeeded() {
  if (isSecurityLocked()) return false;
  const nowWeek = weekStartKey();
  if (!state.bank.lastInterestWeek) {
    state.bank.lastInterestWeek = nowWeek;
    return false;
  }
  if (state.bank.lastInterestWeek >= nowWeek) return false;

  let changed = false;
  let cursor = state.bank.lastInterestWeek;
  while (cursor < nowWeek) {
    const nextWeek = shiftDay(cursor, 7);
    const base = Math.max(0, Number(state.bank.balance || 0));
    const rate = Math.max(0, Number(state.bankConfig.weeklyRatePercent || 0)) / 100;
    const cap = Math.max(1, Number(state.bankConfig.weeklyInterestCap || 20));
    const interest = Math.min(cap, Math.floor(base * rate));
    if (interest > 0) {
      state.bank.balance += interest;
      addHistory(`银行周利息入账（${cursor}）`, interest, "bonus", { actor: "system" });
      addAudit("银行周利息结算", interest, "bonus", {
        actor: "system",
        action: "bank_interest_settlement",
        detail: `week:${cursor},base:${base},rate:${state.bankConfig.weeklyRatePercent}%`
      });
    }
    state.bank.lastInterestWeek = nextWeek;
    cursor = nextWeek;
    changed = true;
  }
  return changed;
}

async function moveStarsByBank(action, amount) {
  if (!await ensureSecurityUnlocked("银行操作")) return;
  const stars = Math.floor(Number(amount || 0));
  if (!Number.isFinite(stars) || stars < 1) {
    await showAlert("请输入正确的星星数量。", "操作失败");
    return;
  }

  if (action === "deposit") {
    const minDeposit = Math.max(1, Number(state.bankConfig.minDeposit || 5));
    if (stars < minDeposit) {
      await showAlert(`最低存入 ${minDeposit}⭐，攒够再存哦！`, "存入限制");
      return;
    }
    if (state.stars < stars) {
      await showAlert("钱包星星不足，无法存入。", "操作失败");
      return;
    }
    captureRestorePoint("银行存入前");
    state.stars -= stars;
    state.bank.balance += stars;
    state.bank.lastDepositDay = todayKey();
    addHistory(`存入银行 ${stars}⭐`, 0, "system", { actor: "child" });
    addAudit("银行存入", 0, "system", { actor: "child", action: "bank_deposit", detail: `stars:${stars}` });
    playSound("good");
    saveData({ feedbackText: "已存入银行" });
    renderAll();
    return;
  }

  if (action === "withdraw") {
    if (!state.bankConfig.allowChildWithdraw) {
      await showAlert("当前规则不允许孩子自行取出，请家长端调整。", "操作受限");
      return;
    }
    if (state.bank.balance < stars) {
      await showAlert("银行星星不足，无法取出。", "操作失败");
      return;
    }

    // Early withdrawal penalty
    const penaltyDays = Math.max(0, Number(state.bankConfig.earlyWithdrawDays || 7));
    const penaltyPercent = Math.max(0, Number(state.bankConfig.earlyWithdrawPenaltyPercent || 10));
    let penalty = 0;
    let penaltyMsg = "";
    if (penaltyDays > 0 && penaltyPercent > 0 && state.bank.lastDepositDay) {
      const elapsed = dayDiff(state.bank.lastDepositDay, todayKey());
      if (elapsed < penaltyDays) {
        penalty = Math.max(1, Math.floor(stars * penaltyPercent / 100));
        const remaining = penaltyDays - elapsed;
        penaltyMsg = `距离免罚期还差 ${remaining} 天，提前取出将扣除手续费 ${penalty}⭐（${penaltyPercent}%）。`;
      }
    }

    if (penalty > 0) {
      const ok = await showConfirm(`${penaltyMsg}\n\n实际到账 ${stars - penalty}⭐，确认取出吗？`, "提前取出");
      if (!ok) return;
    }

    captureRestorePoint("银行取出前");
    state.bank.balance -= stars;
    const netStars = stars - penalty;
    state.stars += netStars;
    if (penalty > 0) {
      addHistory(`从银行取出 ${stars}⭐（手续费 ${penalty}⭐，到账 ${netStars}⭐）`, 0, "system", { actor: "child" });
      addAudit("银行提前取出", 0, "system", { actor: "child", action: "bank_withdraw_early", detail: `gross:${stars},fee:${penalty},net:${netStars}` });
    } else {
      addHistory(`从银行取出 ${stars}⭐`, 0, "system", { actor: "child" });
      addAudit("银行取出", 0, "system", { actor: "child", action: "bank_withdraw", detail: `stars:${stars}` });
    }
    playSound("tap");
    saveData({ feedbackText: "已从银行取出" });
    renderAll();
  }
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
  if (!await ensureSecurityUnlocked("补签")) return;
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
  saveData({ feedbackText: "任务已提交" });
  renderAll();
}

function addHistory(text, delta, type = "system", options = {}) {
  const actor = options.actor || (ui.role === "parent" ? "parent" : "child");
  const audit = Boolean(options.audit);
  const action = options.action || "";
  const detail = options.detail || "";
  state.history.unshift({
    id: crypto.randomUUID(),
    text,
    delta,
    type,
    actor,
    audit,
    action,
    detail,
    dateKey: todayKey(),
    at: new Date().toLocaleString()
  });
  state.history = state.history.slice(0, 120);
}

function addAudit(text, delta = 0, type = "system", options = {}) {
  addHistory(text, delta, type, {
    ...options,
    audit: true,
    actor: options.actor || "parent"
  });
}

function awardStars(stars, type, text) {
  if (isSecurityLocked()) return;
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
  const dynamicCost = getDynamicRewardCost(reward);
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
  redeemModalText.textContent = `确认兑换「${reward.name}」吗？将扣除 ${dynamicCost}⭐。`;
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
  saveData({ feedbackText: "评分已保存" });
  renderAll();
}

function rateTaskByParent(taskId, rating, options = {}) {
  if (isSecurityLocked()) {
    showAlert("检测到本地数据异常，星星资产已冻结。请家长先解锁。", "安全锁定");
    return;
  }
  if (!ratingList.includes(rating)) return;
  const { silent = false, partialStars = null, day = todayKey() } = options;
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
  saveData({ feedbackText: "已撤销评分" });
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
  saveData({ feedbackText: "兑换成功" });
  renderAll();
}

function redeemRewardByChild(rewardId) {
  if (isSecurityLocked()) {
    showAlert("检测到本地数据异常，星星资产已冻结。请家长先解锁。", "安全锁定");
    return;
  }
  const reward = state.rewards.find((item) => item.id === rewardId);
  if (!reward) return;
  const dynamicCost = getDynamicRewardCost(reward);
  if (state.stars < dynamicCost) return;
  if (!canRedeemByCooldown(reward)) return;
  if (remainingStock(reward) <= 0) return;

  captureRestorePoint("兑换前");
  state.stars -= dynamicCost;
  const usage = getWeekUsageMap(weekStartKey());
  usage[reward.id] = Number(usage[reward.id] || 0) + 1;
  state.redeemLog.unshift({ rewardId: reward.id, day: todayKey() });
  state.redeemLog = state.redeemLog.slice(0, 200);
  addHistory(`兑换奖励「${reward.name}」`, -dynamicCost, "redeem");
  addAudit(`奖励兑换：${reward.name}（支付 ${dynamicCost}⭐）`, -dynamicCost, "redeem", {
    action: "redeem_reward",
    detail: `base:${reward.cost},dynamic:${dynamicCost}`,
    actor: "child"
  });
  playSound("redeem");
  saveData({ feedbackText: "加分已保存" });
  renderAll();
}

async function grantBonusByParent(reason, stars) {
  if (!await ensureSecurityUnlocked("额外加分")) return false;
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
  addAudit(`额外加分：${reason}`, stars, "bonus", {
    action: "grant_bonus",
    detail: `reason:${reason}`
  });
  saveData({ feedbackText: "盲盒结果已记录" });
  renderAll();
  return true;
}

async function playGachaByChild() {
  if (!await ensureSecurityUnlocked("抽盲盒")) return;
  if (!state.gachaConfig?.enabled) {
    await showAlert("盲盒功能暂未开启。", "盲盒未开启");
    return;
  }
  const cost = Math.max(1, Number(state.gachaConfig.cost || 5));
  if (state.stars < cost) {
    await showAlert(`盲盒需要 ${cost}⭐，当前星星不足。`, "无法抽取");
    return;
  }
  const reward = drawGachaReward();
  if (!reward) {
    await showAlert("盲盒奖池为空，请家长先配置奖池。", "无法抽取");
    return;
  }

  captureRestorePoint("抽盲盒前");
  state.stars -= cost;
  addHistory(`抽取盲盒（消耗 ${cost}⭐）`, -cost, "redeem");

  const gainStars = Math.max(0, Number(reward.stars || 0));
  if (gainStars > 0) {
    awardStars(gainStars, "bonus", `盲盒奖励：${reward.name}`);
  } else {
    addHistory(`盲盒奖励：${reward.name}`, 0, "system");
  }
  addAudit(`盲盒抽取：${reward.name}`, gainStars - cost, "system", {
    action: "gacha_draw",
    detail: `cost:${cost},gain:${gainStars}`,
    actor: "child"
  });

  saveData({ feedbackText: "盲盒结果已记录" });
  renderAll();
  await showAlert(`本次盲盒：${reward.name}${gainStars > 0 ? `（+${gainStars}⭐）` : ""}`, "盲盒结果");
}

async function claimWeeklyGoalChest() {
  if (!await ensureSecurityUnlocked("领取宝箱")) return;
  const weekKey = currentWeekKey();
  const reached = isWeeklyGoalReached();
  if (!reached) {
    await showAlert("本周目标尚未达成，暂时不能领取宝箱。", "暂不可领取");
    return;
  }
  if (hasClaimedWeeklyGoalChest(weekKey)) {
    await showAlert("本周目标宝箱已经领取过了。", "重复领取");
    return;
  }

  const chestTitle = String(state.weeklyGoalChest?.title || "周目标宝箱").trim() || "周目标宝箱";
  const chestStars = Math.max(0, Number(state.weeklyGoalChest?.stars || 0));
  captureRestorePoint("领取目标宝箱前");
  state.weeklyGoalChestClaimedByWeek[weekKey] = {
    at: new Date().toLocaleString(),
    title: chestTitle,
    stars: chestStars
  };
  if (chestStars > 0) {
    awardStars(chestStars, "system", `领取每周目标宝箱：${chestTitle}`);
  } else {
    addHistory(`领取每周目标宝箱：${chestTitle}`, 0, "system");
  }
  addAudit(`领取每周目标宝箱：${chestTitle}`, chestStars, "system", {
    action: "claim_weekly_goal_chest",
    detail: `week:${weekKey}`,
    actor: "child"
  });
  saveData({ feedbackText: "宝箱已领取" });
  renderAll();
  await showAlert(`已领取「${chestTitle}」${chestStars > 0 ? `，获得 ${chestStars}⭐` : ""}。`, "领取成功");
}

async function claimCarryoverGoalChest(chestId) {
  if (!await ensureSecurityUnlocked("补领宝箱")) return;
  const index = state.unclaimedGoalChests.findIndex((item) => item.id === chestId);
  if (index < 0) return;
  const chest = state.unclaimedGoalChests[index];
  captureRestorePoint("补领跨周宝箱前");
  state.unclaimedGoalChests.splice(index, 1);
  const stars = Math.max(0, Number(chest.stars || 0));
  if (stars > 0) {
    awardStars(stars, "system", `补领上周目标宝箱：${chest.title}`);
  } else {
    addHistory(`补领上周目标宝箱：${chest.title}`, 0, "system");
  }
  addAudit("补领跨周目标宝箱", stars, "system", {
    actor: "child",
    action: "claim_carryover_goal_chest",
    detail: `week:${chest.weekKey}`
  });
  saveData({ feedbackText: "补领成功" });
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
  if (task) addAudit(`删除任务：${task.name}`, 0, "system", { action: "delete_task" });
  if (ui.editingTaskId === taskId) clearTaskEdit();
  saveData({ feedbackText: "任务已删除" });
  renderAll();
}

function removeReward(rewardId) {
  const reward = state.rewards.find((item) => item.id === rewardId);
  captureRestorePoint("删除奖励前");
  state.rewards = state.rewards.filter((item) => item.id !== rewardId);
  if (reward) addHistory(`删除奖励「${reward.name}」`, 0, "system");
  if (reward) addAudit(`删除奖励：${reward.name}`, 0, "system", { action: "delete_reward" });
  if (ui.editingRewardId === rewardId) clearRewardEdit();
  saveData({ feedbackText: "奖励已删除" });
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
  saveData({ feedbackText: "任务顺序已更新" });
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
  saveData({ feedbackText: "奖励顺序已更新" });
  renderAll();
}

function renderWeeklyGoal() {
  const earned = weeklyEarned();
  const goal = Math.max(5, Number(state.weeklyGoal || 20));
  const weekKey = currentWeekKey();
  const reached = earned >= goal;
  const claimed = hasClaimedWeeklyGoalChest(weekKey);
  const chestTitle = String(state.weeklyGoalChest?.title || "周目标宝箱").trim() || "周目标宝箱";
  const chestStars = Math.max(0, Number(state.weeklyGoalChest?.stars || 0));
  const percent = Math.min(100, Math.round((earned / goal) * 100));
  const left = Math.max(0, goal - earned);
  weeklyGoalText.textContent = `本周进度：${earned}/${goal}⭐`;
  weeklyGoalBar.style.width = `${percent}%`;
  weeklyGoalBar.classList.toggle("done", reached);

  if (reached) {
    goalMotivateText.textContent = claimed ? "已达标且已领取本周目标宝箱。" : "已达成本周目标，可以领取本周目标宝箱！";
  } else {
    goalMotivateText.textContent = `再拿 ${left}⭐，解锁本周目标宝箱！`;
  }

  if (goalChestText) {
    if (claimed) {
      goalChestText.textContent = `本周宝箱：${chestTitle}（+${chestStars}⭐）已领取`;
    } else if (reached) {
      goalChestText.textContent = `本周宝箱：${chestTitle}（+${chestStars}⭐）可领取`;
    } else {
      goalChestText.textContent = `本周宝箱：${chestTitle}（+${chestStars}⭐）未达成`;
    }
  }

  if (claimGoalChestBtn) {
    claimGoalChestBtn.classList.toggle("hidden", !reached && !claimed);
    claimGoalChestBtn.disabled = claimed || !reached;
    claimGoalChestBtn.textContent = claimed ? "本周已领取" : "领取本周目标宝箱";
  }

  if (carryoverChestWrap && carryoverChestList) {
    const queue = Array.isArray(state.unclaimedGoalChests) ? state.unclaimedGoalChests : [];
    carryoverChestWrap.classList.toggle("hidden", queue.length === 0);
    carryoverChestList.innerHTML = "";
    for (const chest of queue) {
      const li = document.createElement("li");
      li.className = "item";
      li.innerHTML = `
        <div>
          <strong>${chest.title}</strong><br />
          <small>来源周：${chest.weekKey} | 可补领 +${chest.stars}⭐</small>
        </div>
        <button data-carryover-claim="${chest.id}">补领</button>
      `;
      carryoverChestList.appendChild(li);
    }
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
    const dynamicCost = getDynamicRewardCost(reward);
    const hot = dynamicCost > reward.cost;
    const leftStock = remainingStock(reward);
    const hasStock = leftStock > 0;
    const canCooldown = canRedeemByCooldown(reward);
    const canRedeem = state.stars >= dynamicCost && hasStock && canCooldown;
    const stockText = Number.isFinite(reward.stock) ? ` | 本周还能换 ${leftStock} 次` : "";
    const cooldownText = Number(reward.cooldownDays || 0) > 0 ? ` | 冷却${reward.cooldownDays}天` : "";
    const shortfallText = state.stars < dynamicCost ? ` | 还差 ${dynamicCost - state.stars}⭐` : " | 可兑换";
    const resetTip = Number.isFinite(reward.stock) ? ` | 下次恢复 ${nextWeekResetLabel()}` : "";
    const hotTag = hot ? ` <span class="hot-tag">🔥热抢 +${Math.max(0, Number(state.pricingConfig.hotMarkupPercent || 0))}%</span>` : "";
    const priceText = hot ? `需要 ${dynamicCost}⭐（原价 ${reward.cost}⭐）` : `需要 ${reward.cost}⭐`;
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `
      <div>
        <strong>${reward.name}${hotTag}</strong><br />
        <small>${priceText}${stockText}${cooldownText}${shortfallText}${resetTip}</small>
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
    const dynamicCost = getDynamicRewardCost(reward);
    const hot = dynamicCost > reward.cost;
    const canMoveUp = index > 0;
    const canMoveDown = index < state.rewards.length - 1;
    const stockText = Number.isFinite(reward.stock) ? `每周${reward.stock}，余${remainingStock(reward)}` : "不限";
    const cooldownText = Number(reward.cooldownDays || 0) > 0 ? ` | 冷却：${reward.cooldownDays}天` : "";
    const resetTip = Number.isFinite(reward.stock) ? ` | 恢复：${nextWeekResetLabel()}` : "";
    const hotText = hot ? ` | 当前热抢价：${dynamicCost}⭐` : "";
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `
      <div>
        <strong>${index + 1}. ${reward.name}</strong><br />
        <small>兑换值：${reward.cost}⭐ | 库存：${stockText}${hotText}${cooldownText}${resetTip}</small>
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
  const keyword = (pendingSearchInput?.value || "").trim().toLowerCase();

  // Collect pending tasks across ALL days, not just today
  const pendingEntries = [];
  for (const day of Object.keys(state.completions)) {
    const dayMap = state.completions[day];
    if (!dayMap || typeof dayMap !== "object") continue;
    for (const task of state.tasks) {
      if (dayMap[task.id]?.state !== "pending") continue;
      if (keyword && !task.name.toLowerCase().includes(keyword)) continue;
      pendingEntries.push({ task, day, completion: dayMap[task.id] });
    }
  }

  if (!pendingEntries.length) {
    return;
  }

  for (const { task, day, completion } of pendingEntries) {
    const proofInfo = completion?.proofName ? `凭证：${completion.proofName}` : "无凭证";
    const dayLabel = day === todayKey() ? "今天" : day;
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `
      <div>
        <strong>${task.name}</strong><br />
        <small>满分 ${task.stars}⭐ | ${proofInfo} | ${dayLabel}</small>
      </div>
      <div class="task-actions">
        <div class="rate-buttons">
          <button class="btn-rate btn-active" data-parent-rate="${task.id}" data-rating="${RATING_ACTIVE}" data-rate-day="${day}">${RATING_ACTIVE}</button>
          <button class="btn-rate btn-remind" data-parent-rate="${task.id}" data-rating="${RATING_REMIND}" data-rate-day="${day}">${RATING_REMIND}</button>
          <button class="btn-rate btn-passive" data-parent-rate="${task.id}" data-rating="${RATING_PASSIVE}" data-rate-day="${day}">${RATING_PASSIVE}</button>
        </div>
        <div class="partial-rate-row">
          <input type="number" min="0" max="99" value="${task.stars}" data-partial-input="${task.id}" />
          <button class="btn-soft" data-parent-partial="${task.id}" data-rate-day="${day}">部分给⭐</button>
        </div>
        <button class="btn-passive" data-parent-reject="${task.id}" data-rate-day="${day}">驳回</button>
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
  } else if (filter === "audit") {
    list = state.history.filter((item) => Boolean(item.audit));
  } else if (filter !== "all") {
    list = state.history.filter((item) => item.type === filter);
  }

  if (keyword) {
    list = list.filter((item) => String(item.text || "").toLowerCase().includes(keyword));
  }
  if (!list.length) {
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
    const actorLabel = item.actor === "parent" ? "家长" : item.actor === "child" ? "孩子" : "系统";
    const auditTag = item.audit ? "<span class=\"audit-tag\">审计</span>" : "";
    li.innerHTML = `<strong>${item.text}</strong>${deltaText} ${auditTag}<br /><small>${item.at} · ${actorLabel}</small>`;
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

async function handleTamperDetectionIfNeeded() {
  if (!storeMeta?.tamperedAtLoad) return;
  if (!state.security?.tamperLocked) {
    state.security.tamperLocked = true;
    state.security.tamperDetectedAt = Date.now();
    addHistory("检测到本地数据异常，已冻结星星资产", 0, "system", { actor: "system" });
    addAudit("本地数据校验失败，触发资产冻结", 0, "system", {
      actor: "system",
      action: "tamper_detected_lock",
      detail: "source:localStorage_checksum"
    });
    saveData({ markPending: false });
  }
  await showAlert("检测到本地数据可能被篡改，星星资产已冻结。请家长在“家长安全”中确认后解锁。", "安全提醒");
}

function isLocalStateFreshLikeDefault() {
  const hasProgress =
    Number(state.stars || 0) > 0 ||
    Array.isArray(state.history) && state.history.length > 0 ||
    Object.keys(state.completions || {}).length > 0 ||
    Array.isArray(state.redeemLog) && state.redeemLog.length > 0;
  if (hasProgress) return false;

  const localTasks = (state.tasks || []).map((task) => `${task.name}|${task.stars}|${Boolean(task.needProof)}`).join("||");
  const defaultTasks = (defaultData.tasks || []).map((task) => `${task.name}|${task.stars}|${Boolean(task.needProof)}`).join("||");
  const localRewards = (state.rewards || []).map((reward) => `${reward.name}|${reward.cost}|${Number.isFinite(reward.stock) ? reward.stock : ""}|${Number(reward.cooldownDays || 0)}`).join("||");
  const defaultRewards = (defaultData.rewards || []).map((reward) => `${reward.name}|${reward.cost}|${Number.isFinite(reward.stock) ? reward.stock : ""}|${Number(reward.cooldownDays || 0)}`).join("||");

  return localTasks === defaultTasks && localRewards === defaultRewards;
}

function applyPulledServerData(serverData, options = {}) {
  const {
    captureLabel,
    successStatus = "拉取成功",
    historyText = "已从服务器拉取数据",
    version
  } = options;

  if (captureLabel) captureRestorePoint(captureLabel);

  const keepServerSync = { ...state.serverSync };
  const keepRestorePoints = [...state.restorePoints];
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, { ...structuredClone(defaultData), ...serverData });
  state.serverSync = keepServerSync;
  state.serverSync.pendingChanges = false;
  if (typeof version === "number") state.serverSync.version = version;
  setSyncStatus(successStatus);
  state.restorePoints = keepRestorePoints;
  normalizeDataShape();
  if (historyText) addHistory(historyText, 0, "system");
  saveData({ markPending: false });
  renderAll();
}

function mergeByIdList(serverList = [], localList = []) {
  const map = new Map();
  for (const item of serverList) {
    if (!item?.id) continue;
    map.set(item.id, { ...item });
  }
  for (const item of localList) {
    if (!item?.id) continue;
    map.set(item.id, { ...item });
  }
  return Array.from(map.values());
}

function mergeCompletions(serverCompletions = {}, localCompletions = {}) {
  const rank = { pending: 1, rejected: 2, rated: 3 };
  const merged = structuredClone(serverCompletions || {});
  for (const [day, localDayMap] of Object.entries(localCompletions || {})) {
    if (!merged[day]) merged[day] = {};
    for (const [taskId, localItem] of Object.entries(localDayMap || {})) {
      const serverItem = merged[day][taskId];
      if (!serverItem) {
        merged[day][taskId] = { ...localItem };
        continue;
      }
      const serverRank = rank[String(serverItem.state || "")] || 0;
      const localRank = rank[String(localItem.state || "")] || 0;
      merged[day][taskId] = localRank >= serverRank ? { ...localItem } : { ...serverItem };
    }
  }
  return merged;
}

function mergeHistory(serverHistory = [], localHistory = []) {
  const seen = new Set();
  const list = [];
  for (const item of [...localHistory, ...serverHistory]) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    list.push({ ...item });
  }
  return list.slice(0, 180);
}

function mergeRedeemLog(serverRedeem = [], localRedeem = []) {
  const seen = new Set();
  const list = [];
  for (const item of [...localRedeem, ...serverRedeem]) {
    const key = `${item?.rewardId || ""}|${item?.day || ""}`;
    if (!item?.rewardId || !item?.day || seen.has(key)) continue;
    seen.add(key);
    list.push({ ...item });
  }
  return list.slice(0, 300);
}

function mergeStatesForConflict(serverData, localData) {
  const merged = { ...structuredClone(defaultData), ...structuredClone(serverData || {}) };
  const local = { ...structuredClone(defaultData), ...structuredClone(localData || {}) };

  merged.tasks = mergeByIdList(merged.tasks, local.tasks);
  merged.rewards = mergeByIdList(merged.rewards, local.rewards);
  merged.completions = mergeCompletions(merged.completions, local.completions);
  merged.history = mergeHistory(merged.history, local.history);
  merged.redeemLog = mergeRedeemLog(merged.redeemLog, local.redeemLog);

  merged.earningsByDay = { ...(merged.earningsByDay || {}), ...(local.earningsByDay || {}) };
  merged.rewardWeeklyUsage = { ...(merged.rewardWeeklyUsage || {}), ...(local.rewardWeeklyUsage || {}) };
  merged.makeupUsageByWeek = { ...(merged.makeupUsageByWeek || {}), ...(local.makeupUsageByWeek || {}) };
  merged.makeupCardGrantByWeek = { ...(merged.makeupCardGrantByWeek || {}), ...(local.makeupCardGrantByWeek || {}) };
  merged.bonusUsageByWeek = { ...(merged.bonusUsageByWeek || {}), ...(local.bonusUsageByWeek || {}) };

  const serverIds = new Set((serverData?.history || []).map((item) => item?.id).filter(Boolean));
  const localOnlyDelta = (local.history || [])
    .filter((item) => item?.id && !serverIds.has(item.id))
    .reduce((sum, item) => sum + Number(item.delta || 0), 0);
  merged.stars = Math.max(0, Number(merged.stars || 0) + localOnlyDelta);

  merged.weeklyGoal = local.weeklyGoal;
  merged.weeklyGoalChest = local.weeklyGoalChest;
  merged.weeklyGoalChestClaimedByWeek = { ...(merged.weeklyGoalChestClaimedByWeek || {}), ...(local.weeklyGoalChestClaimedByWeek || {}) };
  merged.unclaimedGoalChests = mergeByIdList(merged.unclaimedGoalChests, local.unclaimedGoalChests);
  merged.weeklyGoalRolloverCursor = local.weeklyGoalRolloverCursor || merged.weeklyGoalRolloverCursor;
  merged.bank = local.bank;
  merged.bankConfig = local.bankConfig;
  merged.timeConfig = local.timeConfig;
  merged.pricingConfig = local.pricingConfig;
  merged.gachaConfig = local.gachaConfig;
  merged.makeupConfig = local.makeupConfig;
  merged.bonusConfig = local.bonusConfig;
  merged.security = local.security;
  merged.theme = local.theme;

  return merged;
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
  const interestChanged = settleBankInterestIfNeeded();
  if (interestChanged) saveData();
  const activeElement = document.activeElement;
  const isFocusableField =
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement ||
    activeElement instanceof HTMLSelectElement;
  const activeInputState = isFocusableField && activeElement.id
    ? {
      id: activeElement.id,
      start: "selectionStart" in activeElement ? activeElement.selectionStart : null,
      end: "selectionEnd" in activeElement ? activeElement.selectionEnd : null
    }
    : null;
  const starsChanged = lastRenderedStars !== state.stars;
  const weeklyGrantApplied = ensureWeeklyMakeupCardGrant();
  if (weeklyGrantApplied) saveData();
  const weeklyChestRolled = rolloverUnclaimedWeeklyGoalChest();
  if (weeklyChestRolled) saveData();
  refreshStreakFromCheckins();
  todayDateText.textContent = `今天是 ${formatTodayLabel()}`;
  document.body.dataset.theme = state.theme || "sunny";
  childStarCount.textContent = String(state.stars);
  parentStarCount.textContent = String(state.stars);
  const bankEnabled = state.bankConfig.enabled !== false;
  if (childBankCard) childBankCard.classList.toggle("hidden", !bankEnabled);
  if (bankSummaryText) {
    bankSummaryText.classList.toggle("hidden", !bankEnabled);
    if (bankEnabled) {
      const bal = Math.floor(state.bank.balance);
      const interest = estimateWeeklyBankInterest();
      let hint = "";
      if (bal > 0 && state.bank.lastDepositDay) {
        const elapsed = dayDiff(state.bank.lastDepositDay, todayKey());
        const penaltyDays = Math.max(0, Number(state.bankConfig.earlyWithdrawDays || 7));
        if (penaltyDays > 0 && elapsed < penaltyDays) {
          hint = ` | 免罚取出还需 ${penaltyDays - elapsed} 天`;
        } else {
          hint = " | 可免罚取出";
        }
      }
      bankSummaryText.textContent = `🏦 银行：${bal}⭐ | 预计利息 +${interest}⭐/周${hint}`;
    }
  }
  if (bankRulesInline) {
    bankRulesInline.classList.toggle("hidden", !bankEnabled);
    if (bankEnabled) {
      const c = state.bankConfig;
      const parts = [`最低存入 ${c.minDeposit}⭐`];
      parts.push(`周利率 ${c.weeklyRatePercent}%（上限 ${c.weeklyInterestCap}⭐）`);
      if (c.earlyWithdrawDays > 0 && c.earlyWithdrawPenaltyPercent > 0) {
        parts.push(`${c.earlyWithdrawDays}天内取出罚${c.earlyWithdrawPenaltyPercent}%`);
        parts.push(`满${c.earlyWithdrawDays}天免罚`);
      } else {
        parts.push("取出无手续费");
      }
      if (!c.allowChildWithdraw) parts.push("需家长代操作取出");
      bankRulesInline.textContent = parts.join(" · ");
    }
  }
  soundToggle.checked = Boolean(state.soundEnabled);
  reduceMotionToggle.checked = Boolean(state.reduceMotion);
  if (streakFeatureToggle) streakFeatureToggle.checked = Boolean(state.streakEnabled);
  if (childStreakCard) childStreakCard.classList.toggle("hidden", !state.streakEnabled);
  if (childTopGrid) childTopGrid.classList.toggle("streak-off", !state.streakEnabled);
  if (makeupSettingsCol) makeupSettingsCol.classList.toggle("hidden", !state.streakEnabled);
  document.body.classList.toggle("reduce-motion", Boolean(state.reduceMotion));
  weeklyGoalInput.value = String(state.weeklyGoal);
  if (goalChestTitleInput) goalChestTitleInput.value = String(state.weeklyGoalChest.title || "周目标宝箱");
  if (goalChestStarsInput) goalChestStarsInput.value = String(Math.max(0, Number(state.weeklyGoalChest.stars || 0)));
  if (goalChestParentText) {
    const chestTitle = String(state.weeklyGoalChest.title || "周目标宝箱").trim() || "周目标宝箱";
    const chestStars = Math.max(0, Number(state.weeklyGoalChest.stars || 0));
    goalChestParentText.textContent = `当前目标宝箱：${chestTitle}（+${chestStars}⭐），每周可领取 1 次。`;
  }
  pinGraceInput.value = String(state.pinGraceMinutes);
  if (tamperLockNotice) {
    tamperLockNotice.classList.toggle("hidden", !isSecurityLocked());
  }
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
  if (bankRateInput) bankRateInput.value = String(Number(state.bankConfig.weeklyRatePercent || 1));
  if (bankCapInput) bankCapInput.value = String(Number(state.bankConfig.weeklyInterestCap || 20));
  if (bankWithdrawToggle) bankWithdrawToggle.checked = Boolean(state.bankConfig.allowChildWithdraw);
  if (bankEnabledToggle) bankEnabledToggle.checked = Boolean(state.bankConfig.enabled);
  if (bankRuleSummary) {
    const r = state.bankConfig;
    bankRuleSummary.textContent = `银行规则：周利率 ${r.weeklyRatePercent}%（上限 ${r.weeklyInterestCap}⭐）| 最低存入 ${r.minDeposit}⭐ | ${r.earlyWithdrawDays}天内取出罚${r.earlyWithdrawPenaltyPercent}% | 孩子${r.allowChildWithdraw ? "可" : "不可"}取出`;
  }
  if (bankRateInput) bankRateInput.value = String(state.bankConfig.weeklyRatePercent);
  if (bankCapInput) bankCapInput.value = String(state.bankConfig.weeklyInterestCap);
  if (bankMinDepositInput) bankMinDepositInput.value = String(state.bankConfig.minDeposit);
  if (bankPenaltyPercentInput) bankPenaltyPercentInput.value = String(state.bankConfig.earlyWithdrawPenaltyPercent);
  if (bankPenaltyDaysInput) bankPenaltyDaysInput.value = String(state.bankConfig.earlyWithdrawDays);
  if (bankWithdrawToggle) bankWithdrawToggle.checked = Boolean(state.bankConfig.allowChildWithdraw);
  if (hotStockThresholdInput) hotStockThresholdInput.value = String(Math.max(1, Number(state.pricingConfig.hotStockThreshold || 1)));
  if (hotMarkupPercentInput) hotMarkupPercentInput.value = String(Math.max(0, Number(state.pricingConfig.hotMarkupPercent || 0)));
  if (dynamicPricingSummary) {
    dynamicPricingSummary.textContent = `热抢规则：当某奖励本周剩余次数 <= ${state.pricingConfig.hotStockThreshold} 时，价格上浮 ${state.pricingConfig.hotMarkupPercent}%`;
  }
  if (gachaCostInput) gachaCostInput.value = String(Math.max(1, Number(state.gachaConfig.cost || 5)));
  if (gachaEnabledToggle) gachaEnabledToggle.checked = Boolean(state.gachaConfig.enabled);
  if (gachaRuleSummary) {
    gachaRuleSummary.textContent = `盲盒规则：每次消耗 ${state.gachaConfig.cost}⭐，按奖池权重随机抽取；可在高级设置编辑奖池。`;
  }
  if (gachaPoolInput) gachaPoolInput.value = gachaPoolToText();
  if (gachaPoolSummary) {
    const poolCount = Array.isArray(state.gachaConfig.pool) ? state.gachaConfig.pool.length : 0;
    gachaPoolSummary.textContent = `当前盲盒奖池：${poolCount} 项 | 消耗 ${state.gachaConfig.cost}⭐`;
  }
  if (gachaPoolPreview) {
    gachaPoolPreview.textContent = gachaPoolPreviewText();
  }
  if (gachaBoxWrap && gachaHintText && gachaDrawBtn) {
    gachaBoxWrap.classList.toggle("hidden", !state.gachaConfig.enabled);
    gachaHintText.textContent = `盲盒：每次 ${state.gachaConfig.cost}⭐，随机奖励`;
    gachaDrawBtn.disabled = state.stars < Number(state.gachaConfig.cost || 0);
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
    if (nextActive instanceof HTMLInputElement || nextActive instanceof HTMLTextAreaElement || nextActive instanceof HTMLSelectElement) {
      nextActive.focus({ preventScroll: true });
      if (
        "setSelectionRange" in nextActive &&
        typeof activeInputState.start === "number" &&
        typeof activeInputState.end === "number"
      ) {
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
  saveData({ feedbackText: "验证成功" });
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
  saveData({ feedbackText: "每周目标已保存" });
  renderAll();
});

if (goalChestForm) {
  goalChestForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = String(goalChestTitleInput?.value || "").trim() || "周目标宝箱";
    const stars = Math.max(0, Number(goalChestStarsInput?.value || 0));
    if (!Number.isFinite(stars)) return;
    captureRestorePoint("修改目标宝箱前");
    state.weeklyGoalChest.title = title;
    state.weeklyGoalChest.stars = stars;
    addHistory(`已更新目标宝箱：${title}（+${stars}⭐）`, 0, "system");
    saveData({ feedbackText: "目标宝箱已保存" });
    renderAll();
  });
}

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
  saveData({ feedbackText: "PIN已保存" });
  pinForm.reset();
});

pinOffBtn.addEventListener("click", () => {
  captureRestorePoint("关闭PIN前");
  state.pinEnabled = false;
  state.pin = "";
  state.parentUnlockUntil = 0;
  addHistory("已关闭家长PIN", 0, "system");
  saveData({ feedbackText: "PIN已关闭" });
});

pinGraceForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const minutes = Number(pinGraceInput.value);
  if (!Number.isFinite(minutes) || minutes < 0 || minutes > 120) return;
  captureRestorePoint("修改PIN免输时长前");
  state.pinGraceMinutes = minutes;
  addHistory(`已更新PIN免输时长：${minutes}分钟`, 0, "system");
  saveData({ feedbackText: "免输时长已保存" });
});

soundToggle.addEventListener("change", () => {
  captureRestorePoint("切换音效前");
  state.soundEnabled = soundToggle.checked;
  addHistory(state.soundEnabled ? "已开启音效反馈" : "已关闭音效反馈", 0, "system");
  saveData({ feedbackText: state.soundEnabled ? "已开启音效" : "已关闭音效" });
});

reduceMotionToggle.addEventListener("change", () => {
  captureRestorePoint("切换动画模式前");
  state.reduceMotion = reduceMotionToggle.checked;
  addHistory(state.reduceMotion ? "已开启简化动画" : "已关闭简化动画", 0, "system");
  saveData({ feedbackText: state.reduceMotion ? "已开启简化动画" : "已关闭简化动画" });
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
    saveData({ feedbackText: "家庭时区已保存" });
    renderAll();
  });
}

if (streakFeatureToggle) {
  streakFeatureToggle.addEventListener("change", () => {
    captureRestorePoint("切换连续打卡功能前");
    state.streakEnabled = streakFeatureToggle.checked;
    addHistory(state.streakEnabled ? "已开启连续打卡功能" : "已关闭连续打卡功能", 0, "system");
    saveData({ feedbackText: state.streakEnabled ? "已开启连续打卡" : "已关闭连续打卡" });
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
  saveData({ feedbackText: "补签规则已保存" });
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
    saveData({ feedbackText: "每周发卡已保存" });
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
    saveData({ feedbackText: "补签卡已发放" });
    renderAll();
  });
}

makeupCountMilestoneToggle.addEventListener("change", () => {
  captureRestorePoint("切换补签里程碑前");
  state.makeupConfig.countForMilestone = makeupCountMilestoneToggle.checked;
  addHistory(state.makeupConfig.countForMilestone ? "补签可触发里程碑奖励" : "补签不触发里程碑奖励", 0, "system");
  saveData({ feedbackText: state.makeupConfig.countForMilestone ? "补签可触发里程碑" : "补签不触发里程碑" });
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
    addAudit(`修改任务：${name}`, 0, "system", { action: "update_task" });
  } else {
    state.tasks.push({ id: crypto.randomUUID(), name, stars, needProof: Boolean(taskNeedProof.checked) });
    addHistory(`新增任务「${name}」`, 0, "system");
    addAudit(`新增任务：${name}`, 0, "system", { action: "create_task" });
  }

  const wasEditingTask = Boolean(ui.editingTaskId);
  clearTaskEdit();
  saveData({ feedbackText: wasEditingTask ? "任务已修改" : "任务已新增" });
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
    addAudit(`修改奖励：${name}`, 0, "system", { action: "update_reward" });
  } else {
    state.rewards.push({ id: crypto.randomUUID(), name, cost, stock, cooldownDays });
    addHistory(`新增奖励「${name}」`, 0, "system");
    addAudit(`新增奖励：${name}`, 0, "system", { action: "create_reward" });
  }

  const wasEditingReward = Boolean(ui.editingRewardId);
  clearRewardEdit();
  saveData({ feedbackText: wasEditingReward ? "奖励已修改" : "奖励已新增" });
  renderAll();
});

if (dynamicPricingForm) {
  dynamicPricingForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const threshold = Number(hotStockThresholdInput?.value || 1);
    const markup = Number(hotMarkupPercentInput?.value || 0);
    if (!Number.isFinite(threshold) || threshold < 1) return;
    if (!Number.isFinite(markup) || markup < 0) return;
    captureRestorePoint("修改热抢规则前");
    state.pricingConfig.hotStockThreshold = Math.round(threshold);
    state.pricingConfig.hotMarkupPercent = Math.round(markup);
    addHistory(`已更新热抢规则：剩余<=${state.pricingConfig.hotStockThreshold} 时加价 ${state.pricingConfig.hotMarkupPercent}%`, 0, "system");
    addAudit("更新热抢动态定价规则", 0, "system", {
      action: "update_dynamic_pricing",
      detail: `threshold:${state.pricingConfig.hotStockThreshold},markup:${state.pricingConfig.hotMarkupPercent}`
    });
    saveData({ feedbackText: "热抢规则已保存" });
    renderAll();
  });
}

if (gachaConfigForm) {
  gachaConfigForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const cost = Number(gachaCostInput?.value || 0);
    if (!Number.isFinite(cost) || cost < 1) return;
    captureRestorePoint("修改盲盒消耗前");
    state.gachaConfig.cost = Math.round(cost);
    state.gachaConfig.enabled = Boolean(gachaEnabledToggle?.checked);
    addHistory(`已更新盲盒消耗：${state.gachaConfig.cost}⭐`, 0, "system");
    addAudit("更新盲盒基础配置", 0, "system", {
      action: "update_gacha_config",
      detail: `enabled:${state.gachaConfig.enabled},cost:${state.gachaConfig.cost}`
    });
    saveData({ feedbackText: "盲盒消耗已保存" });
    renderAll();
  });
}

if (saveGachaPoolBtn) {
  saveGachaPoolBtn.addEventListener("click", async () => {
    const parsed = parseGachaPoolText(gachaPoolInput?.value || "");
    if (!parsed.length) {
      await showAlert("盲盒奖池不能为空，请至少填写一行。", "保存失败");
      return;
    }
    captureRestorePoint("修改盲盒奖池前");
    state.gachaConfig.pool = parsed;
    state.gachaConfig.enabled = Boolean(gachaEnabledToggle?.checked);
    addHistory(`已更新盲盒奖池：${parsed.length} 项`, 0, "system");
    addAudit("更新盲盒奖池", 0, "system", {
      action: "update_gacha_pool",
      detail: `size:${parsed.length}`
    });
    saveData({ feedbackText: "盲盒奖池已保存" });
    renderAll();
  });
}

bonusForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const reason = bonusReason.value.trim();
  const stars = Number(bonusStars.value);
  const ok = await grantBonusByParent(reason, stars);
  if (!ok) return;
  bonusForm.reset();
  bonusStars.value = "1";
});

if (bankActionForm) {
  bankActionForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const action = String(bankActionType?.value || "deposit");
    const amount = Number(bankActionAmount?.value || 0);
    await moveStarsByBank(action, amount);
    if (bankActionAmount) bankActionAmount.value = "1";
  });
}

if (bankConfigForm) {
  bankConfigForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const rate = Number(bankRateInput?.value || 0);
    const cap = Number(bankCapInput?.value || 0);
    if (!Number.isFinite(rate) || rate < 0) return;
    if (!Number.isFinite(cap) || cap < 1) return;
    captureRestorePoint("修改银行利息规则前");
    state.bankConfig.weeklyRatePercent = Math.round(rate);
    state.bankConfig.weeklyInterestCap = Math.round(cap);
    addHistory(`已更新银行利息规则：周利率${state.bankConfig.weeklyRatePercent}%，上限${state.bankConfig.weeklyInterestCap}⭐`, 0, "system");
    saveData({ feedbackText: "银行利息规则已保存" });
    renderAll();
    showAlert(`利息规则已保存：周利率 ${state.bankConfig.weeklyRatePercent}%，上限 ${state.bankConfig.weeklyInterestCap}⭐`, "✅ 保存成功");
  });
}

if (bankPenaltyForm) {
  bankPenaltyForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const minDep = Number(bankMinDepositInput?.value || 5);
    const penPct = Number(bankPenaltyPercentInput?.value || 10);
    const penDays = Number(bankPenaltyDaysInput?.value || 7);
    if (!Number.isFinite(minDep) || minDep < 1) return;
    if (!Number.isFinite(penPct) || penPct < 0) return;
    if (!Number.isFinite(penDays) || penDays < 0) return;
    captureRestorePoint("修改银行取出规则前");
    state.bankConfig.minDeposit = Math.round(minDep);
    state.bankConfig.earlyWithdrawPenaltyPercent = Math.round(penPct);
    state.bankConfig.earlyWithdrawDays = Math.round(penDays);
    addHistory(`已更新银行取出规则：最低存入${state.bankConfig.minDeposit}⭐，${state.bankConfig.earlyWithdrawDays}天内取出罚${state.bankConfig.earlyWithdrawPenaltyPercent}%`, 0, "system");
    saveData({ feedbackText: "银行取出规则已保存" });
    renderAll();
    showAlert(`取出规则已保存：最低 ${state.bankConfig.minDeposit}⭐，${state.bankConfig.earlyWithdrawDays}天内罚${state.bankConfig.earlyWithdrawPenaltyPercent}%`, "✅ 保存成功");
  });
}

if (bankWithdrawToggle) {
  bankWithdrawToggle.addEventListener("change", () => {
    state.bankConfig.allowChildWithdraw = Boolean(bankWithdrawToggle.checked);
    addHistory(`银行取出权限：${state.bankConfig.allowChildWithdraw ? "允许孩子取出" : "禁止孩子取出"}`, 0, "system");
    saveData({ feedbackText: state.bankConfig.allowChildWithdraw ? "已允许孩子取出" : "已禁止孩子取出" });
    renderAll();
    showAlert(state.bankConfig.allowChildWithdraw ? "已允许孩子自由取出" : "已禁止孩子自行取出", "✅ 设置已保存");
  });
}

if (bankEnabledToggle) {
  bankEnabledToggle.addEventListener("change", () => {
    state.bankConfig.enabled = Boolean(bankEnabledToggle.checked);
    addHistory(`银行功能：${state.bankConfig.enabled ? "已开启" : "已关闭"}`, 0, "system");
    saveData({ feedbackText: state.bankConfig.enabled ? "银行功能已开启" : "银行功能已关闭" });
    renderAll();
    showAlert(state.bankConfig.enabled ? "银行功能已开启，孩子界面将显示银行" : "银行功能已关闭，孩子界面将隐藏银行", "✅ 设置已保存");
  });
}

if (tamperUnlockBtn) {
  tamperUnlockBtn.addEventListener("click", async () => {
    if (!isSecurityLocked()) return;
    const ok = await showConfirm("确认已由家长核对数据并解除安全锁定吗？", "解除安全锁定");
    if (!ok) return;
    state.security.tamperLocked = false;
    addHistory("家长已解除安全锁定", 0, "system", { actor: "parent" });
    addAudit("解除安全锁定", 0, "system", {
      actor: "parent",
      action: "tamper_unlock"
    });
    saveData({ feedbackText: "已解除安全锁定" });
    renderAll();
  });
}

if (bonusLimitForm) {
  bonusLimitForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const weeklyLimit = Number(bonusWeeklyLimitInput?.value || 0);
    if (!Number.isFinite(weeklyLimit) || weeklyLimit < 1) return;
    captureRestorePoint("修改额外奖励上限前");
    state.bonusConfig.weeklyLimit = Math.round(weeklyLimit);
    addHistory(`已更新每周额外奖励上限：${state.bonusConfig.weeklyLimit}⭐`, 0, "system");
    saveData({ feedbackText: "每周额外奖励上限已保存" });
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
  saveData({ feedbackText: "主题已切换" });
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
    await bootstrapServerState({ preferServer: true });
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
  await bootstrapServerState({ preferServer: true });
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

if (claimGoalChestBtn) {
  claimGoalChestBtn.addEventListener("click", () => {
    claimWeeklyGoalChest();
  });
}

if (carryoverChestList) {
  carryoverChestList.addEventListener("click", (event) => {
    const button = event.target instanceof Element ? event.target.closest("button") : null;
    if (!(button instanceof HTMLButtonElement) || !carryoverChestList.contains(button)) return;
    const chestId = button.dataset.carryoverClaim;
    if (!chestId) return;
    claimCarryoverGoalChest(chestId);
  });
}

if (gachaDrawBtn) {
  gachaDrawBtn.addEventListener("click", () => {
    playGachaByChild();
  });
}

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
    const day = button.dataset.rateDay || todayKey();
    rateTaskByParent(partialTaskId, RATING_REMIND, { partialStars: stars, day });
    return;
  }

  const rejectTaskId = button.dataset.parentReject;
  if (rejectTaskId) {
    const reason = await showPrompt("请输入驳回原因", "请补充拍照凭证或任务细节", "驳回任务");
    if (reason === null) return;
    const day = button.dataset.rateDay || todayKey();
    const completion = state.completions[day]?.[rejectTaskId];
    if (!completion || completion.state !== "pending") return;
    completion.state = "rejected";
    completion.reason = reason.trim() || "请补充后再提交";
    addHistory(`驳回任务，原因：${completion.reason}`, 0, "task");
    saveData({ feedbackText: "驳回已保存" });
    renderAll();
    return;
  }

  const taskId = button.dataset.parentRate;
  const rating = button.dataset.rating;
  if (!taskId || !rating) return;
  const day = button.dataset.rateDay || todayKey();
  rateTaskByParent(taskId, rating, { day });
});

async function approveAllPendingAs(rating) {
  // Collect pending across all days
  const pendingItems = [];
  for (const day of Object.keys(state.completions)) {
    const dayMap = state.completions[day];
    if (!dayMap || typeof dayMap !== "object") continue;
    for (const task of state.tasks) {
      if (dayMap[task.id]?.state === "pending") {
        pendingItems.push({ taskId: task.id, day });
      }
    }
  }

  if (!pendingItems.length) {
    await showAlert("没有待评分任务。", "无需操作");
    return;
  }
  const ok = await showConfirm(`确认将 ${pendingItems.length} 个任务一键评为“${rating}”吗？`, "批量评分");
  if (!ok) return;

  for (const { taskId, day } of pendingItems) {
    rateTaskByParent(taskId, rating, { silent: true, day });
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
  saveData({ feedbackText: "今日任务已重置" });
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
  saveData({ feedbackText: "已完成导出" });
  renderBackupReminder();
});

exportCsvBtn.addEventListener("click", () => {
  const rows = [["日期", "类型", "内容", "星星变化", "操作者", "审计动作", "审计标记"]];
  for (const item of state.history) {
    rows.push([
      item.dateKey || "",
      item.type || "system",
      String(item.text || "").replaceAll('"', '""'),
      String(item.delta || 0),
      item.actor || "",
      item.action || "",
      item.audit ? "Y" : ""
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
      saveData({ feedbackText: "导入成功" });
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

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    flushAutoSync();
    return;
  }
  if (document.visibilityState === "visible") {
    refreshFromServerSilently();
  }
});

window.addEventListener("beforeunload", () => {
  flushAutoSync();
});

async function bootstrapServerState(options = {}) {
  const { preferServer = false } = options;
  const status = await syncAdapter.getStatus();
  if (!status.canSync) return;

  if (!preferServer && state.serverSync?.pendingChanges) {
    const pushed = await syncAdapter.push();
    setSyncStatus(pushed.ok ? "恢复未同步数据成功" : "恢复未同步数据失败");
    if (pushed.ok) state.serverSync.pendingChanges = false;
    persist();
    renderAll();
    return;
  }

  if (!preferServer && !isLocalStateFreshLikeDefault()) {
    setSyncStatus("本地优先模式：已跳过启动拉取，避免覆盖本地最新修改");
    saveData({ markPending: false });
    renderAll();
    return;
  }

  const result = await syncAdapter.pull();
  if (result.ok && result.data) {
    applyPulledServerData(result.data, {
      successStatus: "启动拉取成功",
      historyText: "",
      version: result.version
    });
    return;
  }

  if (String(result.message || "").includes("暂无") || String(result.message || "").includes("no state")) {
    if (preferServer && state.serverSync) state.serverSync.pendingChanges = false;
    setSyncStatus("服务器暂无数据（已暂停自动初始化上传）");
    saveData({ markPending: false });
    renderAll();
  }
}

async function refreshFromServerSilently() {
  if (!authState.token) return;
  if (state.serverSync?.pendingChanges) return;

  const status = await syncAdapter.getStatus();
  if (!status.canSync) return;

  const result = await syncAdapter.pull();
  const incomingVersion = Number(result.version || 0);
  const currentVersion = Number(state.serverSync?.version || 0);
  if (result.ok && result.data && incomingVersion > currentVersion) {
    applyPulledServerData(result.data, {
      successStatus: "已同步最新数据",
      historyText: "",
      version: incomingVersion
    });
  }
}

async function initApp() {
  await handleTamperDetectionIfNeeded();

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
  await bootstrapServerState({ preferServer: true });

  if (livePullTimer) clearInterval(livePullTimer);
  livePullTimer = setInterval(() => {
    refreshFromServerSilently();
  }, 15000);

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

// ── Parent Tab switching ──
const parentTabButtons = document.querySelectorAll(".parent-tab");
const parentTabContents = {
  today: document.querySelector("#parentTabToday"),
  manage: document.querySelector("#parentTabManage"),
  settings: document.querySelector("#parentTabSettings")
};

parentTabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    parentTabButtons.forEach(b => b.classList.toggle("active", b === btn));
    Object.entries(parentTabContents).forEach(([key, el]) => {
      if (el) el.classList.toggle("hidden", key !== tab);
    });
  });
});

// ── Empty state helpers ──
const pendingEmpty = document.querySelector("#pendingEmpty");
const historyEmpty = document.querySelector("#historyEmpty");
const childTaskEmpty = document.querySelector("#childTaskEmpty");

function updateEmptyStates() {
  if (pendingEmpty) {
    const hasPending = document.querySelector("#parentPendingList")?.children.length > 0;
    pendingEmpty.classList.toggle("hidden", hasPending);
  }
  if (historyEmpty) {
    const hasHistory = document.querySelector("#parentHistoryList")?.children.length > 0;
    historyEmpty.classList.toggle("hidden", hasHistory);
  }
  if (childTaskEmpty) {
    const hasTasks = document.querySelector("#childTaskList")?.children.length > 0;
    childTaskEmpty.classList.toggle("hidden", hasTasks);
  }
}

// Hook into renderAll
const _origRenderAll = renderAll;
renderAll = function (...args) {
  _origRenderAll.apply(this, args);
  updateEmptyStates();
};

initApp();
