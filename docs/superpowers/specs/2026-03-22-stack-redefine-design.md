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

| Current | New |
|---|---|
| `GET /api/sessions` | `GET /api/terminals` |
| `POST /api/sessions` | `POST /api/terminals` |
| `GET /api/sessions/:session` | `GET /api/terminals/:name` |
| `DELETE /api/sessions/:session` | `DELETE /api/terminals/:name` |
| `GET /api/sessions/:session/windows` | `GET /api/terminals/:name/windows` |
| `POST /api/sessions/:session/windows` | `POST /api/terminals/:name/windows` |
| `DELETE /api/sessions/:session/windows/:window` | `DELETE /api/terminals/:name/windows/:window` |
| `GET /api/sessions/:session/windows/:window/panes` | `GET /api/terminals/:name/windows/:window/panes` |
| `POST /api/sessions/:session/windows/:window/panes` | `POST /api/terminals/:name/windows/:window/panes` |
| `POST .../panes/:index/send-keys` | `POST /api/terminals/:name/windows/:window/panes/:index/send-keys` |
| `GET .../panes/:index/capture` | `GET /api/terminals/:name/windows/:window/panes/:index/capture` |

### L2 — Session

| Current | New |
|---|---|
| `GET /api/workers` | `GET /api/sessions` |
| `POST /api/workers` | `POST /api/sessions` |
| `GET /api/workers/:id` | `GET /api/sessions/:id` |
| `DELETE /api/workers/:id` | `DELETE /api/sessions/:id` |
| `POST /api/workers/:id/events` | `POST /api/sessions/:id/events` |

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

### Classes

| Current | New |
|---|---|
| `TmuxService` | `TerminalService` |
| `WorkerService` | `SessionService` |

### Fastify Decorators

| Current | New |
|---|---|
| `fastify.tmux` | `fastify.terminal` |
| `fastify.worker` | `fastify.session` |

### Tests

| Current | New |
|---|---|
| `tests/services/tmux.test.js` | `tests/services/terminal.test.js` |
| `tests/routes/sessions.test.js` | `tests/routes/terminals.test.js` |
| `tests/routes/windows.test.js` | stays (update internal references) |
| `tests/routes/panes.test.js` | stays (update internal references) |
| `tests/routes/workers.test.js` | `tests/routes/sessions.test.js` |

### Database

| Current | New |
|---|---|
| `workers` table | `sessions` table |
| `worker_events` table | `session_events` table |
| `worker_id` column | `session_id` column |

## Swagger Reorganization

Tags grouped by layer with descriptions:

- **`L1 — Terminal (Low-level)`**: Direct tmux session, window, and pane management. Use L2 Session endpoints for most use cases.
- **`L2 — Session`**: Managed session instances with state tracking, events, and lifecycle management.
- **`L3 — Agent`** (planned): Agent definitions — reusable blueprints for spawning sessions.
- **`L4 — Orchestrator`** (planned): Fleet management, auto-recovery, and task routing.

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
