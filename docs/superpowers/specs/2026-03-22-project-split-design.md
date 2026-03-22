# Project Split: tmux-api + foreman

**Date:** 2026-03-22
**Status:** Approved

## Problem

The Foreman codebase (~4K LOC) mixes stateless tmux primitives with stateful agent management. This causes:

1. **Claude context dilution** — Claude loses track of patterns and makes mistakes because unrelated code (frontend, agent logic) competes for context
2. **Frontend bloat** — ~2,400 LOC of frontend code dilutes context for backend work, despite the backend API being the core product
3. **Misplaced state** — L2 (SessionService) maintains database state (status machine, events, task tracking) that belongs at the agent management layer, not the tmux API layer

## Decision

Split into two separate repositories with a clean HTTP boundary.

## Architecture

```
┌─────────────────────────┐       HTTP        ┌─────────────────────────────┐
│       tmux-api          │ ◄──────────────── │          foreman            │
│  (stateless tmux REST)  │                    │   (AI workforce manager)    │
│                         │                    │                             │
│  L1: TerminalService    │                    │  L3: AgentService           │
│  L2: SessionService     │                    │  L4: OrchestratorService    │
│      (stateless)        │                    │      (future)               │
│                         │                    │                             │
│  No database            │                    │  SQLite / Drizzle           │
│  Fastify + minimal UI   │                    │  Next.js + shadcn/ui        │
└─────────────────────────┘                    └─────────────────────────────┘
```

## 1. tmux-api (this repo, renamed)

### What it is

Stateless REST API for controlling tmux remotely. Fastify + minimal frontend (tutorial pages + Swagger).

### What stays

- **L1 (TerminalService)** — unchanged. Stateless wrapper around tmux binary via `execFile` with whitelisted subcommands.
- **L2 (SessionService)** — rewritten to be stateless. Convenience wrapper over L1.
- **Auth plugin** — API key + Bearer token, unchanged.
- **Swagger plugin** — unchanged.
- **Rate limiting** — unchanged.
- **Security** — execFile, ALLOWED_SUBCOMMANDS whitelist, name validation (`^[a-zA-Z0-9_-]+$`), send-keys maxLength.
- **Frontend pages:** Home (`/`), About Tmux (`/about-tmux`), Swagger UI (`/docs`).
- **Frontend components:** Sidebar (simplified, no auth), Section, ShortcutTable, TerminalSimulator, tutorial sections.

### What gets removed

- `src/server/services/database.js` — entire file
- `src/server/services/agent.js` — entire file
- `src/server/routes/agents.js` — entire file
- `src/server/routes/events.js` — entire file
- `src/server/routes/authProxy.js` — frontend OAuth proxy, no longer needed without frontend auth
- `src/server/routes/health.js` — bulk health check route (per-session health stays in session routes)
- `better-sqlite3` dependency
- UUID generation in SessionService
- Status state machine (`EVENT_STATE_MAP`)
- Event token auth
- Auth plugin: remove event route bypass (`POST /api/sessions/:id/events` skip)
- Frontend: SessionsPage, CallbackPage, AgentsPage, ProtectedRoute, ConfirmDialog, TerminalViewer
- Frontend: `@yaotoshi/auth-sdk`, auth flow (`lib/auth.js`), `lib/api.js`
- Frontend: `use-sidebar` hook (if only used by auth sidebar)
- Database migration code, `data/foreman.db` file (no longer used; archive if needed)
- Agent-related test files (`tests/services/agent.test.js`, `tests/routes/agents.test.js`)

### L2 SessionService — new stateless design

L2 becomes a thin convenience layer. No database, no UUIDs. Uses tmux session names directly with `session-` prefix for namespacing.

```
spawn(name, command, cwd)   → createSession(session-{name}) + sendKeys(command)
sendTask(name, input)       → sendKeys(session-{name}, input) + sendKeys(Enter)
getOutput(name)             → capturePane(session-{name})
kill(name)                  → killSession(session-{name})
list()                      → listSessions() filtered by session- prefix
health(name)                → hasSession(session-{name})
```

**Key changes:**
- Clients use session names, not UUIDs
- No status tracking — tmux is the source of truth (alive or not)
- No event processing
- No current_task tracking
- `spawn` still supports `cwd` parameter
- `spawn` does NOT support `env` — env injection moves to foreman (bake into command or use tmux `set-environment`)
- Name collisions return a clean error (check `hasSession` before creating). Tmux errors are caught and translated to meaningful HTTP responses.
- `sendTask` to a dead session returns the tmux error as a 500/410 — no semantic status codes like 409. Foreman (the consumer) handles retry/status logic.

### Session routes — updated

