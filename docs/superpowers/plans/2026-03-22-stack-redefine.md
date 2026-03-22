# Stack Redefine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename Foreman's services, routes, and DB tables to establish a clear 4-layer architecture (Terminal → Session → Agent → Orchestrator), then document it.

**Architecture:** L1 `TmuxService` becomes `TerminalService`, L2 `WorkerService` becomes `SessionService`. Routes shift from `/api/sessions` → `/api/terminals` (L1) and `/api/workers` → `/api/sessions` (L2). DB tables `workers`/`worker_events` become `sessions`/`session_events`. No new functionality — rename + docs only.

**Tech Stack:** Fastify, better-sqlite3, Vitest, React

**Spec:** `docs/superpowers/specs/2026-03-22-stack-redefine-design.md`

---

### Task 1: Rename TmuxService → TerminalService

**Files:**
- Rename: `src/server/services/tmux.js` → `src/server/services/terminal.js`
- Modify: `src/server/index.js`
- Rename: `tests/services/tmux.test.js` → `tests/services/terminal.test.js`

- [ ] **Step 1: Rename service file and class**

Copy `src/server/services/tmux.js` to `src/server/services/terminal.js`. Change the class name:

```js
export class TerminalService {
```

Delete `src/server/services/tmux.js`.

- [ ] **Step 2: Update index.js imports and decorator**

In `src/server/index.js`:

```js
// Change:
import { TmuxService } from './services/tmux.js'
// To:
import { TerminalService } from './services/terminal.js'

// Change:
app.decorate('tmux', new TmuxService())
// To:
app.decorate('terminal', new TerminalService())
```

Also update the WorkerService constructor (will be renamed in Task 3, but update reference now):

```js
// Change:
app.decorate('workerService', new WorkerService(app.tmux, db))
// To:
app.decorate('workerService', new WorkerService(app.terminal, db))
```

- [ ] **Step 3: Update route files that reference `fastify.tmux`**

In `src/server/routes/sessions.js` (line 2):
```js
// Change:
const { tmux } = fastify
// To:
const { terminal } = fastify
```
Then replace all `tmux.` calls with `terminal.` in this file (lines 29, 58, 80, 94).

In `src/server/routes/windows.js` (line 2):
```js
const { terminal } = fastify
```
Replace `tmux.` with `terminal.` (lines 24, 41, 61, 72).

In `src/server/routes/panes.js` (line 2):
```js
const { terminal } = fastify
```
Replace `tmux.` with `terminal.` (lines 29, 48, 70, 82, 101, 113).

- [ ] **Step 4: Rename test file and update references**

Copy `tests/services/tmux.test.js` to `tests/services/terminal.test.js`. Update:
- Import: `import { TerminalService } from '...'` (use path to `src/server/services/terminal.js`)
- All `TmuxService` references → `TerminalService`
- Variable names: `tmux` → `terminal`

Delete `tests/services/tmux.test.js`.

- [ ] **Step 5: Run tests to verify nothing broke**

