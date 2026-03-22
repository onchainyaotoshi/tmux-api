# @yaotoshi/tmux-api SDK Design

## Overview

Node.js SDK client for the tmux-api REST server. Published to npm as `@yaotoshi/tmux-api`. Lives in `packages/sdk/` within the tmux-api monorepo.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Location | `packages/sdk/` monorepo | Single repo, shared CI |
| Runtime | Node.js only (ESM) | Backend tool, no browser use case |
| Auth | API key only | Programmatic access; Bearer token is browser flow |
| Publish trigger | Tag `sdk/v*` on main | Explicit, no accidental publishes |
| Pattern | Stripe-style resource classes | Industry standard (Stripe, OpenAI, Anthropic) |

## SDK API Surface

### Client Instantiation

```js
import TmuxApi from '@yaotoshi/tmux-api'

const client = new TmuxApi({
  baseUrl: 'http://localhost:9993',
  apiKey: 'your-api-key',
  timeout: 10000,  // optional, default 10s
  retries: 2,      // optional, default 2
})
```

### Resource Methods

**Terminals** — `client.terminals`

| Method | Params | Maps to |
|--------|--------|---------|
| `.list()` | - | `GET /api/terminals` |
| `.create({ name })` | name: string | `POST /api/terminals` |
| `.update(name, { newName })` | name, newName: string | `PUT /api/terminals/:terminal` |
| `.delete(name)` | name: string | `DELETE /api/terminals/:terminal` |

**Windows** — `client.terminals.windows`

| Method | Params | Maps to |
|--------|--------|---------|
| `.list(terminal)` | terminal: string | `GET /api/terminals/:t/windows` |
| `.create(terminal, { name? })` | terminal, name?: string | `POST /api/terminals/:t/windows` |
| `.update(terminal, index, { newName })` | terminal, index, newName: string | `PUT /api/terminals/:t/windows/:i` |
| `.delete(terminal, index)` | terminal, index: string | `DELETE /api/terminals/:t/windows/:i` |

**Panes** — `client.terminals.panes`

| Method | Params | Maps to |
|--------|--------|---------|
| `.list(terminal, window)` | terminal, window: string | `GET /api/terminals/:t/windows/:w/panes` |
| `.split(terminal, window, { direction })` | direction: "h" \| "v" | `POST /api/terminals/:t/windows/:w/panes` |
| `.resize(terminal, window, pane, { direction, amount })` | direction: U/D/L/R, amount: int | `PUT /api/terminals/:terminal/windows/:window/panes/:index/resize` |
| `.delete(terminal, window, pane)` | all strings | `DELETE /api/terminals/:terminal/windows/:window/panes/:index` |
| `.sendKeys(terminal, window, pane, { keys })` | keys: string | `POST /api/terminals/:terminal/windows/:window/panes/:index/send-keys` |
| `.capture(terminal, window, pane)` | all strings | `GET /api/terminals/:terminal/windows/:window/panes/:index/capture` |

Note: `window` and `pane` params are numeric string identifiers (`"0"`, `"1"`). SDK accepts `string | number` and coerces to string for URL construction.

**Sessions** — `client.sessions`

| Method | Params | Maps to |
|--------|--------|---------|
| `.list()` | - | `GET /api/sessions` |
| `.create({ name, command, cwd? })` | name, command: string, cwd?: string | `POST /api/sessions` |
| `.get(name)` | name: string | `GET /api/sessions/:name` |
| `.health(name)` | name: string | `GET /api/sessions/:name/health` |
| `.task(name, { input })` | name, input: string | `POST /api/sessions/:name/task` |
| `.delete(name)` | name: string | `DELETE /api/sessions/:name` |

## Architecture

```
packages/sdk/
├── src/
│   ├── index.js          # TmuxApi class, exports default
│   ├── client.js         # Base HTTP client (fetch, auth, retries, errors)
│   ├── resources/
│   │   ├── terminals.js  # Terminals + Windows + Panes resource classes
│   │   └── sessions.js   # Sessions resource class
│   └── errors.js         # Error class hierarchy
├── package.json          # @yaotoshi/tmux-api
├── README.md             # Usage docs + badge
└── tests/
    ├── client.test.js
    ├── terminals.test.js
    └── sessions.test.js
```

### Class Structure

