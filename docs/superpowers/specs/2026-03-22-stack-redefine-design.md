# Stack Redefine — Design Spec

**Date:** 2026-03-22
**Status:** Draft
**Approach:** C — Incremental rename + docs (L1-L2 implement, L3-L4 documented as planned)

## Overview

Redefine Foreman's abstraction layers with clear naming conventions inspired by Docker's Image → Container model. Rename existing services and routes to match the new naming, reorganize Swagger tags by layer, and write developer + consumer-facing architecture documentation.

No new functionality is added — this is a rename + documentation effort that establishes a clean foundation for future Agent and Orchestrator layers.

## Layer Architecture

```
┌─────────────────────────────────────────────┐
│  L4: OrchestratorService        [PLANNED]   │
│  Fleet management, recovery, task routing    │
├─────────────────────────────────────────────┤
│  L3: AgentService               [PLANNED]   │
│  Agent definitions (blueprints/templates)    │
├─────────────────────────────────────────────┤
│  L2: SessionService             [IMPLEMENT] │
│  Running instances — state, events, lifecycle│
├─────────────────────────────────────────────┤
│  L1: TerminalService            [IMPLEMENT] │
│  Raw tmux wrapper — stateless, no business  │
│  logic, execFile only                       │
└─────────────────────────────────────────────┘
```

### Layer Boundary Rules

- **L1** knows nothing about L2+. Pure tmux binary wrapper. Stateless.
- **L2** depends on L1. SessionService calls TerminalService to create/kill tmux sessions.
- **L3** (planned) depends on L2. AgentService will call SessionService.spawn() with config from agent definition.
- **L4** (planned) depends on L3 + L2. OrchestratorService will monitor sessions and use agent definitions for respawn.

### Docker Analogy

| Docker | Foreman | Description |
|---|---|---|
| Dockerfile | Agent definition in DB | Recipe — command, cwd, env |
| Image | **Agent** (L3) | Built, versioned, reusable blueprint |
| Container | **Session** (L2) | Running instance of an agent |
| Docker Engine | **TerminalService** (L1) | Low-level runtime (tmux) |
| Docker Compose / Swarm | **OrchestratorService** (L4) | Multi-session coordination |

### Entity Glossary

| Entity | Layer | Description |
|---|---|---|
| **Terminal** | L1 | A tmux session. Raw process with windows and panes. |
| **Session** | L2 | A managed running instance with identity, state, events, and lifecycle. Wraps a terminal. |
| **Agent** | L3 (planned) | A reusable blueprint defining how to spawn a session — command, cwd, env, description. |
| **Orchestrator** | L4 (planned) | Fleet coordinator — auto-recovery, health monitoring, task routing across sessions. |
| **Event** | L2 | A lifecycle event on a session (state change, output, error). |
| **Task** | L3/L4 (planned) | A unit of work assigned to a session. |

## Route Rename Mapping

### L1 — Terminal (Low-level)

Routes are public but tagged as low-level in Swagger. Docs recommend using L2 for most cases.

Note: `sessions.js` currently uses `:name` as the param, while `windows.js` and `panes.js` use `:session`. All will be unified to `:terminal`. Route handlers referencing `request.params.session` or `request.params.name` must update to `request.params.terminal`.

| Current | New |
|---|---|
| `GET /api/sessions` | `GET /api/terminals` |
| `POST /api/sessions` | `POST /api/terminals` |
| `PUT /api/sessions/:name` | `PUT /api/terminals/:terminal` |
| `DELETE /api/sessions/:name` | `DELETE /api/terminals/:terminal` |
| `GET /api/sessions/:session/windows` | `GET /api/terminals/:terminal/windows` |
| `POST /api/sessions/:session/windows` | `POST /api/terminals/:terminal/windows` |
| `PUT /api/sessions/:session/windows/:index` | `PUT /api/terminals/:terminal/windows/:index` |
| `DELETE /api/sessions/:session/windows/:index` | `DELETE /api/terminals/:terminal/windows/:index` |
| `GET /api/sessions/:session/windows/:window/panes` | `GET /api/terminals/:terminal/windows/:window/panes` |
| `POST /api/sessions/:session/windows/:window/panes` | `POST /api/terminals/:terminal/windows/:window/panes` |
| `PUT .../panes/:index/resize` | `PUT /api/terminals/:terminal/windows/:window/panes/:index/resize` |
| `DELETE .../panes/:index` | `DELETE /api/terminals/:terminal/windows/:window/panes/:index` |
| `POST .../panes/:index/send-keys` | `POST /api/terminals/:terminal/windows/:window/panes/:index/send-keys` |
| `GET .../panes/:index/capture` | `GET /api/terminals/:terminal/windows/:window/panes/:index/capture` |