Run: `npx vitest run tests/services/terminal.test.js`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: rename TmuxService to TerminalService (L1)"
```

---

### Task 2: Rename L1 routes — /api/sessions → /api/terminals

**Files:**
- Rename: `src/server/routes/sessions.js` → `src/server/routes/terminals.js`
- Modify: `src/server/routes/windows.js`
- Modify: `src/server/routes/panes.js`
- Modify: `src/server/index.js`
- Rename: `tests/routes/sessions.test.js` → `tests/routes/terminals.test.js`
- Modify: `tests/routes/windows.test.js`
- Modify: `tests/routes/panes.test.js`

- [ ] **Step 1: Rename sessions.js route file to terminals.js**

Copy `src/server/routes/sessions.js` to `src/server/routes/terminals.js`. In the new file:

1. Rename function: `sessionRoutes` → `terminalRoutes`
2. Change all route paths from `/sessions/...` to `/terminals/...`:
   - `/sessions` → `/terminals`
   - `/sessions/:name` → `/terminals/:terminal`
3. Update `request.params.name` → `request.params.terminal` (lines 80, 94)
4. Update param schema: `{ name: { type: 'string' } }` → `{ terminal: { type: 'string' } }`
5. Update Swagger tags: `'Sessions'` → `'L1 — Terminal (Low-level)'`
6. Update summaries: "session" → "terminal"

Delete `src/server/routes/sessions.js`.

- [ ] **Step 2: Update windows.js routes**

In `src/server/routes/windows.js`:

1. Change all route paths from `/sessions/:session/windows` to `/terminals/:terminal/windows`
2. Update param schemas:
   ```js
   const terminalParam = {
     type: 'object',
     properties: { terminal: { type: 'string' } },
   }
   const terminalWindowParams = {
     type: 'object',
     properties: {
       terminal: { type: 'string' },
       index: { type: 'string' },
     },
   }
   ```
3. Update all `session` param references — both direct access and destructured variables:
   - Line 24: `request.params.session` → `request.params.terminal`
   - Line 41: `request.params.session` → `request.params.terminal`
   - Lines 60-61: `const { session, index } = request.params` → `const { terminal, index } = request.params`, then `tmux.renameWindow(session, ...)` → `terminal.renameWindow(terminal, ...)` (note: `tmux` was already renamed to `terminal` in Task 1, but the destructured `session` variable must also change to `terminal` — rename it to `terminalName` to avoid shadowing the service: `const { terminal: terminalName, index } = request.params`)
   - Lines 72-73: same destructuring pattern — `const { terminal: terminalName, index } = request.params`

   **Important:** Since the destructured param `terminal` would shadow `const { terminal } = fastify`, use `terminal: terminalName` in destructuring throughout windows.js and panes.js.
4. Update Swagger tags: `'Windows'` → `'L1 — Terminal (Low-level)'`

- [ ] **Step 3: Update panes.js routes**

In `src/server/routes/panes.js`:

1. Change all route paths from `/sessions/:session/...` to `/terminals/:terminal/...`
2. Update param schemas:
   ```js
   const paneParams = {
     type: 'object',
     properties: {
       terminal: { type: 'string' },
       window: { type: 'string' },
     },
   }
   const paneIndexParams = {
     type: 'object',
     properties: {
       terminal: { type: 'string' },
       window: { type: 'string' },
       index: { type: 'string' },
     },
   }
   ```
3. Update all `session` param references — every handler destructures `session`:
   - `const { session, window } = request.params` → `const { terminal: terminalName, window } = request.params`
   - `const { session, window, index } = request.params` → `const { terminal: terminalName, window, index } = request.params`
   - Then update all subsequent `session` usages in tmux calls to `terminalName` (e.g., `terminal.listPanes(session, ...)` → `terminal.listPanes(terminalName, ...)`)
   - Affected lines: 28-29, 47-48, 67-70, 80-82, 99-101, 111-113

   **Same pattern as windows.js:** Use `terminal: terminalName` in destructuring to avoid shadowing `const { terminal } = fastify`.
4. Update Swagger tags: `'Panes'` → `'L1 — Terminal (Low-level)'`

- [ ] **Step 4: Update index.js imports**

In `src/server/index.js`:

```js
// Change:
import { sessionRoutes } from './routes/sessions.js'
// To:
import { terminalRoutes } from './routes/terminals.js'

// Change:
await app.register(sessionRoutes, { prefix: '/api' })
// To:
await app.register(terminalRoutes, { prefix: '/api' })
```

- [ ] **Step 5: Rename and update tests**

Rename `tests/routes/sessions.test.js` → `tests/routes/terminals.test.js`:
- Update all `/api/sessions` URLs → `/api/terminals`
- Update param references if any

Update `tests/routes/windows.test.js`:
- All inject URLs: `/api/sessions/.../windows` → `/api/terminals/.../windows`

Update `tests/routes/panes.test.js`:
- All inject URLs: `/api/sessions/.../panes` → `/api/terminals/.../panes`

Delete `tests/routes/sessions.test.js`.

- [ ] **Step 6: Run L1 route tests**

Run: `npx vitest run tests/routes/terminals.test.js tests/routes/windows.test.js tests/routes/panes.test.js`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: rename L1 routes /api/sessions to /api/terminals"
```

