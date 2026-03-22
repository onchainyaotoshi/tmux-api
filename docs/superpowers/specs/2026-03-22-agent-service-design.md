# AgentService (L3) — Design Spec

**Date:** 2026-03-22
**Status:** Draft
**Scope:** Backend only (no GUI — frontend redesign in progress separately)

## Overview

Add L3 AgentService to Foreman — agent definitions (blueprints) that define how to spawn sessions. Like Docker Images → Containers, an Agent definition can launch multiple Sessions.

This is backend-only: CRUD API for agent definitions, a launch endpoint to spawn sessions, and session-to-agent tracking. GUI will be added after the frontend redesign is complete.

## DB Schema

### New: `agents` table

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PRIMARY KEY | UUID |
| `name` | TEXT UNIQUE NOT NULL | e.g., "Claude Dev" |
| `command` | TEXT NOT NULL | e.g., `claude` |
| `cwd` | TEXT | Working directory |
| `description` | TEXT | What this agent does |
| `env` | TEXT | JSON stringified `{"KEY": "val"}` |
| `created_at` | TEXT NOT NULL | ISO datetime, DEFAULT datetime('now') |
| `updated_at` | TEXT NOT NULL | ISO datetime, DEFAULT datetime('now') |

### Modified: `sessions` table — add column

| Column | Type | Notes |
|---|---|---|
| `agent_id` | TEXT, nullable | FK → agents(id), NULL for manually spawned sessions |

Migration: `ALTER TABLE sessions ADD COLUMN agent_id TEXT REFERENCES agents(id)`. Wrapped in try/catch for idempotency (existing databases that already have the column).

## API Routes

### CRUD — `/api/agents`

| Method | Path | Description |
|---|---|---|
| `GET /api/agents` | List all agents | Returns array of agents |
| `POST /api/agents` | Create agent | Body: `name` (required), `command` (required), `cwd?`, `description?`, `env?` |
| `GET /api/agents/:id` | Get agent detail | Includes `active_sessions` count |
| `PUT /api/agents/:id` | Update agent | Partial update, same fields as create |
| `DELETE /api/agents/:id` | Delete agent | Fails with 409 if agent has active (non-stopped) sessions |

### Launch

| Method | Path | Description |
|---|---|---|
| `POST /api/agents/:id/launch` | Spawn session from agent | Optional body: `name` (session name). Auto-generates if omitted. |

### Sessions per agent

| Method | Path | Description |
|---|---|---|
| `GET /api/agents/:id/sessions` | List sessions spawned from this agent | Returns sessions where `agent_id` matches |

All routes use Swagger tag: `L3 — Agent`

### Route schemas

All routes include JSON Schema for request validation and Swagger auto-generation, following existing patterns:
- `name`: `{ type: 'string', minLength: 1, maxLength: 128, pattern: '^[a-zA-Z0-9_-]+$' }`
- `command`: `{ type: 'string', minLength: 1, maxLength: 4096 }`
- `cwd`: `{ type: 'string', pattern: '^/', maxLength: 4096 }`
- `description`: `{ type: 'string', maxLength: 1024 }`
- `env`: `{ type: 'object', additionalProperties: { type: 'string' } }` — stored as JSON string in DB, parsed on read

## AgentService

**File:** `src/server/services/agent.js`

**Constructor:** `AgentService(db, sessionService)`

**Dependencies:**
- `DatabaseService` — for agent CRUD and session queries
- `SessionService` — for spawning sessions on launch

### Methods

**`create(name, command, cwd, description, env)`**
- Validate inputs
- Generate UUID
- Insert into `agents` table
- Return created agent

**`get(id)`**
- Get agent from DB
- Throw `'Agent not found: ${id}'` if missing
- Count active sessions (status != 'stopped') where `agent_id = id`
- Return agent with `active_sessions` count

**`list()`**
- List all agents
- Include `active_sessions` count per agent

**`update(id, fields)`**
- Get agent (throw if not found)
- Partial update — only update provided fields
- Update `updated_at`
- Return updated agent

**`delete(id)`**
- Get agent (throw if not found)
- Check no active sessions (status != 'stopped') — throw `'Cannot delete agent with active sessions'` if any
- Delete from DB
- Return deleted agent

