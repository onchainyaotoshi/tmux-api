# Worker API Layer — Design Spec

## Overview

A higher-level abstraction on top of Foreman's existing tmux API that simplifies managing AI agent workers. Instead of manually creating sessions/windows/panes, users interact with "workers" — each backed by a single tmux session running a configurable command.

**Goal:** Evolve Foreman from a tmux REST API into an AI workforce manager with persistent state, health monitoring, and eventual autonomous orchestration.

**Approach:** Two-phase rollout. Phase 1 builds the foundation (WorkerService + SQLite + REST API). Phase 2 adds autonomous orchestration on top without rewriting Phase 1.

## Phase 1: Worker Service + REST API

### Worker Lifecycle State Machine

```
States:  spawning → idle → running → failed → stopped

Transitions:
  POST /api/workers          → spawning → idle (optimistic: immediate after createSession + sendKeys succeed)
  POST /api/workers/:id/task → idle|running → running
  Worker process exits       → running → failed (detected by health check)
  DELETE /api/workers/:id    → any → stopped
  Auto-recovery (phase 2)    → failed → spawning

Invalid transitions (return 409 Conflict):
  Send task to stopped worker
  Send task to failed worker (must be recovered first)
  Delete already-stopped worker
```

**Spawning → Idle transition:** Optimistic. Once `createSession` and `sendKeys(command + Enter)` succeed without error, status moves to `idle` immediately. There is no output polling to confirm the command started — that is Phase 2 orchestrator territory.

### SQLite Schema

Single `workers` table:

| Column        | Type    | Notes                                      |
|---------------|---------|--------------------------------------------|
| id            | TEXT PK | UUID                                       |
| name          | TEXT UQ | Unique, becomes tmux session `worker-{name}` |
| command       | TEXT    | e.g. `claude`, `aider`, `python script.py` |
| status        | TEXT    | enum: spawning, idle, running, failed, stopped |
| current_task  | TEXT    | Nullable — last input sent via send-keys   |
| created_at    | TEXT    | ISO 8601 timestamp                         |
| updated_at    | TEXT    | ISO 8601 timestamp                         |
Database file: `data/foreman.db` (auto-created). Must add `data/` to `.gitignore`.

### REST API Endpoints

```
POST   /api/workers              → Spawn worker
  Body: { name, command }
  Validation:
    name: pattern ^[a-zA-Z0-9_-]+$, minLength 1, maxLength 128
    command: minLength 1, maxLength 4096
  Response 201: { id, name, command, status: "idle" }

GET    /api/workers              → List all workers + status
  Query: ?status=running (optional filter)
  Response 200: [{ id, name, command, status, current_task, created_at }]

GET    /api/workers/:id          → Worker detail + recent output
  Response 200: { id, name, command, status, current_task, output, created_at }
  (output = captured pane content)

POST   /api/workers/:id/task     → Send task to worker
  Body: { input }
  Validation: input maxLength 4096
  Response 200: { id, status: "running", current_task: input }
  Response 409: worker is stopped or failed

DELETE /api/workers/:id          → Kill worker
  Response 200: { id, status: "stopped" }
  Response 404: worker not found

GET    /api/workers/:id/health   → Health check single worker
  Response 200: { id, status, alive: bool, last_activity_at }

GET    /api/health/workers       → Health check all workers
  Response 200: [{ id, name, status, alive, last_activity_at }]
```

**Error codes:** 400 (validation), 404 (worker not found), 409 (invalid state transition), 500 (database/tmux failure).

**Route ordering note:** Bulk health endpoint uses `/api/health/workers` instead of `/api/workers/health` to avoid collision with the parametric `/:id` route.

### Internal Mapping (Worker → Tmux)

| Worker Action | TmuxService Call |
|---------------|------------------|
| Spawn         | `createSession("worker-{name}")` + `sendKeys(command + " Enter")` |
| Send task     | `sendKeys(input + " Enter")` to pane 0, window 0 |
| Get output    | `capturePane()` |
| Kill          | `killSession()` |
| Health check  | `hasSession("worker-{name}")` (add `has-session` to ALLOWED_SUBCOMMANDS) |

**Important:** `sendKeys` must append tmux `Enter` literal to execute commands. Without it, text is typed but never submitted.

**`has-session` optimization:** O(1) check vs O(n) `listSessions` + filter. Requires adding `has-session` to the whitelist in `tmux.js`.

### Architecture & File Structure

