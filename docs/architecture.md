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
