# CLAUDE.md — Foreman Development Guide

## What is Foreman?

Foreman is a REST API server for controlling tmux remotely. It enables orchestrating multiple terminal sessions (each running Claude or other AI agents) without needing direct SSH access. Built with Fastify + React.

**Why it exists:** The developer manages multiple Claude AI agents running in tmux sessions on a remote server via Termius/SSH. Connection drops kill sessions. Foreman solves this by providing persistent tmux sessions controlled via HTTP API, with a future goal of building an agent that monitors all workers autonomously.

## Tech Stack

- **Backend:** Fastify (Node.js, ESM)
- **Frontend:** React + Vite (static SPA, tutorial content)
- **Testing:** Vitest (integration tests against real tmux)
- **Serving:** Fastify serves both API and static frontend via @fastify/static
- **Container:** Docker multi-stage (node:20-alpine + tmux)
- **Port:** 9997 (localhost only, expose via cloudflared)

## Project Structure

```
src/server/           — Backend (Fastify)
  index.js            — Entry point, wires plugins + routes
  services/tmux.js    — TmuxService class (core, wraps tmux binary)
  plugins/auth.js     — API key validation for /api/* routes
  plugins/swagger.js  — Swagger UI at /docs
  routes/sessions.js  — Session CRUD
  routes/windows.js   — Window CRUD (nested under sessions)
  routes/panes.js     — Pane CRUD + send-keys + capture

src/frontend/         — Frontend (React)
  App.jsx             — Main app with tutorial sections
  components/         — Sidebar, Section, ShortcutTable, TerminalSimulator
  sections/           — 6 tutorial sections (Indonesian)

src/index.css         — Global styles (shared)

tests/                — Mirrors src/server/ structure
  services/tmux.test.js
  plugins/auth.test.js
  routes/{sessions,windows,panes}.test.js
```

## Commands

```bash
npm start             # Start Fastify server (needs .env)
npm run dev:server    # Dev server with --watch
npm run dev:frontend  # Vite dev server (frontend only)
npm run build         # Build frontend to dist/
npm test              # Run all tests (vitest run)
npm run test:watch    # Watch mode
```

## Key Architecture Decisions

### Security
- **execFile, not exec** — TmuxService uses `child_process.execFile` with argument arrays. Never interpolate user input into shell commands.
- **ALLOWED_SUBCOMMANDS whitelist** — Only 14 tmux subcommands are permitted.
- **Name validation** — Session/window names must match `^[a-zA-Z0-9_-]+$` (enforced at route schema level) to prevent tmux target syntax injection.
- **send-keys maxLength** — Limited to 4096 chars to prevent resource exhaustion.
- **API key auth** — All `/api/*` routes require `X-API-Key` header. Key from `.env`.
- **Localhost only** — Docker binds `127.0.0.1`. Use cloudflared for external access.

### Patterns
- **Route schemas** — Every route has JSON Schema for request validation AND Swagger auto-generation. If you add a route, always include schema.
- **Response envelope** — Always return `{ success: true, data: ... }` or `{ success: false, error: "..." }`.
- **TmuxService is stateless** — One instance decorated on Fastify app as `fastify.tmux`. Routes access it via `const { tmux } = fastify`.
- **Output parsing** — Tmux `-F` flag with `|` delimiter. Never parse free-text output.
- **fastify-plugin** — Auth and swagger plugins use `fp()` wrapper for global scope (not scoped to registering plugin).

### Frontend
- Content is in **Indonesian** (Bahasa Indonesia).
- CSS Modules for component styling, CSS variables for theming.
- Dark theme with terminal green accent (#00ff41).
- Frontend is static — no API calls from React. API is consumed by external clients.

## Environment Variables

```
API_KEY=<required>        # API key for authentication
PORT=9997                 # Server port (default: 9997)
SWAGGER_ENABLED=true      # Set to "false" to disable Swagger UI
```

## Git Flow

- **main** — production releases, tagged with semver
- **develop** — integration branch, branch features from here
- **feature/*** — new features
- **release/*** — release prep
- **hotfix/*** — urgent production fixes

**Conventional commits required:** `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`

Current version: **v0.1.0**

## Testing

Tests are **integration tests** that run real tmux commands. They create/destroy tmux sessions during tests. Each test file uses unique session names to avoid collisions.

```bash
# Run specific test file
npx vitest run tests/services/tmux.test.js

# Run all tests
npm test
```

**When adding new endpoints:**
1. Write test file in `tests/routes/` following existing patterns
2. Use `app.inject()` for HTTP simulation (no real server needed)
3. Create test sessions in `beforeEach`, clean up in `afterEach`/`afterAll`
4. Always test auth (requests without key should 401)

## Adding New Features

1. Branch from `develop`: `git checkout -b feature/name`
2. Add route in `src/server/routes/`
3. Add method in `src/server/services/tmux.js` if new tmux command needed
4. Add subcommand to `ALLOWED_SUBCOMMANDS` if new
5. Write tests in `tests/routes/`
6. Run `npm test` — all must pass
7. Commit with conventional commits
8. Merge to `develop`

## Future Direction

Foreman is evolving from a tmux API into an **AI workforce manager**:
- Agent that monitors all Claude workers automatically
- Auto-recovery when sessions die
- Task distribution across multiple agents
- Status dashboard for all running agents