---

### Task 3: Rename DatabaseService — tables, columns, methods

> **Note:** After this task, L2 code (WorkerService, route tests) will be broken because it still calls `db.createWorker()` etc. This is expected — Task 4 fixes it. Only run database tests after this task, not L2 tests.

**Files:**
- Modify: `src/server/services/database.js`
- Modify: `tests/services/database.test.js`

- [ ] **Step 1: Update database.js — table creation and migration**

In `src/server/services/database.js`, update `#migrate()`:

1. Add migration for existing databases (rename tables BEFORE creating new ones):
   ```js
   #migrate() {
     // Migrate existing v0.7.0 databases
     const hasWorkers = this.db.prepare(
       "SELECT name FROM sqlite_master WHERE type='table' AND name='workers'"
     ).get()
     if (hasWorkers) {
       this.db.exec('ALTER TABLE workers RENAME TO sessions')
       this.db.exec('ALTER TABLE worker_events RENAME TO session_events')
       this.db.exec('ALTER TABLE session_events RENAME COLUMN worker_id TO session_id')
     }

     this.db.exec(`
       CREATE TABLE IF NOT EXISTS sessions (
         id TEXT PRIMARY KEY,
         name TEXT UNIQUE NOT NULL,
         command TEXT NOT NULL,
         status TEXT NOT NULL DEFAULT 'idle',
         current_task TEXT,
         cwd TEXT,
         event_token TEXT,
         created_at TEXT NOT NULL DEFAULT (datetime('now')),
         updated_at TEXT NOT NULL DEFAULT (datetime('now'))
       )
     `)

     try { this.db.exec('ALTER TABLE sessions ADD COLUMN cwd TEXT') } catch {}
     try { this.db.exec('ALTER TABLE sessions ADD COLUMN event_token TEXT') } catch {}

     this.db.exec(`
       CREATE TABLE IF NOT EXISTS session_events (
         id TEXT PRIMARY KEY,
         session_id TEXT NOT NULL REFERENCES sessions(id),
         type TEXT NOT NULL,
         data TEXT,
         created_at TEXT NOT NULL
       )
     `)
   }
   ```

2. Rename all methods:
   - `createWorker` → `createSession` — update SQL to `INSERT INTO sessions`, return `this.getSession(id)`
   - `getWorker` → `getSession` — update SQL to `SELECT * FROM sessions`
   - `listWorkers` → `listSessions` — update SQL to `SELECT * FROM sessions`
   - `updateStatus` — update SQL to `UPDATE sessions SET ...`
   - `updateTask` — update SQL to `UPDATE sessions SET ...`
   - `createEvent` — change parameter `worker_id` → `session_id`, update SQL column name
   - `getEvent` — update SQL to `SELECT * FROM session_events`
   - `getLastEvent` — rename param `workerId` → `sessionId`, update SQL `WHERE session_id = ?`
   - `listEvents` — rename param `workerId` → `sessionId`, update SQL `WHERE session_id = ?`

- [ ] **Step 2: Update database test file**

In `tests/services/database.test.js`:
- `createWorker` → `createSession`
- `getWorker` → `getSession`
- `listWorkers` → `listSessions`
- `worker_id` → `session_id` in event creation
- Update test descriptions from "worker" to "session"

- [ ] **Step 3: Run database tests**

