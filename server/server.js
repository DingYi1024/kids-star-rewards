const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Database = require("better-sqlite3");

const PORT = Number(process.env.PORT || 8787);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");
const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, "app.db");
const WEB_ROOT = process.env.WEB_ROOT || path.join(__dirname, "..");

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS app_state (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
`);

try { db.exec("ALTER TABLE app_state ADD COLUMN version INTEGER NOT NULL DEFAULT 1"); } catch (_) { /* column already exists */ }

const findUserByNameStmt = db.prepare("SELECT * FROM users WHERE username = ?");
const findUserByIdStmt = db.prepare("SELECT id, username FROM users WHERE id = ?");
const createUserStmt = db.prepare("INSERT INTO users (id, username, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?)");
const createSessionStmt = db.prepare("INSERT INTO sessions (token, user_id, created_at, last_seen_at) VALUES (?, ?, ?, ?)");
const findSessionStmt = db.prepare("SELECT * FROM sessions WHERE token = ?");
const updateSessionSeenStmt = db.prepare("UPDATE sessions SET last_seen_at = ? WHERE token = ?");
const deleteSessionStmt = db.prepare("DELETE FROM sessions WHERE token = ?");
const getStateStmt = db.prepare("SELECT payload, updated_at, version FROM app_state WHERE id = ?");
const upsertStateStmt = db.prepare(`
INSERT INTO app_state (id, payload, updated_at, version)
VALUES (?, ?, ?, 1)
ON CONFLICT(id) DO UPDATE SET
  payload = excluded.payload,
  updated_at = excluded.updated_at,
  version = version + 1
`);
const getVersionStmt = db.prepare("SELECT version FROM app_state WHERE id = ?");

function normalizeUsername(input) {
  return String(input || "").trim().toLowerCase();
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
}

function issueToken() {
  return crypto.randomBytes(24).toString("hex");
}

function readToken(req) {
  const auth = String(req.headers.authorization || "");
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  return String(req.headers["x-auth-token"] || "").trim();
}

const MAX_SESSION_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

function requireAuth(req, res, next) {
  const token = readToken(req);
  if (!token) {
    res.status(401).json({ ok: false, message: "unauthorized" });
    return;
  }

  const session = findSessionStmt.get(token);
  if (!session) {
    res.status(401).json({ ok: false, message: "invalid session" });
    return;
  }

  if (Date.now() - session.last_seen_at > MAX_SESSION_AGE_MS) {
    deleteSessionStmt.run(token);
    res.status(401).json({ ok: false, message: "session expired" });
    return;
  }

  const user = findUserByIdStmt.get(session.user_id);
  if (!user) {
    res.status(401).json({ ok: false, message: "user not found" });
    return;
  }

  updateSessionSeenStmt.run(Date.now(), token);
  req.authToken = token;
  req.user = user;
  next();
}

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, mode: "server-sqlite", dbFile: DB_FILE });
});

app.post("/api/register", (req, res) => {
  const username = normalizeUsername(req.body?.username);
  const password = String(req.body?.password || "");

  if (username.length < 3 || username.length > 24) {
    res.status(400).json({ ok: false, message: "用户名长度需为3-24位" });
    return;
  }
  if (password.length < 6 || password.length > 64) {
    res.status(400).json({ ok: false, message: "密码长度需为6-64位" });
    return;
  }

  if (findUserByNameStmt.get(username)) {
    res.status(409).json({ ok: false, message: "用户名已存在" });
    return;
  }

  const userId = crypto.randomUUID();
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);
  const now = Date.now();

  createUserStmt.run(userId, username, passwordHash, salt, now);
  const token = issueToken();
  createSessionStmt.run(token, userId, now, now);

  res.json({ ok: true, token, username });
});

app.post("/api/login", (req, res) => {
  const username = normalizeUsername(req.body?.username);
  const password = String(req.body?.password || "");
  const user = findUserByNameStmt.get(username);
  if (!user) {
    res.status(401).json({ ok: false, message: "用户名或密码错误" });
    return;
  }

  const checkHash = hashPassword(password, user.password_salt);
  if (checkHash !== user.password_hash) {
    res.status(401).json({ ok: false, message: "用户名或密码错误" });
    return;
  }

  const now = Date.now();
  const token = issueToken();
  createSessionStmt.run(token, user.id, now, now);
  res.json({ ok: true, token, username: user.username });
});

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ ok: true, userId: req.user.id, username: req.user.username });
});

app.post("/api/logout", requireAuth, (req, res) => {
  deleteSessionStmt.run(req.authToken);
  res.json({ ok: true });
});

app.get("/api/state", requireAuth, (req, res) => {
  const row = getStateStmt.get(req.user.id);
  if (!row) {
    res.json({ ok: false, message: "no state yet", version: 0 });
    return;
  }

  try {
    const data = JSON.parse(row.payload);
    res.json({ ok: true, data, updatedAt: row.updated_at, version: row.version });
  } catch {
    res.status(500).json({ ok: false, message: "state parse failed" });
  }
});

app.post("/api/state", requireAuth, (req, res) => {
  const data = req.body?.data;
  if (!data || typeof data !== "object") {
    res.status(400).json({ ok: false, message: "invalid payload" });
    return;
  }

  const expectedVersion = req.body?.expectedVersion;
  if (typeof expectedVersion === "number" && expectedVersion >= 0) {
    const current = getVersionStmt.get(req.user.id);
    const serverVersion = current ? Number(current.version || 0) : 0;
    if (serverVersion !== Number(expectedVersion)) {
      res.status(409).json({
        ok: false,
        conflict: true,
        message: "数据版本冲突：其他设备已更新数据，请先拉取最新数据",
        serverVersion,
        clientVersion: Number(expectedVersion)
      });
      return;
    }
  }

  const payload = JSON.stringify(data);
  const now = Date.now();
  upsertStateStmt.run(req.user.id, payload, now);
  const newRow = getVersionStmt.get(req.user.id);
  res.json({ ok: true, updatedAt: now, version: newRow?.version || 1 });
});

app.use(express.static(WEB_ROOT));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    next();
    return;
  }
  res.sendFile(path.join(WEB_ROOT, "index.html"));
});

app.listen(PORT, () => {
  console.log(`[kids-star-rewards] API listening on :${PORT}`);
  console.log(`[kids-star-rewards] DB file: ${DB_FILE}`);
  console.log(`[kids-star-rewards] Web root: ${WEB_ROOT}`);
});
