# tmux-api

Stateless REST API server for controlling tmux remotely. Deploy the server, hit endpoints from any language or tool.

## Architecture

```mermaid
graph TB
    Client["Client (curl, SDK, Agent)"] -->|HTTP + X-API-Key| Server

    subgraph Server["tmux-api Server :9993"]
        direction TB
        Auth["Auth Plugin<br/>API Key validation"]
        Swagger["Swagger UI<br/>/docs"]
        RateLimit["Rate Limiter<br/>100 req/min"]

        subgraph Routes["API Routes /api/*"]
            Sessions["Sessions<br/>CRUD"]
            Windows["Windows<br/>CRUD"]
            Panes["Panes<br/>CRUD + Control"]
        end

        Service["TerminalService<br/>execFile wrapper"]
        Static["Static Frontend<br/>Tutorial + Docs"]
    end

    Service -->|execFile| Tmux["tmux binary"]
    Tmux --> Terminal1["Session 1"]
    Tmux --> Terminal2["Session 2"]
    Tmux --> Terminal3["Session N<br/>..."]

    Auth --> Routes
    RateLimit --> Routes
    Routes --> Service
```

## API Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant F as tmux-api
    participant T as tmux

    C->>F: POST /api/sessions {name: "worker-1"}
    F->>F: Validate API Key
    F->>T: tmux new-session -d -s worker-1
    T-->>F: OK
    F-->>C: 201 {success: true, data: {name: "worker-1"}}

    C->>F: POST /api/.../panes/0/send-keys {keys: "claude --chat"}
    F->>T: tmux send-keys -t worker-1:0.0 "claude --chat"
    T-->>F: OK
    F-->>C: 200 {success: true}

    C->>F: GET /api/.../panes/0/capture
    F->>T: tmux capture-pane -t worker-1:0.0 -p
    T-->>F: pane content
    F-->>C: 200 {success: true, data: {content: "..."}}
```

## Quick Start

### Prerequisites

- Node.js 20+
- tmux installed (`apt install tmux` / `apk add tmux`)

### Local

```bash
git clone https://github.com/onchainyaotoshi/tmux-api.git
cd tmux-api

npm install
cp .env.example .env   # edit API_KEY

# Start server
npm start

# Or dev mode (auto-reload)
npm run dev:server
```

### Docker

```bash
cp .env.example .env   # edit API_KEY
docker compose up -d
```

Server runs at `http://127.0.0.1:9993` (localhost only). Port is configurable via `PORT` in `.env`.

### Expose to the Internet

```bash
cloudflared tunnel --url http://localhost:9993
```

## API Endpoints

### Authentication

All `/api/*` endpoints require the header:
```
X-API-Key: your-api-key
```

### Sessions

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/api/sessions` | - | List sessions |
| POST | `/api/sessions` | `{name}` | Create session |
| PUT | `/api/sessions/:name` | `{newName}` | Rename session |
| DELETE | `/api/sessions/:name` | - | Kill session |

### Windows

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/api/sessions/:s/windows` | - | List windows |
| POST | `/api/sessions/:s/windows` | `{name?}` | Create window |
| PUT | `/api/sessions/:s/windows/:i` | `{newName}` | Rename window |
| DELETE | `/api/sessions/:s/windows/:i` | - | Kill window |

### Panes

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `.../:w/panes` | - | List panes |
| POST | `.../:w/panes` | `{direction: "h"\|"v"}` | Split pane |
| PUT | `.../:w/panes/:p/resize` | `{direction: "U"\|"D"\|"L"\|"R", amount}` | Resize |
| DELETE | `.../:w/panes/:p` | - | Kill pane |
| POST | `.../:w/panes/:p/send-keys` | `{keys}` | Send keys |
| GET | `.../:w/panes/:p/capture` | - | Capture output |

### Swagger UI

Open `http://localhost:9993/docs` for interactive API documentation.

## Usage Examples

```bash
API="http://localhost:9993"
KEY="your-api-key"

# Create a session
curl -X POST $API/api/sessions \
  -H "X-API-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"worker-1"}'

# Split pane horizontally
curl -X POST $API/api/sessions/worker-1/windows/0/panes \
  -H "X-API-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d '{"direction":"h"}'

# Send command to pane
curl -X POST $API/api/sessions/worker-1/windows/0/panes/0/send-keys \
  -H "X-API-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d '{"keys":"echo hello"}'

# Capture pane output
curl -s $API/api/sessions/worker-1/windows/0/panes/0/capture \
  -H "X-API-Key: $KEY" | jq .data.content
```

## Project Structure

```
tmux-api/
├── src/
│   ├── server/
│   │   ├── index.js              # Fastify entry point
│   │   ├── plugins/
│   │   │   ├── auth.js           # API key + Bearer token auth
│   │   │   └── swagger.js        # Swagger/OpenAPI
│   │   ├── routes/
│   │   │   ├── terminals.js      # Terminal endpoints (L1)
│   │   │   ├── sessions.js       # Session endpoints (L2)
│   │   │   ├── windows.js        # Window endpoints
│   │   │   └── panes.js          # Pane + control endpoints
│   │   └── services/
│   │       ├── terminal.js       # TerminalService (L1, core)
│   │       └── session.js        # SessionService (L2, stateless wrapper)
│   ├── frontend/                  # React tutorial app
│   └── index.css
├── tests/                         # Vitest integration tests
├── .env.example
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## Development

```bash
npm run dev:server    # Server with auto-reload
npm run dev:frontend  # Vite dev server (frontend only)
npm run build         # Build frontend
npm test              # Run tests
npm run test:watch    # Watch mode
```

## License

MIT