```
src/server/
  services/
    tmux.js              ← existing, untouched
    worker.js            ← NEW: WorkerService class
    database.js          ← NEW: SQLite wrapper (better-sqlite3)
  routes/
    sessions.js          ← existing, untouched
    windows.js           ← existing, untouched
    panes.js             ← existing, untouched
    workers.js           ← NEW: /api/workers routes
  plugins/
    auth.js              ← existing, untouched
    swagger.js           ← existing, untouched
  index.js               ← modified: register worker routes + database

tests/
  services/
    worker.test.js       ← NEW
    database.test.js     ← NEW
  routes/
    workers.test.js      ← NEW

data/
  foreman.db             ← SQLite database file (gitignored)
```

**Key decisions:**
- `WorkerService` depends on `TmuxService` + `DatabaseService` — injected via Fastify decorators.
- `DatabaseService` is a thin wrapper: `init()`, `getWorker()`, `listWorkers()`, `upsertWorker()`, `updateStatus()`.
- Database auto-created on first run. Schema migration embedded in `DatabaseService.init()`.
- Existing low-level API (`/api/sessions`, `/windows`, `/panes`) remains untouched and available.
- Worker names prefixed with `worker-` in tmux to avoid collision with manually created sessions.
- All responses follow existing envelope pattern: `{ success: true, data: ... }`.
- All routes include JSON Schema for validation and Swagger auto-generation.
- `better-sqlite3` chosen over JSON file for atomic writes, crash safety, and query capability.
- Use `crypto.randomUUID()` (Node.js 20+ built-in) instead of `uuid` package.
- Stopped workers remain in database for history. Phase 2 orchestrator can add purge logic.

## Phase 2: Autonomous Orchestrator

### New Files

```
src/server/
  services/
    orchestrator.js      ← NEW: OrchestratorService class
    task-queue.js         ← NEW: persistent task queue (SQLite)
  routes/
    orchestrator.js       ← NEW: /api/orchestrator routes
```

### OrchestratorService Responsibilities

- **Health monitor loop** — periodic check (configurable interval, default 30s), detect failed workers.
- **Auto-recovery** — respawn failed workers up to `max_retries`, re-send last `current_task`.
- **Task queue** — accept tasks, auto-dispatch to idle workers or spawn new worker if pool under capacity.
- **Pool management** — configurable `min_workers`, `max_workers`, auto-scale.

### Orchestrator API

```
POST   /api/orchestrator/tasks        → Submit task to queue (auto-dispatched)
GET    /api/orchestrator/tasks        → List queued/active/completed tasks
GET    /api/orchestrator/status       → Pool overview: total, idle, running, failed
PUT    /api/orchestrator/config       → Update pool config (min/max workers, interval)
POST   /api/orchestrator/start        → Start the monitor loop
POST   /api/orchestrator/stop         → Stop the monitor loop
```

### Additional SQLite Tables

**tasks:**

| Column             | Type    | Notes                                    |
|--------------------|---------|------------------------------------------|
| id                 | TEXT PK | UUID                                     |
| input              | TEXT    | Task content                             |
| status             | TEXT    | enum: queued, dispatched, completed, failed |
| assigned_worker_id | TEXT FK | Nullable, references workers.id          |
| created_at         | TEXT    | ISO 8601                                 |
| completed_at       | TEXT    | Nullable                                 |

**orchestrator_config:**

| Column | Type | Notes               |
|--------|------|---------------------|
| key    | TEXT PK | Config key        |
| value  | TEXT | Config value         |

Default config: `min_workers=0`, `max_workers=10`, `health_interval=30000`, `default_command=claude`.

**Note:** Phase 2 may use environment variables instead of this table if runtime mutability is not needed. Decision deferred.

### Orchestrator Flow

```
Task submitted → queued in tasks table
  → Orchestrator picks idle worker (or spawns new if under max_workers)
  → Dispatch via WorkerService.sendTask()
  → Monitor output periodically
  → Mark task completed or failed
  → If worker dies mid-task → auto-respawn → re-dispatch task
  → If retries exhausted → mark worker failed, re-queue task for another worker
```

### Additional SQLite Tables (Phase 2)

**workers table additions (migration):**

| Column        | Type    | Notes                                      |
|---------------|---------|--------------------------------------------|
| retry_count   | INTEGER | Default 0                                  |
| max_retries   | INTEGER | Default 3                                  |

These columns are added in Phase 2 via migration, not Phase 1. YAGNI.

## Dependencies

| Package        | Purpose                    | Phase |
|----------------|----------------------------|-------|
| better-sqlite3 | SQLite persistence         | 1     |

## What This Spec Does NOT Cover

- Dashboard UI (separate spec: `2026-03-22-dashboard-rewrite-design.md`)
- WebSocket real-time updates (future enhancement)
- Multi-node / distributed orchestration (single server only)
- Authentication changes (reuses existing auth plugin)
