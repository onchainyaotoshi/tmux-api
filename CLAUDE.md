# CLAUDE.md — Foreman Development Guide

## What is Foreman?

Foreman is a REST API server for controlling tmux remotely. It enables orchestrating multiple terminal sessions (each running Claude or other AI agents) without needing direct SSH access. Built with Fastify + React.

**Why it exists:** The developer manages multiple Claude AI agents running in tmux sessions on a remote server via Termius/SSH. Connection drops kill sessions. Foreman solves this by providing persistent tmux sessions controlled via HTTP API, with a future goal of building an agent that monitors all workers autonomously.

## Tech Stack

- **Backend:** Fastify (Node.js, ESM)
- **Frontend:** React + Vite + Tailwind CSS v4 + shadcn/ui (authenticated SPA)
- **Auth:** OAuth 2.0 PKCE via `@yaotoshi/auth-sdk`, dual auth (API key + Bearer token)
- **Testing:** Vitest (integration tests against real tmux)
- **Serving:** Fastify serves both API and static frontend via @fastify/static
- **Container:** Docker multi-stage (node:20-alpine + tmux)
- **Port:** 9993 (localhost only, expose via cloudflared)

## Layer Architecture

Foreman uses a 4-layer service architecture:

| Layer | Service | Route | Status |
|-------|---------|-------|--------|
| L1 | `TerminalService` | `/api/terminals` | Active — raw tmux primitives |
| L2 | `SessionService` | `/api/sessions` | Active — managed running instances |
| L3 | `AgentService` | `/api/agents` | Planned — blueprints + lifecycle |
| L4 | `OrchestratorService` | `/api/orchestrator` | Planned — fleet management |

See `docs/architecture.md` for full architecture details.

## Project Structure