```
TmuxApi (entry point)
├── .terminals → Terminals (resource class)
│   ├── .windows → Windows (resource class)
│   └── .panes → Panes (resource class)
└── .sessions → Sessions (resource class)

BaseClient (shared)
├── fetch wrapper with auth headers
├── retry logic (exponential backoff, 500ms base delay, 2x multiplier)
│   ├── retryable: 5xx, 429 (uses Retry-After if present)
│   ├── not retryable: 4xx (except 429)
│   └── only idempotent methods (GET, PUT, DELETE) auto-retry; POST does not retry
├── timeout handling (AbortController, default 10s)
└── response unwrapping ({success, data} → data)

Resource base class:
├── constructor(client, basePath)
├── buildUrl(...segments) → joins basePath + segments
├── get/post/put/delete delegate to this.client with built URL
└── returns unwrapped data (not the envelope)

Terminals creates Windows and Panes in its constructor, sharing the same BaseClient:
  constructor(client) {
    super(client, '/api/terminals')
    this.windows = new Windows(client)
    this.panes = new Panes(client)
  }
```

### Error Handling

SDK unwraps the `{success, data/error}` envelope. On error, throws typed exceptions:

```js
import TmuxApi, {
  ApiError,           // base class
  ValidationError,     // 400
  AuthenticationError, // 401
  NotFoundError,       // 404
  ConflictError,       // 409
  RateLimitError,      // 429
  ServerError,         // 500
} from '@yaotoshi/tmux-api'

try {
  await client.terminals.create({ name: 'worker-1' })
} catch (err) {
  if (err instanceof ConflictError) {
    // session already exists
  }
  console.error(err.status, err.message)
}
```

Error class properties: `status` (HTTP code), `message` (from API error field).

`RateLimitError` additionally exposes `retryAfter` (seconds from `Retry-After` header).

### Response Unwrapping

SDK strips the envelope. Users get data directly:

```js
// API returns: { success: true, data: [{ name: "s1", windows: 2 }] }
// SDK returns: [{ name: "s1", windows: 2 }]
const terminals = await client.terminals.list()

// API returns: { success: true, data: { content: "..." } }
// SDK returns: { content: "..." }
const output = await client.terminals.panes.capture('s1', '0', '0')
```

## npm Package

### package.json

```json
{
  "name": "@yaotoshi/tmux-api",
  "version": "0.1.0",
  "description": "Node.js SDK for tmux-api — control tmux sessions via REST",
  "type": "module",
  "main": "src/index.js",
  "exports": {
    ".": "./src/index.js"
  },
  "engines": { "node": ">=18" },
  "files": ["src/"],
  "keywords": ["tmux", "api", "sdk", "terminal", "session"],
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/onchainyaotoshi/tmux-api",
    "directory": "packages/sdk"
  }
}
```

Zero dependencies — uses native `fetch` (Node 18+).

### README.md (SDK)

Includes:
- npm version badge
- Installation (`npm install @yaotoshi/tmux-api`)
- Quick start example
- Full API reference table
- Error handling example
- Link to server repo

### Root README.md Badge

Add npm badge to root README.md:

```md
[![npm](https://img.shields.io/npm/v/@yaotoshi/tmux-api)](https://www.npmjs.com/package/@yaotoshi/tmux-api)
```

## CI/CD: GitHub Actions

### `.github/workflows/publish-sdk.yml`

Triggers on: push tag matching `sdk/v*` to main.

Steps:
1. Checkout repo
2. Setup Node 20
3. `cd packages/sdk && npm ci` (no deps expected, but future-proof)
4. Run SDK tests
5. `npm publish --access public`

Uses `NPM_TOKEN` secret for auth.

### Release Flow

```
1. Make changes in packages/sdk/
2. Update packages/sdk/package.json version
3. Commit, merge to main via normal git flow
4. Tag: git tag sdk/v0.1.0 && git push --tags
5. GitHub Actions auto-publishes to npm
```

## Testing

Unit tests with Vitest (shared from root). Mock `fetch` — no real server needed.

Test coverage:
- Client: auth headers, retries, timeout, error mapping
- Each resource: correct URL construction, params passed, response unwrapping
- Errors: correct class thrown per status code

## Out of Scope

- TypeScript types (can add later)
- Browser/edge runtime support
- Bearer token auth
- Auto-pagination (no paginated endpoints)
- Streaming
- CLI tool