Run: `npx vitest run tests/services/database.test.js`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/server/services/database.js tests/services/database.test.js
git commit -m "refactor: rename DB tables workers→sessions, methods and columns"
```

---

### Task 4: Rename WorkerService → SessionService

**Files:**
- Rename: `src/server/services/worker.js` → `src/server/services/session.js`
- Modify: `src/server/index.js`
- Rename: `tests/services/worker.test.js` → `tests/services/session.test.js`

- [ ] **Step 1: Rename service file and update class**

Copy `src/server/services/worker.js` to `src/server/services/session.js`. In the new file:

1. Rename class: `WorkerService` → `SessionService`
2. Rename constant: `WORKER_PREFIX = 'worker-'` → `SESSION_PREFIX = 'session-'`
3. Replace all internal variable names: `worker` → `session` (e.g., `const session = this.db.getSession(id)`)
4. Update all `this.db.createWorker` → `this.db.createSession`
5. Update all `this.db.getWorker` → `this.db.getSession`
6. Update all `this.db.listWorkers` → `this.db.listSessions`
7. Update `worker_id: id` → `session_id: id` in `processEvent`
8. Update error messages:
   - `'Worker not found: ${id}'` → `'Session not found: ${id}'`
   - `'Cannot send task to ${session.status} worker'` → `'Cannot send task to ${session.status} session'`
   - `'Worker already stopped'` → `'Session already stopped'`
9. Replace all `WORKER_PREFIX` → `SESSION_PREFIX`

Delete `src/server/services/worker.js`.

- [ ] **Step 2: Update index.js**

In `src/server/index.js`:

```js
// Change:
import { WorkerService } from './services/worker.js'
// To:
import { SessionService } from './services/session.js'

// Change:
app.decorate('workerService', new WorkerService(app.terminal, db))
// To:
app.decorate('sessionService', new SessionService(app.terminal, db))
```

- [ ] **Step 3: Rename and update test file**

Copy `tests/services/worker.test.js` to `tests/services/session.test.js`. Update:
- Import: `import { SessionService } from '../../src/server/services/session.js'`
- Import: `import { TerminalService } from '../../src/server/services/terminal.js'`
- All `WorkerService` → `SessionService`, `TmuxService` → `TerminalService`
- All `workerService` → `sessionService`
- All `worker` variables → `session`
- Constant: `WORKER_PREFIX = 'worker-'` → `SESSION_PREFIX = 'session-'`
- Raw SQL cleanup: `db.db.exec('DELETE FROM worker_events')` → `db.db.exec('DELETE FROM session_events')`
- Raw SQL cleanup: `db.db.exec('DELETE FROM workers')` → `db.db.exec('DELETE FROM sessions')`
- tmux session kill: `` `${WORKER_PREFIX}${w.name}` `` → `` `${SESSION_PREFIX}${s.name}` ``
- DB method calls: `db.listWorkers()` → `db.listSessions()` (in afterEach)
- Error message assertions: "Worker" → "Session"

Delete `tests/services/worker.test.js`.

- [ ] **Step 4: Run service tests**

Run: `npx vitest run tests/services/session.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: rename WorkerService to SessionService (L2)"
```

---

### Task 5: Rename L2 routes — /api/workers → /api/sessions

**Files:**
- Rename: `src/server/routes/workers.js` → `src/server/routes/sessions.js`
- Modify: `src/server/routes/events.js`
- Modify: `src/server/routes/health.js`
- Modify: `src/server/index.js`
- Rename: `tests/routes/workers.test.js` → `tests/routes/sessions.test.js`
- Modify: `tests/routes/events.test.js`
- Modify: `tests/routes/health.test.js`

- [ ] **Step 1: Rename workers.js route file to sessions.js**

Copy `src/server/routes/workers.js` to `src/server/routes/sessions.js`. In the new file:

1. Rename function: `workerRoutes` → `sessionRoutes`
2. Change `const { workerService } = fastify` → `const { sessionService } = fastify`
3. Replace all `workerService.` → `sessionService.`
4. Change all route paths: `/workers` → `/sessions`, `/workers/:id` → `/sessions/:id`
5. Rename `workerSchema` → `sessionSchema`
6. Update Swagger tags: `'Workers'` → `'L2 — Session'`
7. Update summaries: "worker" → "session"
8. Update error message checks: `'not found'`, `'stopped'`, `'failed'`, `'already stopped'` — these are now "Session not found" etc. from the service layer, so string checks still work

Delete `src/server/routes/workers.js`.

- [ ] **Step 2: Update events.js routes**

In `src/server/routes/events.js`:

1. Change `const { workerService } = fastify` → `const { sessionService } = fastify`
2. Replace `workerService.` → `sessionService.`
3. Change route paths: `/workers/:id/events` → `/sessions/:id/events`
4. Update Swagger tags: `'Events'` → `'L2 — Session'`
5. Update summaries: "worker" → "session"

- [ ] **Step 3: Update health.js routes**

In `src/server/routes/health.js`:

1. Change `const { workerService } = fastify` → `const { sessionService } = fastify`
2. Replace `workerService.` → `sessionService.`
3. Change route path: `/health/workers` → `/health/sessions`
4. Update Swagger tags: `'Health'` → `'L2 — Session'`
5. Update summaries: "worker" → "session"

- [ ] **Step 4: Update auth.js plugin**

In `src/server/plugins/auth.js` (line 11):

```js
// Change:
if (request.method === 'POST' && /^\/api\/workers\/[^/]+\/events(\?|$)/.test(request.url)) return
// To:
if (request.method === 'POST' && /^\/api\/sessions\/[^/]+\/events(\?|$)/.test(request.url)) return
```

Update the comment too:
```js
// Events endpoint uses per-session token auth, not API key
```

- [ ] **Step 5: Update index.js imports**

In `src/server/index.js`:

```js
// Change:
import { workerRoutes } from './routes/workers.js'
// To:
import { sessionRoutes } from './routes/sessions.js'

