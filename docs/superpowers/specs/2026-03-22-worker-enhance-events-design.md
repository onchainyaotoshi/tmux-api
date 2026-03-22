# Worker Enhancement + Events — Design Spec

## Overview

Enhance the existing Worker API (v0.5.0) with two capabilities:
1. **Working directory support** — workers start in a specific project folder
2. **Events endpoint** — external agents (Claude Code hooks, scripts, etc.) can report state changes to Foreman

These changes make workers useful for managing real AI agent workflows where the agent needs project context and Foreman needs to know what the agent is doing.

## 1. Enhanced Spawn — `cwd` Field

### API Change

```
POST /api/workers
{
  "name": "auth-worker",
  "command": "claude --model opus",
  "cwd": "/home/claude/projects/my-app"    ← NEW (optional)
}
```

**Validation:**
- `cwd`: optional string, must be absolute path (starts with `/`), maxLength 4096
- If omitted, worker starts in tmux default directory (home)

### Spawn Flow (updated)

1. Create tmux session `worker-{name}` with optional `-c <cwd>` flag (tmux built-in working directory)
2. `sendKeys('claude --model opus')` + `sendKeys('Enter')`
3. Save to SQLite (including `cwd`)

**Implementation:** `TmuxService.createSession(name, cwd?)` adds `-c <cwd>` arg to `tmux new-session`. This sets the working directory atomically — no race condition, no `cd` + delay hack. If `cwd` doesn't exist, tmux returns an error that gets caught.

### Schema Change

Add columns to `workers` table:

| Column | Type | Notes |
|---|---|---|
| cwd | TEXT | Nullable, absolute path |
| event_token | TEXT | UUID, generated on spawn, for events auth |

Migration: `ALTER TABLE workers ADD COLUMN cwd TEXT` + `ALTER TABLE workers ADD COLUMN event_token TEXT`

**DatabaseService changes:** `createWorker()` must accept and store `cwd` and `event_token`. Add `createEvent()`, `getLastEvent(workerId)`, `listEvents(workerId, limit)` methods. `JSON.stringify()` on write, `JSON.parse()` on read for `data` field.

## 2. Events Endpoint

### Purpose

Allow external agents to report state changes to Foreman. Agent-agnostic — works with Claude Code hooks, Codex wrappers, custom scripts, or manual curl.

### API

```
POST /api/workers/:id/events
{
  "type": "notification",
  "data": { "message": "Permission needed", "notification_type": "permission_prompt" }
}

Response 201: { success: true, data: { id, worker_id, type, data, created_at } }
Response 404: worker not found
```

**Authentication:** Per-worker token. When a worker is spawned, Foreman generates a `event_token` (UUID) stored in the workers table. The events endpoint requires this token via query param or header:

```
POST /api/workers/:id/events?token=<event_token>
```

This token is injected as environment variable `FOREMAN_EVENT_TOKEN` in the tmux session, so hooks can reference it. Unknown IDs return 404, invalid token returns 403.

**Threat model:** Localhost-only access (Docker binds 127.0.0.1). Token prevents accidental state manipulation from other processes. Not designed to resist a determined attacker with localhost access.

**Validation:**
- `type`: required string, minLength 1, maxLength 256
- `data`: optional object (free-form JSON, max 8KB when stringified, stored as TEXT)

### Events SQLite Table

```sql
CREATE TABLE IF NOT EXISTS worker_events (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES workers(id),
  type TEXT NOT NULL,
  data TEXT,
  created_at TEXT NOT NULL
)
```

### Worker State Mapping

When an event is received, Foreman updates the worker's status based on event type:

**Hook event name normalization:** The route handler normalizes Claude Code's `hook_event_name` before storing:

| Claude Code `hook_event_name` | Stored `type` |
|---|---|
| `Notification` | `notification` |
| `Stop` | `stop` |
| `StopFailure` | `stop_failure` |
| `PreToolUse` | `tool_use` |
| Any other / direct POST | stored as-is (lowercase) |

**State mapping** — worker status updated from event type:

