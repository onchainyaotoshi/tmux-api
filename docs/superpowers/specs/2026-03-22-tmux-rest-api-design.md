# Tmux Management REST API — Design Spec

## Overview

Evolusi dari tmux visual tutorial menjadi REST API server untuk kontrol tmux secara remote. Fastify monolith serve API endpoints dan static frontend (tutorial + Swagger UI) dalam single container.

**Tujuan:** Deployable REST API server yang bisa di-hit dari bahasa/tool apapun untuk manage tmux sessions, windows, dan panes secara programmatic.

**Target user:** Developer/DevOps yang butuh kontrol tmux remote via API.

## Stack & Arsitektur

- **Runtime:** Node.js + Fastify
- **Frontend:** React + Vite (existing tutorial, static build)
- **API Docs:** `@fastify/swagger` + `@fastify/swagger-ui` (auto-generated)
- **Auth:** API key via `X-API-Key` header, key dari `.env`
- **Container:** Docker single container, Fastify serve semuanya via `@fastify/static`
- **Port:** 9997 (localhost only, `127.0.0.1`)
- **Expose:** User pakai `cloudflared tunnel` jika perlu akses dari luar

## Struktur Direktori

```
tmux-management/
├── src/
│   ├── server/
│   │   ├── index.js             # Entry point, register plugins & routes
│   │   ├── plugins/
│   │   │   ├── auth.js          # API key authentication
│   │   │   └── swagger.js       # Swagger/OpenAPI config
│   │   ├── routes/
│   │   │   ├── sessions.js      # /api/sessions/*
│   │   │   ├── windows.js       # /api/windows/*
│   │   │   └── panes.js         # /api/panes/*
│   │   └── services/
│   │       └── tmux.js          # Core: exec tmux commands, parse output
│   ├── frontend/                # React app (dipindah dari src/ root)
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Section.jsx
│   │   │   ├── ShortcutTable.jsx
│   │   │   └── TerminalSimulator.jsx
│   │   └── sections/
│   │       ├── SessionSection.jsx
│   │       ├── WindowSection.jsx
│   │       ├── PaneSection.jsx
│   │       ├── NavigationSection.jsx
│   │       ├── ResizeSection.jsx
│   │       └── CopyModeSection.jsx
│   └── index.css
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── package.json
└── vite.config.js
```

## Runtime Flow

1. Fastify start pada `PORT` dari `.env` (default 9997)
2. Register auth plugin (API key check untuk `/api/*`)
3. Register Swagger plugin (auto-generate docs dari route schemas)
4. Register API routes (`/api/sessions`, `/api/sessions/:session/windows`, dll)
5. Serve static frontend via `@fastify/static` (Vite build output dari `dist/`)
6. Route mapping:
   - `/api/*` → REST API (authenticated via `X-API-Key`)
   - `/docs` → Swagger UI (no auth)
   - `/*` → Frontend static files (no auth)

## REST API Endpoints

Semua endpoint di bawah prefix `/api`, butuh header `X-API-Key`.

Response format konsisten:
- Success: `{ success: true, data: ... }`
- Error: `{ success: false, error: "..." }`

### Sessions

| Method | Endpoint | Body | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/sessions` | — | List semua sessions |
| POST | `/api/sessions` | `{ name }` | Create session baru |
| DELETE | `/api/sessions/:name` | — | Kill session |
| PUT | `/api/sessions/:name` | `{ newName }` | Rename session |

### Windows

| Method | Endpoint | Body | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/sessions/:session/windows` | — | List windows dalam session |
| POST | `/api/sessions/:session/windows` | `{ name? }` | Create window baru |
| DELETE | `/api/sessions/:session/windows/:index` | — | Kill window |
| PUT | `/api/sessions/:session/windows/:index` | `{ newName }` | Rename window |

### Panes