// Change:
await app.register(workerRoutes, { prefix: '/api' })
// To:
await app.register(sessionRoutes, { prefix: '/api' })
```

Note: `sessionRoutes` is now the L2 route function (not L1 — that was renamed to `terminalRoutes` in Task 2).

- [ ] **Step 6: Rename and update test files**

**All L2 test files share a common setup pattern that must be fully updated.** Each file has imports, constants, decorator registrations, and cleanup SQL that reference old names.

Rename `tests/routes/workers.test.js` → `tests/routes/sessions.test.js`. Full update list:
- Import: `import { sessionRoutes } from '../../src/server/routes/sessions.js'`
- Import: `import { TerminalService } from '../../src/server/services/terminal.js'`
- Import: `import { SessionService } from '../../src/server/services/session.js'`
- Constant: `WORKER_PREFIX = 'worker-'` → `SESSION_PREFIX = 'session-'`
- Variables: `let app, tmux, db, workerService` → `let app, terminal, db, sessionService`
- Setup: `tmux = new TmuxService()` → `terminal = new TerminalService()`
- Setup: `workerService = new WorkerService(tmux, db)` → `sessionService = new SessionService(terminal, db)`
- **Decorator:** `app.decorate('tmux', tmux)` → `app.decorate('terminal', terminal)`
- **Decorator:** `app.decorate('workerService', workerService)` → `app.decorate('sessionService', sessionService)`
- Register: `app.register(workerRoutes, ...)` → `app.register(sessionRoutes, ...)`
- Cleanup: `db.listWorkers()` → `db.listSessions()`
- Cleanup: `` `${WORKER_PREFIX}${w.name}` `` → `` `${SESSION_PREFIX}${s.name}` ``
- **Raw SQL:** `db.db.exec('DELETE FROM worker_events')` → `db.db.exec('DELETE FROM session_events')`
- **Raw SQL:** `db.db.exec('DELETE FROM workers')` → `db.db.exec('DELETE FROM sessions')`
- All inject URLs: `/api/workers` → `/api/sessions`
- Error message assertions: "Worker" → "Session"

Update `tests/routes/events.test.js` — same pattern:
- Imports: `TerminalService` from `terminal.js`, `SessionService` from `session.js`
- Constants, variables, decorators, cleanup SQL — same changes as above
- **Decorator:** `app.decorate('workerService', workerService)` → `app.decorate('sessionService', sessionService)`
- All inject URLs: `/api/workers/:id/events` → `/api/sessions/:id/events`

Update `tests/routes/health.test.js` — same pattern:
- Imports, constants, variables, decorators, cleanup SQL — same changes
- **Decorator:** `app.decorate('workerService', workerService)` → `app.decorate('sessionService', sessionService)`
- All inject URLs: `/api/health/workers` → `/api/health/sessions`

Update `tests/plugins/auth.test.js`:
- Any route pattern references from `/api/workers` → `/api/sessions`

Delete `tests/routes/workers.test.js`.

- [ ] **Step 7: Run all L2 route tests**

Run: `npx vitest run tests/routes/sessions.test.js tests/routes/events.test.js tests/routes/health.test.js tests/plugins/auth.test.js`
Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: rename L2 routes /api/workers to /api/sessions"
```

