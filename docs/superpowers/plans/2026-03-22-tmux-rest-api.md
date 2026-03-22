# Tmux REST API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Fastify REST API server to the existing tmux tutorial project, enabling programmatic control of tmux sessions, windows, and panes via authenticated HTTP endpoints with auto-generated Swagger docs.

**Architecture:** Fastify monolith serves both the REST API (`/api/*`) and the existing React frontend (static build via `@fastify/static`). A `TmuxService` class wraps all tmux binary interactions using `execFile` for safety. API key auth via `.env` protects API routes.

**Tech Stack:** Node.js, Fastify, `@fastify/swagger`, `@fastify/swagger-ui`, `@fastify/static`, `@fastify/rate-limit`, Vitest (testing), React + Vite (existing frontend)

**Spec:** `docs/superpowers/specs/2026-03-22-tmux-rest-api-design.md`

---

## File Structure

```
tmux-management/
├── src/
│   ├── server/
│   │   ├── index.js             # Fastify entry point
│   │   ├── plugins/
│   │   │   ├── auth.js          # API key onRequest hook
│   │   │   └── swagger.js       # Swagger plugin config
│   │   ├── routes/
│   │   │   ├── sessions.js      # /api/sessions routes
│   │   │   ├── windows.js       # /api/sessions/:session/windows routes
│   │   │   └── panes.js         # /api/sessions/:session/windows/:window/panes routes
│   │   └── services/
│   │       └── tmux.js          # TmuxService class
│   ├── frontend/                # Moved from src/ root
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── App.module.css
│   │   ├── components/          # All existing components
│   │   └── sections/            # All existing sections
│   └── index.css                # Global styles (stays at src/ root)
├── tests/
│   ├── services/
│   │   └── tmux.test.js
│   ├── plugins/
│   │   └── auth.test.js
│   └── routes/
│       ├── sessions.test.js
│       ├── windows.test.js
│       └── panes.test.js
├── .env.example
├── .env                         # gitignored
├── Dockerfile
├── docker-compose.yml
├── package.json
├── vite.config.js
└── index.html
```

---

### Task 1: Project Setup — Dependencies & Config

**Files:**
- Modify: `package.json`
- Modify: `vite.config.js`
- Modify: `index.html`
- Modify: `.gitignore`
- Create: `.env.example`
- Create: `.env`

- [ ] **Step 1: Install Fastify and related dependencies**

Run:
```bash
npm install fastify @fastify/static @fastify/swagger @fastify/swagger-ui @fastify/rate-limit dotenv
npm install -D vitest
```

- [ ] **Step 2: Update package.json scripts**

Add to `scripts` in `package.json`:
```json
{
  "start": "node src/server/index.js",
  "dev:server": "node --watch src/server/index.js",
  "dev:frontend": "vite",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

Keep existing `build` and `dev` scripts. Rename `dev` to `dev:frontend`.

- [ ] **Step 3: Update vite.config.js for new frontend path**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist',
  },
})
```

Note: `index.html` stays at project root (Vite convention). The `src` paths in `index.html` and imports will be updated in Task 2 when we move frontend files.

- [ ] **Step 4: Update index.html entry point**

Change the script src to point to new frontend location:
```html
<script type="module" src="/src/frontend/main.jsx"></script>
```

Update title from "Tmux Tutorial" to "Tmux Management".

- [ ] **Step 5: Create .env.example and .env**

`.env.example`:
```
API_KEY=change-me-to-a-secure-key
PORT=9997
SWAGGER_ENABLED=true
```

`.env` (same content but with a real dev key):
```
API_KEY=dev-api-key-12345
PORT=9997
SWAGGER_ENABLED=true
```

- [ ] **Step 6: Add .env to .gitignore**

