# CLAUDE.md — tmux-api Development Guide

## What is tmux-api?

tmux-api is a stateless REST API server for controlling tmux remotely. It enables managing multiple terminal sessions without needing direct SSH access. Built with Fastify + React.

**Why it exists:** The developer manages multiple AI agents running in tmux sessions on a remote server. Connection drops kill sessions. tmux-api solves this by providing persistent tmux sessions controlled via HTTP API.

> **Note:** Agent management (blueprints, lifecycle, orchestration) has moved to the separate **foreman** project, which consumes tmux-api as its backend.

## Tech Stack

- **Backend:** Fastify (Node.js, ESM)
- **Frontend:** React + Vite + Tailwind CSS v4 + shadcn/ui (public SPA)
- **Auth:** Dual auth — API key (`X-API-Key`) + Bearer token (validated against accounts service)
- **Testing:** Vitest (integration tests against real tmux)
- **Serving:** Fastify serves both API and static frontend via @fastify/static
- **Container:** Docker multi-stage (node:20-alpine + tmux)
- **Port:** 9993 (localhost only, expose via cloudflared)

## Layer Architecture

tmux-api uses a 2-layer service architecture:

| Layer | Service | Route | Description |
|-------|---------|-------|-------------|
| L1 | `TerminalService` | `/api/terminals` | Raw tmux primitives (stateless) |
| L2 | `SessionService` | `/api/sessions` | Stateless convenience wrapper over L1 |

See `docs/architecture.md` for full architecture details.

## Project Structure

```
src/server/              — Backend (Fastify)
  index.js               — Entry point, wires plugins + routes
  services/terminal.js   — TerminalService class (core, wraps tmux binary)
  services/session.js    — SessionService class (stateless wrapper over L1)
  plugins/auth.js        — Dual auth: API key + Bearer token validation
  plugins/swagger.js     — OpenAPI + Scalar docs at /docs
  routes/terminals.js    — Terminal CRUD (L1)
  routes/sessions.js     — Session CRUD (L2)
  routes/windows.js      — Window CRUD (nested under terminals)
  routes/panes.js        — Pane CRUD + send-keys + capture (nested under terminals)

src/frontend/            — Frontend (React SPA, all public)
  App.jsx                — React Router setup, layout + routes
  main.jsx               — Entry point, BrowserRouter wrapper
  lib/utils.js           — cn() helper (clsx + tailwind-merge)
  layouts/AppLayout.jsx  — Sidebar + main content layout
  components/Sidebar.jsx — Fixed sidebar with nav links
  components/ui/         — shadcn/ui primitives (button, table, card, alert, etc.)
  pages/HomePage.jsx     — Home page
  pages/AboutTmuxPage.jsx — About Tmux tutorial page
  hooks/use-mobile.jsx   — Mobile detection hook

src/index.css            — Tailwind directives + shadcn dark theme CSS vars

tests/                   — Mirrors src/server/ structure
  services/terminal.test.js
  services/session.test.js
  plugins/auth.test.js
  routes/{terminals,sessions,windows,panes}.test.js
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
- **execFile, not exec** — TerminalService uses `child_process.execFile` with argument arrays. Never interpolate user input into shell commands.
- **ALLOWED_SUBCOMMANDS whitelist** — Only 14 tmux subcommands are permitted.
- **Name validation** — Session/window names must match `^[a-zA-Z0-9_-]+$` (enforced at route schema level) to prevent tmux target syntax injection.
- **send-keys maxLength** — Limited to 4096 chars to prevent resource exhaustion.
- **Dual auth** — `/api/*` routes accept either `X-API-Key` header or `Authorization: Bearer <token>`. API key is checked first (no network call). Bearer token is validated against the accounts service `GET /api/proxy/me`.
- **Localhost only** — Docker binds `127.0.0.1`. Use cloudflared for external access.

### Patterns
- **Route schemas** — Every route has JSON Schema for request validation AND OpenAPI auto-generation. If you add a route, always include schema.
- **Response envelope** — Always return `{ success: true, data: ... }` or `{ success: false, error: "..." }`.
- **TerminalService is stateless** — One instance decorated on Fastify app as `fastify.terminal`. Routes access it via `const { terminal } = fastify`.
- **SessionService is stateless** — Decorated on Fastify app as `fastify.sessionService`. Thin convenience wrapper over TerminalService. No database, no state tracking.
- **Output parsing** — Tmux `-F` flag with `|` delimiter. Never parse free-text output.
- **fastify-plugin** — Auth and swagger plugins use `fp()` wrapper for global scope (not scoped to registering plugin).

### Frontend
- **Tailwind CSS v4 + shadcn/ui** — All styling via Tailwind utility classes. shadcn components for UI primitives.
- **No shadcn Sidebar** — shadcn Sidebar component's `peer-data-*` selectors don't work with Tailwind v4. Use plain fixed `<aside>` with `ml-64` on content instead.
- **shadcn dark theme** — Default neutral dark. CSS variables in `src/index.css`, `<html class="dark">`.
- **Path alias** — `@` maps to `src/frontend/` (configured in vite.config.js + jsconfig.json).
- Content is in **Indonesian** (Bahasa Indonesia) for tutorial sections.
- **All pages are public:** `/` (home), `/about-tmux`, `/docs` (Scalar API docs). No authentication required for frontend.

## Environment Variables

```
API_KEY=<required>                  # API key for external client auth
PORT=9993                           # Server port (default: 9993)
SWAGGER_ENABLED=true                # Set to "false" to disable Scalar API docs
AUTH_ACCOUNTS_URL=<accounts URL>    # Accounts service URL for Bearer token validation
```

See `.env.example` for full documentation.

## Git Flow

- **main** — production releases, tagged with semver
- **develop** — integration branch, branch features from here
- **feature/*** — new features
- **release/*** — release prep
- **hotfix/*** — urgent production fixes

**Conventional commits required:** `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`

Current version: **v0.12.3**

## Testing

Tests are **integration tests** that run real tmux commands. They create/destroy tmux sessions during tests. Each test file uses unique session names to avoid collisions.

```bash
# Run specific test file
npx vitest run tests/services/terminal.test.js

# Run all tests
npm test
```

**When adding new endpoints:**
1. Write test file in `tests/routes/` following existing patterns
2. Use `app.inject()` for HTTP simulation (no real server needed)
3. Create test sessions in `beforeEach`, clean up in `afterEach`/`afterAll`
4. Always test auth (API key required, should 401 without credentials)

## Adding New Features

1. Branch from `develop`: `git checkout -b feature/name`
2. Add route in `src/server/routes/`
3. Add method in `src/server/services/terminal.js` (L1) or `src/server/services/session.js` (L2) as appropriate
4. Add subcommand to `ALLOWED_SUBCOMMANDS` if new
5. Write tests in `tests/routes/`
6. Run `npm test` — all must pass
7. For frontend changes: use shadcn components, Tailwind classes, no CSS Modules
8. Commit with conventional commits
9. Merge to `develop`