---

### Task 6: Update Swagger plugin with layer-based tags

**Files:**
- Modify: `src/server/plugins/swagger.js`

- [ ] **Step 1: Add tag descriptions to swagger config**

In `src/server/plugins/swagger.js`, add `tags` array to the openapi config:

```js
await fastify.register(swagger, {
  openapi: {
    info: {
      title: 'Foreman API',
      description: 'REST API for managing AI agent sessions via tmux terminals',
      version: '1.0.0',
    },
    tags: [
      {
        name: 'L1 — Terminal (Low-level)',
        description: 'Direct tmux terminal, window, and pane management. Use L2 Session endpoints for most use cases.',
      },
      {
        name: 'L2 — Session',
        description: 'Managed session instances with state tracking, events, and lifecycle management.',
      },
    ],
    components: {
      securitySchemes: {
        apiKey: {
          type: 'apiKey',
          name: 'X-API-Key',
          in: 'header',
        },
      },
    },
    security: [{ apiKey: [] }],
  },
})
```

- [ ] **Step 2: Run full test suite to confirm Swagger still works**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/server/plugins/swagger.js
git commit -m "refactor: reorganize Swagger tags by layer (L1 Terminal, L2 Session)"
```

---

### Task 7: Update frontend API URLs

**Files:**
- Modify: `src/frontend/pages/SessionsPage.jsx`
- Modify: `src/frontend/components/TerminalViewerModal.jsx`

- [ ] **Step 1: Update SessionsPage.jsx**

Change all `/sessions` API calls to `/terminals`:

Line 28: `apiFetch('/sessions')` → `apiFetch('/terminals')`
Line 44: `apiFetch(\`/sessions/${killTarget}\`, ...)` → `apiFetch(\`/terminals/${killTarget}\`, ...)`

Also update the page title from "Sessions" to "Terminals" since this page shows L1 tmux terminals:

Line 60: `<h2>Sessions</h2>` → `<h2>Terminals</h2>`

- [ ] **Step 2: Update TerminalViewerModal.jsx**

Change all `/sessions/` API calls to `/terminals/`:

Line 34: `/sessions/${sessionName}/windows/${win}/panes/${pane}/capture` → `/terminals/${sessionName}/windows/${win}/panes/${pane}/capture`
Line 52: `/sessions/${sessionName}/windows/${win}/panes` → `/terminals/${sessionName}/windows/${win}/panes`
Line 70: `/sessions/${sessionName}/windows` → `/terminals/${sessionName}/windows`

- [ ] **Step 3: Build frontend to verify no errors**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 4: Commit**

```bash
git add src/frontend/pages/SessionsPage.jsx src/frontend/components/TerminalViewerModal.jsx
git commit -m "refactor: update frontend API URLs from /sessions to /terminals"
```

---

### Task 8: Run full test suite

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 2: If any tests fail, fix them**

Common issues to check:
- Stale import paths (old file names)
- Route URL mismatches in test inject calls
- Error message string changes ("Worker" → "Session")
- Decorator name changes (`tmux` → `terminal`, `workerService` → `sessionService`)
- DB method name changes (`createWorker` → `createSession`, etc.)

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve remaining test failures from stack rename"
```

---

### Task 9: Write architecture documentation

**Files:**
- Create: `docs/architecture.md`

- [ ] **Step 1: Write docs/architecture.md**

```markdown
# Foreman Architecture

Foreman is a REST API server for managing AI agent sessions via tmux terminals. It provides a layered abstraction from raw tmux operations up to fleet orchestration.

## Layer Overview

```
┌─────────────────────────────────────────────┐
│  L4: OrchestratorService        [PLANNED]   │
│  Fleet management, recovery, task routing    │
├─────────────────────────────────────────────┤
│  L3: AgentService               [PLANNED]   │
│  Agent definitions (blueprints/templates)    │
├─────────────────────────────────────────────┤
│  L2: SessionService             [ACTIVE]    │
│  Running instances — state, events, lifecycle│
├─────────────────────────────────────────────┤
│  L1: TerminalService            [ACTIVE]    │
│  Raw tmux wrapper — stateless, execFile only │
└─────────────────────────────────────────────┘
```

### Docker Analogy

| Docker | Foreman | Description |
|---|---|---|
| Docker Engine | **TerminalService** (L1) | Low-level runtime (tmux) |
| Container | **Session** (L2) | Running instance with state and events |
| Image | **Agent** (L3, planned) | Reusable blueprint — command, cwd, env |
| Docker Compose | **Orchestrator** (L4, planned) | Multi-session coordination |

## L1 — TerminalService

**File:** `src/server/services/terminal.js`
**Routes:** `/api/terminals`, `/api/terminals/:terminal/windows`, `/api/terminals/:terminal/windows/:window/panes`
**Swagger tag:** `L1 — Terminal (Low-level)`

Stateless wrapper around the tmux binary. Uses `execFile` (never `exec`) with an `ALLOWED_SUBCOMMANDS` whitelist. Knows nothing about sessions, agents, or orchestration.

**Boundary rules:**
- No database access
- No business logic
- Returns parsed tmux output only

## L2 — SessionService

**File:** `src/server/services/session.js`
**Routes:** `/api/sessions`, `/api/sessions/:id/events`, `/api/sessions/:id/task`, `/api/health/sessions`
**Swagger tag:** `L2 — Session`
**Database:** `sessions` table, `session_events` table

Manages running instances. Each session wraps a tmux terminal (named `session-{name}`) and tracks state (`idle`, `running`, `waiting_input`, `error`, `failed`, `stopped`), events, and output.

**Boundary rules:**
- Depends on L1 (TerminalService) for tmux operations
- Depends on DatabaseService for persistence
- No knowledge of agent definitions or orchestration

## L3 — AgentService [PLANNED]

Agent definitions — reusable blueprints that define how to spawn a session. Each agent stores: name, description, command, cwd, environment variables, and configuration.

**Planned routes:** `/api/agents`
**Relationship:** One Agent → many Sessions (like Docker Image → Containers)

## L4 — OrchestratorService [PLANNED]

Fleet coordinator. Monitors sessions, auto-recovers dead ones using agent definitions, routes tasks across available sessions.

## Entity Glossary

| Entity | Layer | Description |
|---|---|---|
| Terminal | L1 | A tmux session with windows and panes |
| Session | L2 | A managed running instance with identity, state, and events |
| Agent | L3 | A reusable blueprint for spawning sessions |
| Event | L2 | A lifecycle event on a session |
| Task | L3/L4 | A unit of work assigned to a session |

## Authentication

- **API key** (`X-API-Key` header) — for all `/api/*` routes except event POST
- **Bearer token** (`Authorization: Bearer`) — validated against accounts service
- **Event token** (query param `?token=`) — per-session token for event ingestion from Claude Code hooks

## API Reference

Swagger UI available at `/docs` when `SWAGGER_ENABLED=true`. Routes are organized by layer tags.
```

- [ ] **Step 2: Commit**

```bash
git add docs/architecture.md
git commit -m "docs: add architecture guide with 4-layer overview"
```

---

### Task 10: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update project structure section**

Update file paths and service names throughout CLAUDE.md:
- `services/tmux.js` → `services/terminal.js` with `TerminalService`
- `services/worker.js` → `services/session.js` with `SessionService`
- `routes/sessions.js` → `routes/terminals.js` (L1 terminal CRUD)
- `routes/workers.js` → `routes/sessions.js` (L2 session CRUD)
- Add note about route prefix changes
- Update test file paths in testing section
- Update "Key Architecture Decisions" to reference new layer names
- Update "Future Direction" to reference the 4-layer architecture

- [ ] **Step 2: Run all tests one final time**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with new layer naming and file paths"
```