| Method | Path | Description |
|--------|------|-------------|
| `POST /api/sessions` | Spawn session (name + command + optional cwd) |
| `GET /api/sessions` | List sessions (from tmux) |
| `GET /api/sessions/:name` | Get session detail + captured output |
| `POST /api/sessions/:name/task` | Send input to session |
| `DELETE /api/sessions/:name` | Kill session |
| `GET /api/sessions/:name/health` | Check if tmux session is alive |

**Note:** Route params change from `:id` (UUID) to `:name` (tmux session name without prefix).

### Response format

Unchanged: `{ success: true, data: ... }` or `{ success: false, error: "..." }`.

Session object becomes simpler:
```json
{
  "name": "my-worker",
  "tmux_session": "session-my-worker",
  "alive": true,
  "output": "..."
}
```

### Frontend changes

- Remove: SessionsPage, CallbackPage, AgentsPage, ProtectedRoute, ConfirmDialog, TerminalViewer
- Remove: Auth SDK integration, auth flow, `lib/auth.js`, `lib/api.js`
- Remove: Protected route guard
- Simplify Sidebar: remove login/logout, remove Sessions nav link
- Keep: Home page, About Tmux page, tutorial sections, Swagger link
- All remaining pages are public (no auth required for frontend)

### Environment variables — simplified

```
API_KEY=<required>
PORT=9993
SWAGGER_ENABLED=true
AUTH_ACCOUNTS_URL=<accounts URL>   # Still needed for Bearer token validation
```

Remove all `VITE_*` variables (no frontend auth flow).

## 2. foreman (new repo)

### What it is

AI workforce manager. Manages agent blueprints, tracks lifecycle, receives event webhooks from Claude Code sessions. Consumes `tmux-api` over HTTP.

### Tech stack

- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Database:** SQLite via better-sqlite3 or Drizzle ORM
- **HTTP client:** For calling tmux-api

### Features — L3 (AgentService)

- **Agent blueprints CRUD** — name, command, cwd, env, description
- **Launch agent** — POST to tmux-api `/api/sessions`, track the mapping
- **Session tracking** — which agent spawned which session, session status
- **Event webhook receiver** — endpoint for Claude Code hooks (Notification, Stop, StopFailure, PreToolUse)
- **Status state machine** — idle, running, waiting_input, error, failed, stopped
- **Event history** — log of all events per session
- **Dashboard UI** — manage agents, view sessions, see status, capture output (via tmux-api)

### Features — L4 (OrchestratorService, future)

- Fleet management
- Task distribution across agents
- Auto-recovery when sessions die
- Status dashboard with real-time updates

### Database schema

Migrated from current Foreman:

```sql
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  command TEXT NOT NULL,
  cwd TEXT,
  description TEXT,
  env TEXT,              -- JSON stringified
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  agent_id TEXT REFERENCES agents(id),
  name TEXT UNIQUE NOT NULL,     -- matches tmux-api session name
  tmux_api_url TEXT NOT NULL,    -- which tmux-api instance
  status TEXT NOT NULL DEFAULT 'idle',
  current_task TEXT,
  event_token TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE session_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  type TEXT NOT NULL,
  data TEXT,
  created_at TEXT NOT NULL
);
```

### Dependency on tmux-api

Foreman depends on tmux-api **only via HTTP**. No shared code, no shared packages, no monorepo.

```
foreman → HTTP → tmux-api → tmux binary
```

The `tmux_api_url` field on sessions allows foreman to manage sessions across multiple tmux-api instances in the future.

## Migration Plan

### Phase 1: tmux-api (modify this repo, starting from v0.11.0)

1. Rename repo from `foreman` to `tmux-api`
2. Rewrite SessionService to be stateless
3. Update session routes (`:id` → `:name`, remove events)
4. Remove DatabaseService, AgentService, agent routes, event routes
5. Remove `better-sqlite3` dependency
6. Strip frontend: remove Sessions page, auth flow, protected routes
7. Simplify Sidebar
8. Update tests
9. Update CLAUDE.md, README, package.json
10. Tag as v1.0.0 (fresh start for the new identity)

### Phase 2: foreman (new repo)

1. Create new Next.js project
2. Set up Tailwind + shadcn/ui
3. Implement tmux-api HTTP client
4. Migrate agent CRUD from old code
5. Implement event webhook receiver
6. Build dashboard UI
7. Add session lifecycle management

## Naming

| Before | After |
|--------|-------|
| `foreman` repo | `tmux-api` repo |
| New repo | `foreman` |
| TerminalService | TerminalService (unchanged) |
| SessionService (stateful) | SessionService (stateless) |
| AgentService | Moves to new foreman |
| OrchestratorService | Moves to new foreman |