```
src/server/              — Backend (Fastify)
  index.js               — Entry point, wires plugins + routes
  services/terminal.js   — TerminalService class (core, wraps tmux binary)
  services/session.js    — SessionService class (manages running instances)
  plugins/auth.js        — Dual auth: API key + Bearer token validation
  plugins/swagger.js     — Swagger UI at /docs
  routes/terminals.js    — Terminal CRUD (L1)
  routes/sessions.js     — Session CRUD (L2)
  routes/windows.js      — Window CRUD (nested under terminals)
  routes/panes.js        — Pane CRUD + send-keys + capture (nested under terminals)
  routes/authProxy.js    — Proxies /auth/proxy/* to accounts service

src/frontend/            — Frontend (React SPA)
  App.jsx                — React Router setup, sidebar + main layout
  main.jsx               — Entry point, BrowserRouter wrapper
  lib/auth.js            — YaotoshiAuth singleton + apiUrl override
  lib/api.js             — API helper (fetch with Bearer token)
  lib/utils.js           — cn() helper (clsx + tailwind-merge)
  components/Sidebar.jsx — Fixed sidebar with nav links + auth
  components/ProtectedRoute.jsx — Auth guard, redirects to /
  components/ConfirmModal.jsx   — Kill confirmation (shadcn AlertDialog)
  components/Section.jsx        — Tutorial section wrapper (shadcn Card)
  components/ShortcutTable.jsx  — Shortcut table (shadcn Table)
  components/TerminalSimulator.jsx — Interactive terminal mockup
  components/terminal-styles.js — Tailwind class constants for sections
  components/ui/         — shadcn/ui primitives (button, table, card, alert, etc.)
  pages/                 — HomePage, SessionsPage, KnowledgeBasePage, CallbackPage
  sections/              — 6 tutorial sections (Indonesian)
  hooks/                 — use-mobile.jsx

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
- **Auth proxy** — `/auth/proxy/*` routes forward to accounts service `/api/proxy/*` (token exchange, /me, logout). This avoids CORS issues since the SDK makes same-origin requests.
- **Localhost only** — Docker binds `127.0.0.1`. Use cloudflared for external access.

### Patterns
- **Route schemas** — Every route has JSON Schema for request validation AND Swagger auto-generation. If you add a route, always include schema.
- **Response envelope** — Always return `{ success: true, data: ... }` or `{ success: false, error: "..." }`.
- **TerminalService is stateless** — One instance decorated on Fastify app as `fastify.terminal`. Routes access it via `const { terminal } = fastify`.
- **SessionService** — Decorated on Fastify app as `fastify.sessionService`. Manages L2 session lifecycle on top of TerminalService.
- **Output parsing** — Tmux `-F` flag with `|` delimiter. Never parse free-text output.
- **fastify-plugin** — Auth and swagger plugins use `fp()` wrapper for global scope (not scoped to registering plugin).

### Frontend
- **Tailwind CSS v4 + shadcn/ui** — All styling via Tailwind utility classes. shadcn components for UI primitives (Button, Table, Card, AlertDialog, Badge, Alert, Separator).
- **No shadcn Sidebar** — shadcn Sidebar component's `peer-data-*` selectors don't work with Tailwind v4. Use plain fixed `<aside>` with `ml-64` on content instead.
- **shadcn dark theme** — Default neutral dark. CSS variables in `src/index.css`, `<html class="dark">`.
- **Path alias** — `@` maps to `src/frontend/` (configured in vite.config.js + jsconfig.json).
- Content is in **Indonesian** (Bahasa Indonesia) for tutorial sections.
- **Auth flow** — `@yaotoshi/auth-sdk` with `apiUrl()` override to use local `/auth/proxy/*` (avoids CORS). See `src/frontend/lib/auth.js`.
- **Public pages:** `/` (home), `/knowledge-base`, `/docs` (Swagger). **Protected:** `/sessions` (requires login).

### @yaotoshi/auth-sdk Gotchas
1. **CORS trap** — SDK API calls (token, /me, logout) go cross-origin by default. Override `auth.apiUrl = (path) => '/auth/proxy' + path` to route through backend proxy.
2. **Accounts API path** — `accounts.yaotoshi.xyz` is a Next.js frontend. The API is at `/api/proxy/*`, not root. Backend auth proxy and auth plugin must use `/api/proxy/me`, `/api/proxy/token`, etc.

## Environment Variables

```
# Backend
API_KEY=<required>                  # API key for external client auth
PORT=9993                           # Server port (default: 9993)
SWAGGER_ENABLED=true                # Set to "false" to disable Swagger UI
AUTH_ACCOUNTS_URL=<accounts URL>    # Accounts service URL for Bearer token validation

# Frontend (Vite — must be prefixed with VITE_)
VITE_AUTH_CLIENT_ID=<oauth client id>
VITE_AUTH_ACCOUNTS_URL=<accounts URL>     # MUST match AUTH_ACCOUNTS_URL
VITE_AUTH_REDIRECT_URI=<callback URL>     # e.g. https://foreman.yaotoshi.xyz/callback
VITE_AUTH_POST_LOGOUT_URI=<post logout>   # e.g. https://foreman.yaotoshi.xyz
```

See `.env.example` for full documentation.

## Git Flow

- **main** — production releases, tagged with semver
- **develop** — integration branch, branch features from here
- **feature/*** — new features
- **release/*** — release prep
- **hotfix/*** — urgent production fixes

**Conventional commits required:** `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`

Current version: **v0.4.3**

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
4. Always test both auth methods (API key and Bearer token should 401 without credentials)

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

## Future Direction

Foreman is evolving from a tmux API into an **AI workforce manager** using a 4-layer architecture:

- **L1 TerminalService** (`/api/terminals`) — Active. Raw tmux primitives (create, kill, capture, send-keys).
- **L2 SessionService** (`/api/sessions`) — Active. Managed running instances with state tracking, events, and DB persistence.
- **L3 AgentService** (`/api/agents`) — Planned. Agent blueprints, lifecycle management, auto-recovery when sessions die.
- **L4 OrchestratorService** (`/api/orchestrator`) — Planned. Fleet management, task distribution across multiple agents, status dashboard.

See `docs/architecture.md` for the full architecture design.
