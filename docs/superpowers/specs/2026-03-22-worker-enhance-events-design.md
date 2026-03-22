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

1. Create tmux session `worker-{name}`
2. If `cwd` provided: `sendKeys('cd /home/claude/projects/my-app')` + `sendKeys('Enter')`
3. Brief delay to let `cd` complete
4. `sendKeys('claude --model opus')` + `sendKeys('Enter')`
5. Save to SQLite (including `cwd`)

### Schema Change

Add `cwd` column to `workers` table:

| Column | Type | Notes |
|---|---|---|
| cwd | TEXT | Nullable, absolute path |

Migration: `ALTER TABLE workers ADD COLUMN cwd TEXT`

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

**Authentication:** Public endpoint (no API key required). Reason: Claude Code HTTP hooks cannot easily inject API keys. Scoped to valid worker IDs only — unknown IDs return 404.

**Validation:**
- `type`: required string, minLength 1, maxLength 256
- `data`: optional object (free-form JSON, stored as stringified text)

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

| Event type | Worker status |
|---|---|
| `notification` | `waiting_input` |
| `stop` | `idle` |
| `stop_failure` | `error` |
| `tool_use` | `running` |
| Any other type | No status change (event stored only) |

The `waiting_input` status is new — added to the worker lifecycle.

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

`last_event` is the most recent event, or null if no events received.

## 3. Claude Code Hooks Integration (Example)

This is NOT implemented by Foreman — it's documentation for users on how to configure Claude Code to report to Foreman.

Example `.claude/settings.local.json` in a project directory:

```json
{
  "hooks": {
    "Notification": [{
      "hooks": [{
        "type": "http",
        "url": "http://localhost:9993/api/workers/WORKER_ID/events",
        "timeout": 5
      }]
    }],
    "Stop": [{
      "hooks": [{
        "type": "http",
        "url": "http://localhost:9993/api/workers/WORKER_ID/events",
        "timeout": 5
      }]
    }],
    "StopFailure": [{
      "hooks": [{
        "type": "http",
        "url": "http://localhost:9993/api/workers/WORKER_ID/events",
        "timeout": 5
      }]
    }],
    "PreToolUse": [{
      "hooks": [{
        "type": "http",
        "url": "http://localhost:9993/api/workers/WORKER_ID/events",
        "timeout": 5,
        "async": true
      }]
    }]
  }
}
```

**Note:** The hook HTTP POST body is constructed by Claude Code automatically — it includes `hook_event_name`, `session_id`, and event-specific fields. Foreman's events endpoint maps `hook_event_name` to event `type`.

## 4. File Changes

```
MODIFY: src/server/services/database.js    — add cwd column migration, worker_events table, event CRUD
MODIFY: src/server/services/worker.js      — spawn with cwd, processEvent method
CREATE: src/server/routes/events.js        — POST /api/workers/:id/events (public)
MODIFY: src/server/routes/workers.js       — add cwd to spawn schema, add GET events listing
MODIFY: src/server/index.js               — register events route (before auth plugin)
```

## 5. What This Spec Does NOT Cover

- Auto-configuring hooks in project folders (user responsibility)
- SDK / client library (deferred)
- WebSocket streaming (Phase 2)
- Scrollback capture enhancement (can be added independently)
- Specific agent presets or patterns (agent-agnostic by design)