Append to `.gitignore`:
```
.env
```

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vite.config.js index.html .gitignore .env.example
git commit -m "feat: add Fastify deps, vitest, env config, update vite config"
```

---

### Task 2: Move Frontend Files to src/frontend/

**Files:**
- Move: `src/main.jsx` → `src/frontend/main.jsx`
- Move: `src/App.jsx` → `src/frontend/App.jsx`
- Move: `src/App.module.css` → `src/frontend/App.module.css`
- Move: `src/components/*` → `src/frontend/components/*`
- Move: `src/sections/*` → `src/frontend/sections/*`
- Keep: `src/index.css` stays at `src/` root

- [ ] **Step 1: Create frontend directory and move files**

```bash
mkdir -p src/frontend
mv src/main.jsx src/frontend/
mv src/App.jsx src/frontend/
mv src/App.module.css src/frontend/
mv src/components src/frontend/
mv src/sections src/frontend/
```

- [ ] **Step 2: Update import path in src/frontend/main.jsx**

Change the CSS import from `'./index.css'` to `'../index.css'`:
```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 3: Verify frontend still builds**

Run: `npm run build`
Expected: Build succeeds, output in `dist/`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: move frontend files to src/frontend/"
```

---

### Task 3: TmuxService — Core Service Layer

**Files:**
- Create: `src/server/services/tmux.js`
- Create: `tests/services/tmux.test.js`

- [ ] **Step 1: Write failing tests for TmuxService**

Create `tests/services/tmux.test.js`:
```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TmuxService } from '../../src/server/services/tmux.js'

const tmux = new TmuxService()
const TEST_SESSION = 'test-api-session'

// Clean up any leftover test sessions
async function cleanup() {
  try { await tmux.killSession(TEST_SESSION) } catch {}
  try { await tmux.killSession('test-renamed') } catch {}
}

describe('TmuxService', () => {
  beforeEach(cleanup)
  afterEach(cleanup)

  describe('sessions', () => {
    it('should list sessions', async () => {
      const sessions = await tmux.listSessions()
      expect(Array.isArray(sessions)).toBe(true)
    })

    it('should create and list a session', async () => {
      await tmux.createSession(TEST_SESSION)
      const sessions = await tmux.listSessions()
      const found = sessions.find(s => s.name === TEST_SESSION)
      expect(found).toBeDefined()
      expect(found.name).toBe(TEST_SESSION)
      expect(typeof found.windows).toBe('number')
    })

    it('should kill a session', async () => {
      await tmux.createSession(TEST_SESSION)
      await tmux.killSession(TEST_SESSION)
      const sessions = await tmux.listSessions()
      expect(sessions.find(s => s.name === TEST_SESSION)).toBeUndefined()
    })

    it('should rename a session', async () => {
      await tmux.createSession(TEST_SESSION)
      await tmux.renameSession(TEST_SESSION, 'test-renamed')
      const sessions = await tmux.listSessions()
      expect(sessions.find(s => s.name === 'test-renamed')).toBeDefined()
    })

    it('should throw on duplicate session name', async () => {
      await tmux.createSession(TEST_SESSION)
      await expect(tmux.createSession(TEST_SESSION)).rejects.toThrow()
    })
  })

  describe('windows', () => {
    beforeEach(async () => {
      await tmux.createSession(TEST_SESSION)
    })

    it('should list windows in a session', async () => {
      const windows = await tmux.listWindows(TEST_SESSION)
      expect(windows.length).toBeGreaterThanOrEqual(1)
      expect(windows[0]).toHaveProperty('index')
      expect(windows[0]).toHaveProperty('name')
    })

    it('should create a new window', async () => {
      await tmux.createWindow(TEST_SESSION, 'mywin')
      const windows = await tmux.listWindows(TEST_SESSION)
      expect(windows.find(w => w.name === 'mywin')).toBeDefined()
    })

    it('should kill a window', async () => {
      await tmux.createWindow(TEST_SESSION, 'tokill')
      const windows = await tmux.listWindows(TEST_SESSION)
      const target = windows.find(w => w.name === 'tokill')
      await tmux.killWindow(TEST_SESSION, target.index)
      const after = await tmux.listWindows(TEST_SESSION)
      expect(after.find(w => w.name === 'tokill')).toBeUndefined()
    })

    it('should rename a window', async () => {
      const windows = await tmux.listWindows(TEST_SESSION)
      await tmux.renameWindow(TEST_SESSION, windows[0].index, 'renamed-win')
      const after = await tmux.listWindows(TEST_SESSION)
      expect(after.find(w => w.name === 'renamed-win')).toBeDefined()
    })
  })

  describe('panes', () => {
    beforeEach(async () => {
      await tmux.createSession(TEST_SESSION)
    })

    it('should list panes', async () => {
      const panes = await tmux.listPanes(TEST_SESSION, 0)
      expect(panes.length).toBe(1)
      expect(panes[0]).toHaveProperty('index')
    })

    it('should split pane horizontally', async () => {
      await tmux.splitPane(TEST_SESSION, 0, 'h')
      const panes = await tmux.listPanes(TEST_SESSION, 0)
      expect(panes.length).toBe(2)
    })

    it('should split pane vertically', async () => {
      await tmux.splitPane(TEST_SESSION, 0, 'v')
      const panes = await tmux.listPanes(TEST_SESSION, 0)
      expect(panes.length).toBe(2)
    })

    it('should kill a pane', async () => {
      await tmux.splitPane(TEST_SESSION, 0, 'h')
      await tmux.killPane(TEST_SESSION, 0, 1)
      const panes = await tmux.listPanes(TEST_SESSION, 0)
      expect(panes.length).toBe(1)
    })

    it('should resize a pane', async () => {
      await tmux.splitPane(TEST_SESSION, 0, 'h')
      // Should not throw
      await tmux.resizePane(TEST_SESSION, 0, 0, 'R', 5)
    })
  })

  describe('control', () => {
    beforeEach(async () => {
      await tmux.createSession(TEST_SESSION)
    })

    it('should send keys to a pane', async () => {
      await tmux.sendKeys(TEST_SESSION, 0, 0, 'echo hello')
      // Should not throw
    })

    it('should capture pane output', async () => {
      const content = await tmux.capturePane(TEST_SESSION, 0, 0)
      expect(typeof content).toBe('string')
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/services/tmux.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement TmuxService**

Create `src/server/services/tmux.js`:
```js
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const ALLOWED_SUBCOMMANDS = [
  'list-sessions', 'new-session', 'kill-session', 'rename-session',
  'list-windows', 'new-window', 'kill-window', 'rename-window',
  'list-panes', 'split-window', 'kill-pane', 'resize-pane',
  'send-keys', 'capture-pane',
]

export class TmuxService {
  async execute(subcommand, args = []) {
    if (!ALLOWED_SUBCOMMANDS.includes(subcommand)) {
      throw new Error(`Disallowed tmux subcommand: ${subcommand}`)
    }
    try {
      const { stdout } = await execFileAsync('tmux', [subcommand, ...args])
      return stdout
    } catch (err) {
      const message = (err.stderr || err.message || 'Unknown tmux error').trim()
      throw new Error(message)
    }
  }

  // Sessions
  async listSessions() {
    try {
      const out = await this.execute('list-sessions', [
        '-F', '#{session_name}|#{session_windows}|#{session_created}'
      ])
      return out.trim().split('\n').filter(Boolean).map(line => {
        const [name, windows, created] = line.split('|')
        return { name, windows: parseInt(windows, 10), created: parseInt(created, 10) }
      })
    } catch (err) {
      if (err.message.includes('no server running') || err.message.includes('no sessions')) {
        return []
      }
      throw err
    }
  }

  async createSession(name) {
    await this.execute('new-session', ['-d', '-s', name])
    return { name }
  }

  async killSession(name) {
    await this.execute('kill-session', ['-t', name])
  }

  async renameSession(name, newName) {
    await this.execute('rename-session', ['-t', name, newName])
  }

  // Windows
  async listWindows(session) {
    const out = await this.execute('list-windows', [
      '-t', session,
      '-F', '#{window_index}|#{window_name}|#{window_panes}|#{window_active}'
    ])
    return out.trim().split('\n').filter(Boolean).map(line => {
      const [index, name, panes, active] = line.split('|')
      return { index: parseInt(index, 10), name, panes: parseInt(panes, 10), active: active === '1' }
    })
  }

  async createWindow(session, name) {
    const args = ['-t', session]
    if (name) args.push('-n', name)
    await this.execute('new-window', args)
  }

  async killWindow(session, index) {
    await this.execute('kill-window', ['-t', `${session}:${index}`])
  }

  async renameWindow(session, index, newName) {
    await this.execute('rename-window', ['-t', `${session}:${index}`, newName])
  }

  // Panes
  async listPanes(session, window) {
    const out = await this.execute('list-panes', [
      '-t', `${session}:${window}`,
      '-F', '#{pane_index}|#{pane_width}|#{pane_height}|#{pane_active}'
    ])
    return out.trim().split('\n').filter(Boolean).map(line => {
      const [index, width, height, active] = line.split('|')
      return {
        index: parseInt(index, 10),
        width: parseInt(width, 10),
        height: parseInt(height, 10),
        active: active === '1'
      }
    })
  }

  async splitPane(session, window, direction) {
    const flag = direction === 'h' ? '-h' : '-v'
    await this.execute('split-window', [flag, '-t', `${session}:${window}`])
  }

  async killPane(session, window, index) {
    await this.execute('kill-pane', ['-t', `${session}:${window}.${index}`])
  }

  async resizePane(session, window, index, direction, amount) {
    const dirFlag = { U: '-U', D: '-D', L: '-L', R: '-R' }[direction]
    if (!dirFlag) throw new Error(`Invalid direction: ${direction}`)
    await this.execute('resize-pane', [
      '-t', `${session}:${window}.${index}`, dirFlag, String(amount)
    ])
  }

  // Control
  async sendKeys(session, window, pane, keys) {
    await this.execute('send-keys', ['-t', `${session}:${window}.${pane}`, keys])
  }

  async capturePane(session, window, pane) {
    const out = await this.execute('capture-pane', [
      '-t', `${session}:${window}.${pane}`, '-p'
    ])
    return out
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/services/tmux.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/services/tmux.js tests/services/tmux.test.js
git commit -m "feat: add TmuxService with full CRUD + control operations"
```

---

### Task 4: Auth Plugin

**Files:**
- Create: `src/server/plugins/auth.js`
- Create: `tests/plugins/auth.test.js`

- [ ] **Step 1: Write failing tests for auth plugin**

Create `tests/plugins/auth.test.js`:
```js
import { describe, it, expect, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { authPlugin } from '../../src/server/plugins/auth.js'

async function buildApp(apiKey) {
  const app = Fastify()
  await app.register(authPlugin, { apiKey })
  app.get('/api/test', async () => ({ ok: true }))
  app.get('/health', async () => ({ ok: true }))
  return app
}

describe('authPlugin', () => {
  let app

  beforeEach(async () => {
    app = await buildApp('test-key-123')
  })

  it('should reject /api/* requests without X-API-Key', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/test' })
    expect(res.statusCode).toBe(401)
    expect(res.json()).toEqual({ success: false, error: 'Missing or invalid API key' })
  })

  it('should reject /api/* requests with wrong key', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/test',
      headers: { 'x-api-key': 'wrong-key' }
    })
    expect(res.statusCode).toBe(401)
  })

  it('should allow /api/* requests with correct key', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/test',
      headers: { 'x-api-key': 'test-key-123' }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })
  })

  it('should allow non-/api/ routes without key', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/plugins/auth.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Install fastify-plugin dependency**

Run: `npm install fastify-plugin`

- [ ] **Step 4: Implement auth plugin**

Create `src/server/plugins/auth.js`:
```js
import fp from 'fastify-plugin'

async function auth(fastify, opts) {
  const apiKey = opts.apiKey

  fastify.addHook('onRequest', async (request, reply) => {
    if (!request.url.startsWith('/api/')) return

    const provided = request.headers['x-api-key']
    if (!provided || provided !== apiKey) {
      reply.code(401).send({ success: false, error: 'Missing or invalid API key' })
    }
  })
}

export const authPlugin = fp(auth, { name: 'auth' })
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/plugins/auth.test.js`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/server/plugins/auth.js tests/plugins/auth.test.js package.json package-lock.json
git commit -m "feat: add API key auth plugin for /api/* routes"
```

---

### Task 5: Swagger Plugin

**Files:**
- Create: `src/server/plugins/swagger.js`

- [ ] **Step 1: Create swagger plugin**

Create `src/server/plugins/swagger.js`:
```js
import fp from 'fastify-plugin'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

async function swaggerPlugin(fastify, opts) {
  if (opts.enabled === false) return

  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Tmux Management API',
        description: 'REST API for controlling tmux sessions, windows, and panes',
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          apiKey: {
            type: 'apiKey',
            name: 'X-API-Key',
            in: 'header',
          },
        },
      },
      security: [{ apiKey: [] }],
    },
  })

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
  })
}

export const swaggerSetup = fp(swaggerPlugin, { name: 'swagger' })
```

- [ ] **Step 2: Verify it loads without errors**

Quick smoke test — we'll test this properly with the server in Task 7.

- [ ] **Step 3: Commit**

```bash
git add src/server/plugins/swagger.js
git commit -m "feat: add Swagger/OpenAPI plugin with UI at /docs"
```

---

### Task 6: Session Routes

**Files:**
- Create: `src/server/routes/sessions.js`
- Create: `tests/routes/sessions.test.js`

- [ ] **Step 1: Write failing tests for session routes**

Create `tests/routes/sessions.test.js`:
```js
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import Fastify from 'fastify'
import { authPlugin } from '../../src/server/plugins/auth.js'
import { sessionRoutes } from '../../src/server/routes/sessions.js'
import { TmuxService } from '../../src/server/services/tmux.js'

const API_KEY = 'test-key'
const headers = { 'x-api-key': API_KEY }
const TEST_SESSION = 'route-test-session'

let app
const tmux = new TmuxService()

async function cleanup() {
  try { await tmux.killSession(TEST_SESSION) } catch {}
  try { await tmux.killSession('renamed-session') } catch {}
}

beforeAll(async () => {
  app = Fastify()
  app.decorate('tmux', tmux)
  await app.register(authPlugin, { apiKey: API_KEY })
  await app.register(sessionRoutes, { prefix: '/api' })
})

afterEach(cleanup)
afterAll(async () => {
  await cleanup()
  await app.close()
})

describe('GET /api/sessions', () => {
  it('should return array of sessions', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/sessions', headers })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })
})

describe('POST /api/sessions', () => {
  it('should create a session', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/sessions', headers,
      payload: { name: TEST_SESSION }
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().success).toBe(true)
  })

  it('should reject missing name', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/sessions', headers,
      payload: {}
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('PUT /api/sessions/:name', () => {
  it('should rename a session', async () => {
    await tmux.createSession(TEST_SESSION)
    const res = await app.inject({
      method: 'PUT', url: `/api/sessions/${TEST_SESSION}`, headers,
      payload: { newName: 'renamed-session' }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().success).toBe(true)
  })
})

describe('DELETE /api/sessions/:name', () => {
  it('should kill a session', async () => {
    await tmux.createSession(TEST_SESSION)
    const res = await app.inject({
      method: 'DELETE', url: `/api/sessions/${TEST_SESSION}`, headers
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().success).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/routes/sessions.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement session routes**

Create `src/server/routes/sessions.js`:
```js
export async function sessionRoutes(fastify) {
  const { tmux } = fastify

  fastify.get('/sessions', {
    schema: {
      tags: ['Sessions'],
      summary: 'List all tmux sessions',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  windows: { type: 'integer' },
                  created: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
  }, async () => {
    const data = await tmux.listSessions()
    return { success: true, data }
  })

  fastify.post('/sessions', {
    schema: {
      tags: ['Sessions'],
      summary: 'Create a new session',
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1 },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: { name: { type: 'string' } },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const data = await tmux.createSession(request.body.name)
    reply.code(201)
    return { success: true, data }
  })

  fastify.put('/sessions/:name', {
    schema: {
      tags: ['Sessions'],
      summary: 'Rename a session',
      params: {
        type: 'object',
        properties: { name: { type: 'string' } },
      },
      body: {
        type: 'object',
        required: ['newName'],
        properties: {
          newName: { type: 'string', minLength: 1 },
        },
      },
    },
  }, async (request) => {
    await tmux.renameSession(request.params.name, request.body.newName)
    return { success: true, data: { name: request.body.newName } }
  })

  fastify.delete('/sessions/:name', {
    schema: {
      tags: ['Sessions'],
      summary: 'Kill a session',
      params: {
        type: 'object',
        properties: { name: { type: 'string' } },
      },
    },
  }, async (request) => {
    await tmux.killSession(request.params.name)
    return { success: true, data: null }
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/routes/sessions.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/routes/sessions.js tests/routes/sessions.test.js
git commit -m "feat: add session CRUD routes with JSON schema validation"
```

---

### Task 7: Window Routes

**Files:**
- Create: `src/server/routes/windows.js`
- Create: `tests/routes/windows.test.js`

- [ ] **Step 1: Write failing tests for window routes**

Create `tests/routes/windows.test.js`:
```js
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { authPlugin } from '../../src/server/plugins/auth.js'
import { windowRoutes } from '../../src/server/routes/windows.js'
import { TmuxService } from '../../src/server/services/tmux.js'

const API_KEY = 'test-key'
const headers = { 'x-api-key': API_KEY }
const TEST_SESSION = 'win-route-test'

let app
const tmux = new TmuxService()

async function cleanup() {
  try { await tmux.killSession(TEST_SESSION) } catch {}
}

beforeAll(async () => {
  app = Fastify()
  app.decorate('tmux', tmux)
  await app.register(authPlugin, { apiKey: API_KEY })
  await app.register(windowRoutes, { prefix: '/api' })
})

beforeEach(async () => {
  await cleanup()
  await tmux.createSession(TEST_SESSION)
})

afterAll(async () => {
  await cleanup()
  await app.close()
})

describe('GET /api/sessions/:session/windows', () => {
  it('should list windows', async () => {
    const res = await app.inject({
      method: 'GET', url: `/api/sessions/${TEST_SESSION}/windows`, headers
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(body.data.length).toBeGreaterThanOrEqual(1)
  })
})

describe('POST /api/sessions/:session/windows', () => {
  it('should create a window', async () => {
    const res = await app.inject({
      method: 'POST', url: `/api/sessions/${TEST_SESSION}/windows`, headers,
      payload: { name: 'new-win' }
    })
    expect(res.statusCode).toBe(201)
  })

  it('should create window without name', async () => {
    const res = await app.inject({
      method: 'POST', url: `/api/sessions/${TEST_SESSION}/windows`, headers,
      payload: {}
    })
    expect(res.statusCode).toBe(201)
  })
})

describe('PUT /api/sessions/:session/windows/:index', () => {
  it('should rename a window', async () => {
    const res = await app.inject({
      method: 'PUT', url: `/api/sessions/${TEST_SESSION}/windows/0`, headers,
      payload: { newName: 'renamed' }
    })
    expect(res.statusCode).toBe(200)
  })
})

describe('DELETE /api/sessions/:session/windows/:index', () => {
  it('should kill a window', async () => {
    await tmux.createWindow(TEST_SESSION, 'tokill')
    const windows = await tmux.listWindows(TEST_SESSION)
    const target = windows.find(w => w.name === 'tokill')
    const res = await app.inject({
      method: 'DELETE', url: `/api/sessions/${TEST_SESSION}/windows/${target.index}`, headers
    })
    expect(res.statusCode).toBe(200)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/routes/windows.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement window routes**

Create `src/server/routes/windows.js`:
```js
export async function windowRoutes(fastify) {
  const { tmux } = fastify

  const sessionParam = {
    type: 'object',
    properties: { session: { type: 'string' } },
  }

  const sessionWindowParams = {
    type: 'object',
    properties: {
      session: { type: 'string' },
      index: { type: 'string' },
    },
  }

  fastify.get('/sessions/:session/windows', {
    schema: {
      tags: ['Windows'],
      summary: 'List windows in a session',
      params: sessionParam,
    },
  }, async (request) => {
    const data = await tmux.listWindows(request.params.session)
    return { success: true, data }
  })

  fastify.post('/sessions/:session/windows', {
    schema: {
      tags: ['Windows'],
      summary: 'Create a new window',
      params: sessionParam,
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    await tmux.createWindow(request.params.session, request.body?.name)
    reply.code(201)
    return { success: true, data: null }
  })

  fastify.put('/sessions/:session/windows/:index', {
    schema: {
      tags: ['Windows'],
      summary: 'Rename a window',
      params: sessionWindowParams,
      body: {
        type: 'object',
        required: ['newName'],
        properties: {
          newName: { type: 'string', minLength: 1 },
        },
      },
    },
  }, async (request) => {
    const { session, index } = request.params
    await tmux.renameWindow(session, parseInt(index, 10), request.body.newName)
    return { success: true, data: null }
  })

  fastify.delete('/sessions/:session/windows/:index', {
    schema: {
      tags: ['Windows'],
      summary: 'Kill a window',
      params: sessionWindowParams,
    },
  }, async (request) => {
    const { session, index } = request.params
    await tmux.killWindow(session, parseInt(index, 10))
    return { success: true, data: null }
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/routes/windows.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/routes/windows.js tests/routes/windows.test.js
git commit -m "feat: add window CRUD routes"
```

---

### Task 8: Pane Routes (CRUD + Control)

**Files:**
- Create: `src/server/routes/panes.js`
- Create: `tests/routes/panes.test.js`

- [ ] **Step 1: Write failing tests for pane routes**

Create `tests/routes/panes.test.js`:
```js
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { authPlugin } from '../../src/server/plugins/auth.js'
import { paneRoutes } from '../../src/server/routes/panes.js'
import { TmuxService } from '../../src/server/services/tmux.js'

const API_KEY = 'test-key'
const headers = { 'x-api-key': API_KEY }
const TEST_SESSION = 'pane-route-test'
const BASE = `/api/sessions/${TEST_SESSION}/windows/0/panes`

let app
const tmux = new TmuxService()

async function cleanup() {
  try { await tmux.killSession(TEST_SESSION) } catch {}
}

beforeAll(async () => {
  app = Fastify()
  app.decorate('tmux', tmux)
  await app.register(authPlugin, { apiKey: API_KEY })
  await app.register(paneRoutes, { prefix: '/api' })
})

beforeEach(async () => {
  await cleanup()
  await tmux.createSession(TEST_SESSION)
})

afterAll(async () => {
  await cleanup()
  await app.close()
})

describe('GET .../panes', () => {
  it('should list panes', async () => {
    const res = await app.inject({ method: 'GET', url: BASE, headers })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(body.data.length).toBe(1)
  })
})

describe('POST .../panes', () => {
  it('should split pane horizontally', async () => {
    const res = await app.inject({
      method: 'POST', url: BASE, headers,
      payload: { direction: 'h' }
    })
    expect(res.statusCode).toBe(201)
    const panes = await tmux.listPanes(TEST_SESSION, 0)
    expect(panes.length).toBe(2)
  })

  it('should split pane vertically', async () => {
    const res = await app.inject({
      method: 'POST', url: BASE, headers,
      payload: { direction: 'v' }
    })
    expect(res.statusCode).toBe(201)
  })

  it('should reject invalid direction', async () => {
    const res = await app.inject({
      method: 'POST', url: BASE, headers,
      payload: { direction: 'x' }
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('PUT .../panes/:index/resize', () => {
  it('should resize a pane', async () => {
    await tmux.splitPane(TEST_SESSION, 0, 'h')
    const res = await app.inject({
      method: 'PUT', url: `${BASE}/0/resize`, headers,
      payload: { direction: 'R', amount: 5 }
    })
    expect(res.statusCode).toBe(200)
  })

  it('should reject invalid resize direction', async () => {
    await tmux.splitPane(TEST_SESSION, 0, 'h')
    const res = await app.inject({
      method: 'PUT', url: `${BASE}/0/resize`, headers,
      payload: { direction: 'X', amount: 5 }
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('DELETE .../panes/:index', () => {
  it('should kill a pane', async () => {
    await tmux.splitPane(TEST_SESSION, 0, 'h')
    const res = await app.inject({
      method: 'DELETE', url: `${BASE}/1`, headers
    })
    expect(res.statusCode).toBe(200)
  })
})

describe('POST .../panes/:index/send-keys', () => {
  it('should send keys', async () => {
    const res = await app.inject({
      method: 'POST', url: `${BASE}/0/send-keys`, headers,
      payload: { keys: 'echo test' }
    })
    expect(res.statusCode).toBe(200)
  })
})

describe('GET .../panes/:index/capture', () => {
  it('should capture pane output', async () => {
    const res = await app.inject({
      method: 'GET', url: `${BASE}/0/capture`, headers
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data).toHaveProperty('content')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/routes/panes.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement pane routes**

Create `src/server/routes/panes.js`:
```js
export async function paneRoutes(fastify) {
  const { tmux } = fastify

  const paneParams = {
    type: 'object',
    properties: {
      session: { type: 'string' },
      window: { type: 'string' },
    },
  }

  const paneIndexParams = {
    type: 'object',
    properties: {
      session: { type: 'string' },
      window: { type: 'string' },
      index: { type: 'string' },
    },
  }

  fastify.get('/sessions/:session/windows/:window/panes', {
    schema: {
      tags: ['Panes'],
      summary: 'List panes in a window',
      params: paneParams,
    },
  }, async (request) => {
    const { session, window } = request.params
    const data = await tmux.listPanes(session, parseInt(window, 10))
    return { success: true, data }
  })

  fastify.post('/sessions/:session/windows/:window/panes', {
    schema: {
      tags: ['Panes'],
      summary: 'Split pane',
      params: paneParams,
      body: {
        type: 'object',
        required: ['direction'],
        properties: {
          direction: { type: 'string', enum: ['h', 'v'] },
        },
      },
    },
  }, async (request, reply) => {
    const { session, window } = request.params
    await tmux.splitPane(session, parseInt(window, 10), request.body.direction)
    reply.code(201)
    return { success: true, data: null }
  })

  fastify.put('/sessions/:session/windows/:window/panes/:index/resize', {
    schema: {
      tags: ['Panes'],
      summary: 'Resize a pane',
      params: paneIndexParams,
      body: {
        type: 'object',
        required: ['direction', 'amount'],
        properties: {
          direction: { type: 'string', enum: ['U', 'D', 'L', 'R'] },
          amount: { type: 'integer', minimum: 1 },
        },
      },
    },
  }, async (request) => {
    const { session, window, index } = request.params
    const { direction, amount } = request.body
    await tmux.resizePane(session, parseInt(window, 10), parseInt(index, 10), direction, amount)
    return { success: true, data: null }
  })

  fastify.delete('/sessions/:session/windows/:window/panes/:index', {
    schema: {
      tags: ['Panes'],
      summary: 'Kill a pane',
      params: paneIndexParams,
    },
  }, async (request) => {
    const { session, window, index } = request.params
    await tmux.killPane(session, parseInt(window, 10), parseInt(index, 10))
    return { success: true, data: null }
  })

  fastify.post('/sessions/:session/windows/:window/panes/:index/send-keys', {
    schema: {
      tags: ['Panes'],
      summary: 'Send keys to a pane',
      params: paneIndexParams,
      body: {
        type: 'object',
        required: ['keys'],
        properties: {
          keys: { type: 'string' },
        },
      },
    },
  }, async (request) => {
    const { session, window, index } = request.params
    await tmux.sendKeys(session, parseInt(window, 10), parseInt(index, 10), request.body.keys)
    return { success: true, data: null }
  })

  fastify.get('/sessions/:session/windows/:window/panes/:index/capture', {
    schema: {
      tags: ['Panes'],
      summary: 'Capture pane output',
      params: paneIndexParams,
    },
  }, async (request) => {
    const { session, window, index } = request.params
    const content = await tmux.capturePane(session, parseInt(window, 10), parseInt(index, 10))
    return { success: true, data: { content } }
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/routes/panes.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/routes/panes.js tests/routes/panes.test.js
git commit -m "feat: add pane routes with CRUD, send-keys, and capture"
```

---

### Task 9: Fastify Server Entry Point

**Files:**
- Create: `src/server/index.js`

- [ ] **Step 1: Create the Fastify server entry point**

Create `src/server/index.js`:
```js
import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import rateLimit from '@fastify/rate-limit'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync } from 'node:fs'
import 'dotenv/config'

import { TmuxService } from './services/tmux.js'
import { authPlugin } from './plugins/auth.js'
import { swaggerSetup } from './plugins/swagger.js'
import { sessionRoutes } from './routes/sessions.js'
import { windowRoutes } from './routes/windows.js'
import { paneRoutes } from './routes/panes.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = parseInt(process.env.PORT || '9997', 10)
const API_KEY = process.env.API_KEY
const SWAGGER_ENABLED = process.env.SWAGGER_ENABLED !== 'false'

if (!API_KEY) {
  console.error('ERROR: API_KEY must be set in .env')
  process.exit(1)
}

const app = Fastify({ logger: true })

// Decorate with TmuxService
app.decorate('tmux', new TmuxService())

// Global error handler for tmux errors
app.setErrorHandler((error, request, reply) => {
  const statusCode = reply.statusCode >= 400 ? reply.statusCode : 500
  reply.code(statusCode).send({
    success: false,
    error: error.message,
  })
})

// Plugins
await app.register(swaggerSetup, { enabled: SWAGGER_ENABLED })
await app.register(authPlugin, { apiKey: API_KEY })
await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  keyGenerator: (request) => request.headers['x-api-key'] || request.ip,
  hook: 'onRequest',
  allowList: [], // rate limiting applies globally; non-API routes are fast static serves
})

// API routes
await app.register(sessionRoutes, { prefix: '/api' })
await app.register(windowRoutes, { prefix: '/api' })
await app.register(paneRoutes, { prefix: '/api' })

// Serve static frontend (only if dist/ exists)
const distPath = join(__dirname, '../../dist')
if (existsSync(distPath)) {
  await app.register(fastifyStatic, {
    root: distPath,
    wildcard: false,
  })

  // SPA fallback
  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith('/api/')) {
      reply.code(404).send({ success: false, error: 'Route not found' })
    } else {
      reply.sendFile('index.html')
    }
  })
}

// Start server
try {
  // 0.0.0.0 inside container; docker-compose binds 127.0.0.1 on host side
  await app.listen({ port: PORT, host: '0.0.0.0' })
  console.log(`Tmux Management API running on port ${PORT}`)
  if (SWAGGER_ENABLED) {
    console.log(`Swagger UI: http://localhost:${PORT}/docs`)
  }
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
```

- [ ] **Step 2: Verify server starts and responds**

Run: `node src/server/index.js &` then `curl -s http://localhost:9997/api/sessions -H "X-API-Key: dev-api-key-12345" | head` then `kill %1`

Expected: JSON response with `{ "success": true, "data": [...] }`

- [ ] **Step 3: Commit**

```bash
git add src/server/index.js
git commit -m "feat: add Fastify server entry point with all plugins and routes"
```

---

### Task 10: Update Frontend (Sidebar + Header)

**Files:**
- Modify: `src/frontend/App.jsx`
- Modify: `src/frontend/components/Sidebar.jsx`
- Modify: `src/frontend/components/Sidebar.module.css`

- [ ] **Step 1: Update App.jsx header**

In `src/frontend/App.jsx`, change the header:
```jsx
<div className={styles.header}>
  <h1>Tmux Management</h1>
  <p>Panduan visual interaktif & REST API untuk menguasai tmux</p>
</div>
```

- [ ] **Step 2: Update Sidebar.jsx with API Docs link**

Add an "API Docs" section at the bottom of the sidebar nav in `src/frontend/components/Sidebar.jsx`:

```jsx
<nav className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
  <div className={styles.logo}>$ tmux</div>
  <div className={styles.groupLabel}>Tutorial</div>
  <ul className={styles.nav}>
    {sections.map(({ id, title }) => (
      <li key={id}>
        <a
          href={`#${id}`}
          className={`${styles.navItem} ${activeId === id ? styles.navItemActive : ''}`}
          onClick={handleClick}
        >
          {title}
        </a>
      </li>
    ))}
  </ul>
  <div className={styles.groupLabel}>Resources</div>
  <ul className={styles.nav}>
    <li>
      <a
        href="/docs"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.navItem}
      >
        API Docs
      </a>
    </li>
  </ul>
</nav>
```

- [ ] **Step 3: Add groupLabel style to Sidebar.module.css**

Add to `src/frontend/components/Sidebar.module.css`:
```css
.groupLabel {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
  padding: 16px 24px 4px;
  opacity: 0.7;
}
```

- [ ] **Step 4: Verify frontend builds**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/frontend/App.jsx src/frontend/components/Sidebar.jsx src/frontend/components/Sidebar.module.css
git commit -m "feat: update frontend header and sidebar with API docs link"
```

---

### Task 11: Update Docker Setup

**Files:**
- Modify: `Dockerfile`
- Modify: `docker-compose.yml`
- Delete: `nginx.conf`

- [ ] **Step 1: Rewrite Dockerfile for Fastify**

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
RUN apk add --no-cache tmux
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY src/server ./src/server
COPY .env.example .env.example
EXPOSE 9997
CMD ["node", "src/server/index.js"]
```

- [ ] **Step 2: Update docker-compose.yml**

```yaml
services:
  tmux-management:
    build: .
    ports:
      - "127.0.0.1:${PORT:-9997}:${PORT:-9997}"
    env_file: .env
    volumes:
      - /tmp:/tmp
    restart: unless-stopped
```

- [ ] **Step 3: Delete nginx.conf**

```bash
rm nginx.conf
```

No longer needed — Fastify serves everything.

- [ ] **Step 4: Commit**

```bash
git add Dockerfile docker-compose.yml
git rm nginx.conf
git commit -m "feat: update Docker setup for Fastify, remove nginx"
```

---

### Task 12: Run All Tests & Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Build frontend**

Run: `npm run build`
Expected: Build succeeds, `dist/` created

- [ ] **Step 3: Start server and test manually**

Run:
```bash
node src/server/index.js &
SERVER_PID=$!

# Test auth rejection
curl -s http://localhost:9997/api/sessions | jq .
# Expected: { "success": false, "error": "Missing or invalid API key" }

# Test session CRUD
curl -s -X POST http://localhost:9997/api/sessions \
  -H "X-API-Key: dev-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"name":"test-final"}' | jq .

curl -s http://localhost:9997/api/sessions \
  -H "X-API-Key: dev-api-key-12345" | jq .

curl -s -X DELETE http://localhost:9997/api/sessions/test-final \
  -H "X-API-Key: dev-api-key-12345" | jq .

# Test Swagger UI accessible
curl -s -o /dev/null -w "%{http_code}" http://localhost:9997/docs

kill $SERVER_PID
```

- [ ] **Step 4: Verify frontend served by Fastify**

Run: `node src/server/index.js &` then `curl -s -o /dev/null -w "%{http_code}" http://localhost:9997/` then `kill %1`
Expected: HTTP 200

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: final adjustments from integration testing"
```
