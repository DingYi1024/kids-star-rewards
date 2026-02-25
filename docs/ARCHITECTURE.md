# Architecture Overview

## Runtime Modules

- `index.html`
  - Loads modules in this order:
    1. `assets/js/date-utils.js`
    2. `assets/js/store.js`
    3. `assets/js/sync-auth-client.js`
    4. `assets/js/modals.js`
    5. `assets/js/app.js`

- `assets/js/date-utils.js`
  - Pure date helpers (`todayKey`, `weekStartKey`, `shiftDay`, etc.)

- `assets/js/store.js`
  - Local persistence adapter for app state (`createStore`)

- `assets/js/sync-auth-client.js`
  - Auth/session API (`register`, `login`, `me`, `logout`)
  - Server sync adapter (`getStatus`, `push`, `pull`)

- `assets/js/modals.js`
  - Unified modal primitives (`showAlert`, `showConfirm`, `showPrompt`)
  - PIN modal open/close + UI modal event wiring

- `assets/js/app.js`
  - Domain logic (tasks, rewards, rating, streak, stats)
  - UI rendering and event orchestration

- `server/server.js`
  - Backend API + SQLite persistence (`users`, `sessions`, `app_state`)

## Current Data Flow

1. `assets/js/app.js` boots and loads local snapshot from `assets/js/store.js`
2. If auth token exists, it validates user with `/api/me`
3. App attempts server bootstrap pull (`/api/state`)
4. UI actions mutate `state` and call `saveData()`
5. `saveData()` persists local snapshot and queues debounced server push

## Next Refactor Targets

- Split `assets/js/app.js` renderers by concern:
  - `render-child.js`
  - `render-parent.js`
  - `render-stats.js`
- Move event registration into `events.js`
- Keep `assets/js/app.js` as bootstrap/composition entry only