Note: No single-session GET route exists in L1 currently. There is no `GET /api/sessions/:name`. If needed in the future, it would be `GET /api/terminals/:terminal`.

### L2 — Session

| Current | New |
|---|---|
| `GET /api/workers` | `GET /api/sessions` |
| `POST /api/workers` | `POST /api/sessions` |
| `GET /api/workers/:id` | `GET /api/sessions/:id` |
| `POST /api/workers/:id/task` | `POST /api/sessions/:id/task` |
| `DELETE /api/workers/:id` | `DELETE /api/sessions/:id` |
| `GET /api/workers/:id/events` | `GET /api/sessions/:id/events` |
| `POST /api/workers/:id/events` | `POST /api/sessions/:id/events` |
| `GET /api/health/workers` | `GET /api/health/sessions` |
| `GET /api/workers/:id/health` | `GET /api/sessions/:id/health` |

### L3 — Agent [PLANNED]

- `GET /api/agents` — list agent definitions
- `POST /api/agents` — create agent definition
- `GET /api/agents/:id` — get agent definition
- `PUT /api/agents/:id` — update agent definition
- `DELETE /api/agents/:id` — delete agent definition

### L4 — Orchestrator [PLANNED]

TBD.

## Service Rename Mapping

### Files

| Current | New |
|---|---|
| `src/server/services/tmux.js` | `src/server/services/terminal.js` |
| `src/server/services/worker.js` | `src/server/services/session.js` |
| `src/server/routes/sessions.js` | `src/server/routes/terminals.js` |
| `src/server/routes/windows.js` | `src/server/routes/windows.js` (stays, nested under terminals) |
| `src/server/routes/panes.js` | `src/server/routes/panes.js` (stays, nested under terminals) |
| `src/server/routes/workers.js` | `src/server/routes/sessions.js` |
| `src/server/routes/events.js` | `src/server/routes/events.js` (stays, update internal references + route prefix) |
| `src/server/routes/health.js` | `src/server/routes/health.js` (stays, update internal references + route prefix) |
| `src/server/plugins/auth.js` | stays (update hardcoded `/api/workers/` regex to `/api/sessions/`) |

### Classes

| Current | New |
|---|---|
| `TmuxService` | `TerminalService` |
| `WorkerService` | `SessionService` |

### Fastify Decorators

| Current | New |
|---|---|
| `fastify.tmux` | `fastify.terminal` |
| `fastify.workerService` | `fastify.sessionService` |
| `fastify.db` | `fastify.db` (stays) |

### Tests

| Current | New |
|---|---|
| `tests/services/tmux.test.js` | `tests/services/terminal.test.js` |
| `tests/routes/sessions.test.js` | `tests/routes/terminals.test.js` |
| `tests/routes/windows.test.js` | stays (update internal references) |
| `tests/routes/panes.test.js` | stays (update internal references) |
| `tests/routes/workers.test.js` | `tests/routes/sessions.test.js` |
| `tests/routes/events.test.js` | stays (update internal references) |
| `tests/routes/health.test.js` | stays (update internal references) |
| `tests/services/worker.test.js` | `tests/services/session.test.js` |
| `tests/services/database.test.js` | stays (update table/column references) |
| `tests/plugins/auth.test.js` | stays (update route pattern references) |

### Database

| Current | New |
|---|---|
| `workers` table | `sessions` table |
| `worker_events` table | `session_events` table |
| `worker_id` column | `session_id` column |

### Internal Naming

| Current | New |
|---|---|
| tmux session prefix `worker-{name}` | `session-{name}` |
| `event_token` column | stays (not worker-specific terminology — applies equally to sessions) |
| `ALLOWED_SUBCOMMANDS` constant | stays (tmux-specific, not affected by rename) |

### DatabaseService Methods

| Current | New |
|---|---|
| `createWorker(name, command, cwd)` | `createSession(name, command, cwd)` |
| `getWorker(id)` | `getSession(id)` |
| `listWorkers(status)` | `listSessions(status)` |
| `updateStatus(id, status)` | stays |
| `updateTask(id, task)` | stays |
| `createEvent(workerId, type, data)` | `createEvent(sessionId, type, data)` |
| `getLastEvent(workerId)` | `getLastEvent(sessionId)` |
| `listEvents(workerId, limit)` | `listEvents(sessionId, limit)` |