**`launch(id, sessionName)`**
- Get agent (throw if not found)
- Auto-generate session name if omitted: `{agent-name-lowercase}-{4-char-uuid}` (e.g., `claude-dev-a1b2`)
- Sanitize generated name to match `^[a-zA-Z0-9_-]+$` (replace spaces with `-`, strip invalid chars)
- Send env vars: for each key in agent.env, send `export KEY=val` via TerminalService.sendKeys before sending the main command
- Call `sessionService.spawn(name, command, cwd)`
- Update session's `agent_id` in DB
- Return created session

**`listSessions(id)`**
- Get agent (throw if not found)
- List sessions where `agent_id = id`

### Env handling

For the `env` field, after SessionService spawns the tmux session but before the main command runs, AgentService sends `export KEY=val` for each env var via the terminal. This is done through SessionService's underlying TerminalService.

However, SessionService.spawn() currently sends the command immediately after creating the session. To support env injection, the launch flow is:

1. AgentService calls a modified spawn or uses lower-level calls:
   - Option: Add an `env` parameter to `SessionService.spawn()` that sends export commands before the main command
   - This keeps the launch logic clean and avoids AgentService reaching into TerminalService directly

**Recommended:** Extend `SessionService.spawn(name, command, cwd, { env, agentId })` with optional `env` object and `agentId`. SessionService handles:
1. Create tmux session
2. For each env var: `sendKeys(session, '0', '0', 'export KEY=val')` + Enter
3. Send main command + Enter
4. Store `agent_id` in DB record

This keeps the layer boundary clean — AgentService doesn't reach into L1.

## DatabaseService Additions

### New methods

**`createAgent({ id, name, command, cwd, description, env })`**
- INSERT into agents table
- `env` stored as JSON string
- Return `this.getAgent(id)`

**`getAgent(id)`**
- SELECT from agents WHERE id = ?
- Parse `env` JSON on read
- Return agent or undefined

**`listAgents()`**
- SELECT all from agents
- Parse `env` JSON on each

**`updateAgent(id, fields)`**
- Dynamic UPDATE based on provided fields
- Stringify `env` if provided
- Update `updated_at`

**`deleteAgent(id)`**
- DELETE FROM agents WHERE id = ?

**`countActiveSessionsByAgent(agentId)`**
- `SELECT COUNT(*) FROM sessions WHERE agent_id = ? AND status != 'stopped'`

**`listSessionsByAgent(agentId)`**
- `SELECT * FROM sessions WHERE agent_id = ?`

### Modified methods

**`createSession({ id, name, command, status, cwd, event_token, agent_id })`**
- Add `agent_id` to INSERT statement (nullable)

## Files

### New

| File | Purpose |
|---|---|
| `src/server/services/agent.js` | AgentService class |
| `src/server/routes/agents.js` | Agent CRUD + launch + sessions routes |
| `tests/services/agent.test.js` | AgentService tests |
| `tests/routes/agents.test.js` | Agent route integration tests |

### Modified

| File | Change |
|---|---|
| `src/server/services/database.js` | Add `agents` table, `agent_id` column on sessions, agent CRUD methods |
| `src/server/services/session.js` | Extend `spawn()` to accept optional `env` and `agentId` params |
| `src/server/index.js` | Import + register AgentService and agent routes |
| `src/server/plugins/swagger.js` | Add `L3 — Agent` tag description |

### Fastify wiring

```js
// In index.js
import { AgentService } from './services/agent.js'
import { agentRoutes } from './routes/agents.js'

app.decorate('agentService', new AgentService(db, app.sessionService))

await app.register(agentRoutes, { prefix: '/api' })
```

Fastify decorator: `fastify.agentService`

### Swagger

Add tag to swagger plugin config:

```js
{
  name: 'L3 — Agent',
  description: 'Agent definitions — reusable blueprints for spawning sessions.',
}
```

## Scope

### In scope

- `agents` DB table + CRUD methods in DatabaseService
- `agent_id` FK column on sessions table (nullable, migration)
- `createSession` updated to accept `agent_id`
- `SessionService.spawn()` extended with optional `env` and `agentId`
- AgentService class with create, get, list, update, delete, launch, listSessions
- `/api/agents` CRUD + launch + sessions routes
- Swagger `L3 — Agent` tag
- Integration tests for service and routes

### Out of scope

- GUI / frontend (frontend redesign in progress separately)
- OrchestratorService (L4)
- Auto-restart / health monitoring of agent sessions
- Agent versioning
- Agent templates marketplace