| Event type | Worker status |
|---|---|
| `notification` | `waiting_input` |
| `stop` | `idle` |
| `stop_failure` | `error` |
| `tool_use` | `running` |
| Any other type | No status change (event stored only) |

The `waiting_input` and `error` statuses are new — added to the worker lifecycle.

### Updated Worker Lifecycle

```
States: idle → running → waiting_input → idle → ... → failed/stopped/error

Transitions:
  POST /api/workers              → idle
  POST /api/workers/:id/task     → running
  Event: tool_use                → running
  Event: notification            → waiting_input
  Event: stop                    → idle
  Event: stop_failure            → error
  Worker process exits           → failed (health check)
  DELETE /api/workers/:id        → stopped
```

### Event History Endpoint

```
GET /api/workers/:id/events
Query: ?limit=50 (default 50, max 200)

Response 200: { success: true, data: [{ id, type, data, created_at }, ...] }
```

Returns events newest-first. Requires API key auth.

### Enhanced Worker Detail

```
GET /api/workers/:id
Response: {
  id, name, command, cwd, status, current_task, output,
  last_event: { id, type, data, created_at },     ← NEW
  created_at, updated_at
}
```

`last_event` is the most recent event, or null if no events received. Retrieved via `db.getLastEvent(workerId)` in `WorkerService.get()`.

**Status enum update:** The `GET /api/workers?status=` query param must be updated to include `waiting_input` and `error` in the allowed enum values.

## 3. Claude Code Hooks Integration (Example)

This is NOT implemented by Foreman — it's documentation for users on how to configure Claude Code to report to Foreman.

Example `.claude/settings.local.json` in a project directory:

```json
{
  "hooks": {
    "Notification": [{
      "hooks": [{
        "type": "http",
        "url": "http://localhost:9993/api/workers/WORKER_ID/events?token=EVENT_TOKEN",
        "timeout": 5
      }]
    }],
    "Stop": [{
      "hooks": [{
        "type": "http",
        "url": "http://localhost:9993/api/workers/WORKER_ID/events?token=EVENT_TOKEN",
        "timeout": 5
      }]
    }],
    "StopFailure": [{
      "hooks": [{
        "type": "http",
        "url": "http://localhost:9993/api/workers/WORKER_ID/events?token=EVENT_TOKEN",
        "timeout": 5
      }]
    }],
    "PreToolUse": [{
      "hooks": [{
        "type": "http",
        "url": "http://localhost:9993/api/workers/WORKER_ID/events?token=EVENT_TOKEN",
        "timeout": 5,
        "async": true
      }]
    }]
  }
}
```

**Note:** The hook HTTP POST body is constructed by Claude Code automatically — it includes `hook_event_name`, `session_id`, and event-specific fields. Foreman's events route normalizes `hook_event_name` to lowercase event `type` before storing. `WORKER_ID` and `EVENT_TOKEN` should be replaced with actual values from the spawn response.

## 4. File Changes

```
MODIFY: src/server/services/tmux.js        — createSession accepts optional cwd param (-c flag)
MODIFY: src/server/services/database.js    — add cwd + event_token columns, worker_events table, event CRUD methods
MODIFY: src/server/services/worker.js      — spawn with cwd + event_token, processEvent method
CREATE: src/server/routes/events.js        — POST + GET /api/workers/:id/events
MODIFY: src/server/routes/workers.js       — add cwd to spawn schema, update status enum
MODIFY: src/server/plugins/auth.js         — skip auth for POST /api/workers/:id/events (token-based auth handled in route)
MODIFY: src/server/index.js               — register events route
```

**Auth bypass for events:** The auth plugin (`plugins/auth.js`) must skip API key/Bearer checks for `POST /api/workers/:id/events`. The events route handles its own auth via per-worker `event_token` query param.

**Event retention:** No automatic cleanup in this phase. Noted as future concern — for long-running workers with frequent tool_use events, consider max 1000 events per worker or TTL-based cleanup.

## 5. What This Spec Does NOT Cover

- Auto-configuring hooks in project folders (user responsibility)
- SDK / client library (deferred)
- WebSocket streaming (Phase 2)
- Scrollback capture enhancement (can be added independently)
- Specific agent presets or patterns (agent-agnostic by design)