### SessionService (was WorkerService) Methods

Method names stay as-is (`spawn`, `processEvent`, `sendTask`, `getOutput`, `kill`, `checkHealth`, `checkAllHealth`, `list`, `get`). However, all user-facing error messages must update from "Worker" to "Session":

| Current | New |
|---|---|
| `"Worker not found: ${id}"` | `"Session not found: ${id}"` |
| `"Cannot send task to ${worker.status} worker"` | `"Cannot send task to ${session.status} session"` |
| Other `worker` references in error strings | Replace with `session` |

Internal variable names (e.g., `const worker = this.db.getWorker(id)`) should also be renamed to `session` for consistency.

### Auth Plugin

`src/server/plugins/auth.js` has a hardcoded regex exempting event POST routes from API key auth:

| Current | New |
|---|---|
| `/^\/api\/workers\/[^/]+\/events(\?\|$)/` | `/^\/api\/sessions\/[^/]+\/events(\?\|$)/` |

This is critical — if missed, event ingestion from Claude Code hooks will break silently (events will require API key auth instead of token auth).

### Frontend

| File | Change |
|---|---|
| `src/frontend/pages/SessionsPage.jsx` | Update API URL from `/sessions` to `/terminals` |
| Other frontend files referencing `/api/sessions` | Update to `/api/terminals` |

### Database Migration

Use SQLite `ALTER TABLE ... RENAME TO` (supported since SQLite 3.25.0):

```sql
ALTER TABLE workers RENAME TO sessions;
ALTER TABLE worker_events RENAME TO session_events;
ALTER TABLE session_events RENAME COLUMN worker_id TO session_id;
```

No data loss. Existing records preserved. Applied in `DatabaseService.#migrate()`.

## Swagger Reorganization

Current tags (`Sessions`, `Windows`, `Panes`, `Workers`, `Events`, `Health`) collapse into layer-based tags. Each route file's schema `tags` array must use the exact tag string.

| Current Tags | New Tag | Routes |
|---|---|---|
| `Sessions`, `Windows`, `Panes` | `L1 — Terminal (Low-level)` | All terminal, window, pane routes |
| `Workers`, `Events`, `Health` | `L2 — Session` | All session, event, health routes |

Tag descriptions (in swagger plugin config):
- **`L1 — Terminal (Low-level)`**: Direct tmux terminal, window, and pane management. Use L2 Session endpoints for most use cases.
- **`L2 — Session`**: Managed session instances with state tracking, events, and lifecycle management.
- **`L3 — Agent`** (future): Agent definitions — reusable blueprints for spawning sessions.
- **`L4 — Orchestrator`** (future): Fleet management, auto-recovery, and task routing.

## Architecture Documentation

### `docs/architecture.md`

Developer + consumer-facing guide containing:
- Layer overview diagram (L1-L4)
- Each layer: responsibility, boundary rules, what it knows / doesn't know
- Entity glossary: Agent, Session, Terminal, Task, Event
- Docker analogy mapping
- Current state vs planned (L1-L2 implemented, L3-L4 planned)
- API reference note: Swagger UI is the source of truth for endpoints

### API Reference

No separate markdown API doc. Swagger UI (already exists) is reorganized with layer-based tags and descriptions. This avoids documentation drift.

### `CLAUDE.md`

Updated to reflect new naming: TerminalService, SessionService, new route prefixes, new file paths.

## Scope

### In Scope

- Rename `TmuxService` → `TerminalService` (class, file, decorator, tests)
- Rename `WorkerService` → `SessionService` (class, file, decorator, tests)
- Rename routes: `/api/sessions` → `/api/terminals`, `/api/workers` → `/api/sessions`
- Rename DB tables: `workers` → `sessions`, `worker_events` → `session_events`
- Reorganize Swagger tags per layer
- Write `docs/architecture.md`
- Update `CLAUDE.md` to reflect new naming

### Out of Scope (documented as planned)

- `AgentService` — L3 implementation
- `OrchestratorService` — L4 implementation
- `/api/agents` routes
- New frontend pages for agents
- Session Terminal Viewer (separate spec exists)

### Breaking Changes

- API routes change — no backward compatibility (no external consumers yet)
- DB tables rename — migration needed
