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
  POST /api/workers          → spawning → idle
  POST /api/workers/:id/task → idle|running → running
  Worker process exits       → running → failed (detected by health check)
  DELETE /api/workers/:id    → any → stopped
  Auto-recovery (phase 2)    → failed → spawning
```

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
| retry_count   | INTEGER | Default 0, used in phase 2                 |
| max_retries   | INTEGER | Default 3, used in phase 2                 |

Database file: `data/foreman.db` (auto-created, gitignored).

### REST API Endpoints

```
POST   /api/workers              → Spawn worker
  Body: { name, command, args? }
  Response: { id, name, command, status: "spawning" }

GET    /api/workers              → List all workers + status
  Query: ?status=running (optional filter)
  Response: [{ id, name, command, status, current_task, created_at }]

GET    /api/workers/:id          → Worker detail + recent output
  Response: { id, name, command, status, current_task, output, created_at }
  (output = captured pane content)

POST   /api/workers/:id/task     → Send task to worker
  Body: { input }
  Response: { id, status: "running", current_task: input }

DELETE /api/workers/:id          → Kill worker
  Response: { id, status: "stopped" }

GET    /api/workers/:id/health   → Health check single worker
  Response: { id, status, alive: bool, last_activity_at }

GET    /api/workers/health       → Health check all workers
  Response: [{ id, name, status, alive, last_activity_at }]
```

### Internal Mapping (Worker → Tmux)

| Worker Action | TmuxService Call |
|---------------|------------------|
| Spawn         | `createSession("worker-{name}")` + `sendKeys(command)` |
| Send task     | `sendKeys(input)` to pane 0, window 0 |
| Get output    | `capturePane()` |
| Kill          | `killSession()` |
| Health check  | `listSessions()`, check if `worker-{name}` exists |

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

## Dependencies

| Package        | Purpose                    | Phase |
|----------------|----------------------------|-------|
| better-sqlite3 | SQLite persistence         | 1     |
| uuid           | Worker ID generation       | 1     |

## What This Spec Does NOT Cover

- Dashboard UI (separate spec: `2026-03-22-dashboard-rewrite-design.md`)
- WebSocket real-time updates (future enhancement)
- Multi-node / distributed orchestration (single server only)
- Authentication changes (reuses existing auth plugin)
