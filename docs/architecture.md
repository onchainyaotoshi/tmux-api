# tmux-api Architecture

tmux-api is a stateless REST API server for controlling tmux remotely. It provides a thin two-layer abstraction over the tmux binary.

> **Note:** Agent management (blueprints, lifecycle, orchestration) has moved to the separate **foreman** project, which consumes tmux-api as its backend.

## Layer Overview

```
┌─────────────────────────────────────────────┐
│  L2: SessionService             [ACTIVE]    │
│  Stateless convenience wrapper over L1      │
├─────────────────────────────────────────────┤
│  L1: TerminalService            [ACTIVE]    │
│  Raw tmux wrapper — stateless, execFile only │
└─────────────────────────────────────────────┘
```

## L1 — TerminalService

**File:** `src/server/services/terminal.js`
**Routes:** `/api/terminals`, `/api/terminals/:terminal/windows`, `/api/terminals/:terminal/windows/:window/panes`
**Swagger tag:** `L1 — Terminal (Low-level)`

Stateless wrapper around the tmux binary. Uses `execFile` (never `exec`) with an `ALLOWED_SUBCOMMANDS` whitelist. Knows nothing about sessions or higher-level concepts.

**Boundary rules:**
- No database access
- No business logic
- Returns parsed tmux output only

## L2 — SessionService

**File:** `src/server/services/session.js`
**Routes:** `/api/sessions`
**Swagger tag:** `L2 — Session`

Stateless convenience wrapper over L1. Provides a simpler API for common tmux session operations (list, create, rename, kill) by delegating to TerminalService.

**Boundary rules:**
- Depends on L1 (TerminalService) for all tmux operations
- No database, no state tracking
- Pure pass-through with ergonomic API

## Entity Glossary

| Entity | Layer | Description |
|---|---|---|
| Terminal | L1 | A tmux session with windows and panes |
| Session | L2 | Alias for a tmux session via convenience API |
| Window | L1 | A tmux window within a terminal |
| Pane | L1 | A tmux pane within a window |

## Authentication

- **API key** (`X-API-Key` header) — for all `/api/*` routes
- **Bearer token** (`Authorization: Bearer`) — validated against accounts service

## API Reference

Swagger UI available at `/docs` when `SWAGGER_ENABLED=true`. Routes are organized by layer tags.