| Method | Endpoint | Body | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/sessions/:session/windows/:window/panes` | — | List panes |
| POST | `/api/sessions/:session/windows/:window/panes` | `{ direction: "h" \| "v" }` | Split pane |
| DELETE | `/api/sessions/:session/windows/:window/panes/:index` | — | Kill pane |
| PUT | `/api/sessions/:session/windows/:window/panes/:index/resize` | `{ direction, amount }` | Resize pane |

### Control

| Method | Endpoint | Body | Deskripsi |
|--------|----------|------|-----------|
| POST | `/api/sessions/:session/windows/:window/panes/:index/send-keys` | `{ keys }` | Send keys ke pane |
| GET | `/api/sessions/:session/windows/:window/panes/:index/capture` | — | Capture pane output |

## Authentication & Security

### API Key Auth
- Key disimpan di `.env` → `API_KEY=your-secret-key`
- Client kirim via header `X-API-Key: your-secret-key`
- Fastify `onRequest` hook cek key untuk semua `/api/*` routes
- Swagger UI dan frontend static tidak perlu auth

### Multi-user (future)
- Fase awal: single API key shared
- Service layer dipisah dari auth layer — bisa diganti ke multi-key tanpa ubah route logic

### Command Injection Prevention
- Service layer pakai `execFile` (bukan `exec`) dengan argument array
- Whitelist tmux subcommands
- Tidak pernah interpolasi user input langsung ke shell

### Rate Limiting
- `@fastify/rate-limit` untuk prevent abuse

### Swagger Toggle
- `SWAGGER_ENABLED=true|false` di `.env`

## Core Service Layer

Single module `TmuxService` yang wrap semua interaksi dengan binary `tmux` via `child_process.execFile`.

```js
class TmuxService {
  async execute(subcommand, args[])

  // Sessions
  async listSessions()
  async createSession(name)
  async killSession(name)
  async renameSession(name, newName)

  // Windows
  async listWindows(session)
  async createWindow(session, name?)
  async killWindow(session, index)
  async renameWindow(session, index, newName)

  // Panes
  async listPanes(session, window)
  async splitPane(session, window, direction)
  async killPane(session, window, index)
  async resizePane(session, window, index, direction, amount)

  // Control
  async sendKeys(session, window, pane, keys)
  async capturePane(session, window, pane)
}
```

### Output Parsing
Tmux `-F` flag untuk custom format output → structured data.

Contoh: `tmux list-sessions -F "#{session_name}|#{session_windows}|#{session_created}"` → split by `|` → JSON object.

### Error Handling
Jika tmux command gagal (exit code non-zero), throw error dengan pesan stderr yang di-sanitize sebelum dikembalikan ke client.

## Frontend Perubahan

### Perubahan:
- Sidebar diperluas dengan 2 grup: **Tutorial** (6 section existing) dan **API Docs** (link ke `/docs`, buka tab baru)
- Header diupdate: "Tmux Management" dengan subtitle mention REST API
- File frontend dipindah ke `src/frontend/`

### Tidak berubah:
- Semua 6 section tutorial
- Components (TerminalSimulator, ShortcutTable, Section)
- Styling/theme

## Docker & Deployment

### Dockerfile (multi-stage)
- **Stage 1 (build):** `node:alpine` — install deps, `vite build` frontend ke `dist/`
- **Stage 2 (run):** `node:alpine` — copy server code + `dist/` + production `node_modules`, `apk add tmux`, jalankan Fastify

Tidak pakai nginx lagi — Fastify serve via `@fastify/static`.

### docker-compose.yml
```yaml
services:
  tmux-management:
    build: .
    ports:
      - "127.0.0.1:${PORT:-9997}:${PORT:-9997}"
    env_file: .env
    volumes:
      - /tmp:/tmp  # akses tmux socket
    restart: unless-stopped
```

### .env.example
```
API_KEY=change-me-to-a-secure-key
PORT=9997
SWAGGER_ENABLED=true
```

### Tmux Socket Access
Container mount `/tmp` untuk akses tmux socket host (default `/tmp/tmux-{uid}/`). `tmux` diinstall di dalam container via `apk add tmux`.

## Scope Boundaries

### Termasuk:
- REST API CRUD + kontrol untuk sessions, windows, panes
- API key authentication
- Swagger UI auto-generated
- Tutorial frontend (existing, minimal changes)
- Docker single container deployment
- Localhost binding (expose via cloudflared)

### Tidak termasuk:
- Multi-user auth (prepared but not implemented)
- WebSocket real-time updates
- tmux plugin management
- tmux.conf editing via API
- Frontend dashboard untuk kontrol tmux (kontrol via API/Swagger saja)
