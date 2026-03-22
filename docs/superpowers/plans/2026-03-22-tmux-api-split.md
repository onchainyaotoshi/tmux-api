# tmux-api Split — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Foreman repo into a stateless tmux REST API by removing all stateful components (database, agents, events) and rewriting SessionService to be stateless.

**Architecture:** L1 (TerminalService) stays unchanged. L2 (SessionService) becomes a stateless convenience wrapper over L1 — no database, no UUIDs, sessions identified by name. All agent/event/orchestration code is removed. Frontend is stripped to public pages only (Home, About Tmux, Swagger).

**Tech Stack:** Fastify, React, Vite, Tailwind CSS v4, shadcn/ui (unchanged — just removing code)

**Spec:** `docs/superpowers/specs/2026-03-22-project-split-design.md`

---

## File Map

### Files to create
- (none — this is a removal/rewrite task)

### Files to modify
- `src/server/services/session.js` — rewrite to stateless
- `src/server/routes/sessions.js` — `:id` → `:name`, remove DB-dependent fields
- `src/server/plugins/auth.js` — remove event route bypass
- `src/server/index.js` — remove DB, agent, event, health, authProxy imports/wiring
- `src/frontend/App.jsx` — remove protected routes, auth layout, callback
- `src/frontend/components/Sidebar.jsx` — remove auth, simplify nav
- `src/frontend/layouts/AppLayout.jsx` — no changes needed (keep as-is)
- `package.json` — rename, remove `better-sqlite3` and `@yaotoshi/auth-sdk`
- `.env.example` — remove `VITE_*` variables
- `README.md` — update for tmux-api identity
- `tests/services/session.test.js` — rewrite for stateless service
- `tests/routes/sessions.test.js` — rewrite for name-based routes, no DB
- `tests/plugins/auth.test.js` — remove event bypass test if any

### Files to delete
- `src/server/services/database.js`
- `src/server/services/agent.js`
- `src/server/routes/agents.js`
- `src/server/routes/events.js`
- `src/server/routes/health.js`
- `src/server/routes/authProxy.js`
- `src/frontend/pages/SessionsPage.jsx`
- `src/frontend/pages/AgentsPage.jsx`
- `src/frontend/pages/CallbackPage.jsx`
- `src/frontend/components/ProtectedRoute.jsx`
- `src/frontend/components/ConfirmDialog.jsx`
- `src/frontend/components/TerminalViewer.jsx`
- `src/frontend/layouts/AuthLayout.jsx`
- `src/frontend/lib/auth.js`
- `src/frontend/lib/api.js`
- `tests/services/agent.test.js`
- `tests/services/database.test.js`
- `tests/routes/agents.test.js`
- `tests/routes/events.test.js`
- `tests/routes/health.test.js`

---

## Task 1: Rewrite SessionService to be stateless

**Files:**
- Modify: `src/server/services/session.js`
- Create: `tests/services/session.test.js` (rewrite)

### Step 1: Write the new SessionService tests

- [ ] **Replace `tests/services/session.test.js` with stateless tests**

```javascript
import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { SessionService } from '../../src/server/services/session.js'
import { TerminalService } from '../../src/server/services/terminal.js'

const SESSION_PREFIX = 'session-'
let sessionService, tmux

beforeAll(() => {
  tmux = new TerminalService()
  sessionService = new SessionService(tmux)
})

afterEach(async () => {
  // Clean up any test sessions
  const sessions = await sessionService.list()
  for (const s of sessions) {
    try { await sessionService.kill(s.name) } catch {}
  }
})

describe('SessionService', () => {
  describe('spawn', () => {
    it('should create a tmux session and return session info', async () => {
      const session = await sessionService.spawn('test-ss1', 'bash')
      expect(session.name).toBe('test-ss1')
      expect(session.alive).toBe(true)

      const alive = await tmux.hasSession(`${SESSION_PREFIX}test-ss1`)
      expect(alive).toBe(true)
    })

    it('should spawn with cwd', async () => {
      const session = await sessionService.spawn('cwd-ss1', 'bash', '/tmp')
      expect(session.name).toBe('cwd-ss1')
      expect(session.alive).toBe(true)
    })

    it('should reject duplicate session names', async () => {
      await sessionService.spawn('dup-ss1', 'bash')
      await expect(sessionService.spawn('dup-ss1', 'bash'))
        .rejects.toThrow(/already exists/)
    })
  })

  describe('sendTask', () => {
    it('should send input to session', async () => {
      await sessionService.spawn('task-ss1', 'bash')
      // Should not throw
      await sessionService.sendTask('task-ss1', 'echo hello')
    })

    it('should throw for nonexistent session', async () => {
      await expect(sessionService.sendTask('nonexistent', 'echo hi'))
        .rejects.toThrow()
    })
  })

  describe('getOutput', () => {
    it('should capture pane output', async () => {
      await sessionService.spawn('out-ss1', 'bash')
      await tmux.sendKeys(`${SESSION_PREFIX}out-ss1`, '0', '0', 'echo tmuxapi-test')
      await tmux.sendKeys(`${SESSION_PREFIX}out-ss1`, '0', '0', 'Enter')
      await new Promise(r => setTimeout(r, 500))
      const output = await sessionService.getOutput('out-ss1')
      expect(output).toContain('tmuxapi-test')
    })
  })

  describe('kill', () => {
    it('should kill tmux session', async () => {
      await sessionService.spawn('kill-ss1', 'bash')
      await sessionService.kill('kill-ss1')
      const alive = await tmux.hasSession(`${SESSION_PREFIX}kill-ss1`)
      expect(alive).toBe(false)
    })

    it('should throw for nonexistent session', async () => {
      await expect(sessionService.kill('nonexistent'))
        .rejects.toThrow()
    })
  })

  describe('list', () => {
    it('should list managed sessions from tmux', async () => {
      await sessionService.spawn('list-ss1', 'bash')
      await sessionService.spawn('list-ss2', 'bash')
      const sessions = await sessionService.list()
      const names = sessions.map(s => s.name)
      expect(names).toContain('list-ss1')
      expect(names).toContain('list-ss2')
    })

    it('should not list non-managed tmux sessions', async () => {
      await tmux.createSession('unmanaged-test')
      await sessionService.spawn('managed-ss1', 'bash')
      const sessions = await sessionService.list()
      const names = sessions.map(s => s.name)
      expect(names).toContain('managed-ss1')
      expect(names).not.toContain('unmanaged-test')
      await tmux.killSession('unmanaged-test')
    })
  })

  describe('health', () => {
    it('should return alive=true for running session', async () => {
      await sessionService.spawn('health-ss1', 'bash')
      const health = await sessionService.health('health-ss1')
      expect(health.alive).toBe(true)
    })

    it('should return alive=false for dead session', async () => {
      await sessionService.spawn('health-ss2', 'bash')
      await tmux.killSession(`${SESSION_PREFIX}health-ss2`)
      const health = await sessionService.health('health-ss2')
      expect(health.alive).toBe(false)
    })
  })
})
```

- [ ] **Run tests to verify they fail**

Run: `npx vitest run tests/services/session.test.js`
Expected: FAIL — SessionService constructor expects `(terminal, db)` but test passes only `(terminal)`

### Step 2: Rewrite SessionService

- [ ] **Replace `src/server/services/session.js` with stateless implementation**

```javascript
const SESSION_PREFIX = 'session-'

export class SessionService {
  constructor(terminal) {
    this.terminal = terminal
  }

  #tmuxName(name) {
    return `${SESSION_PREFIX}${name}`
  }

  async spawn(name, command, cwd) {
    const tmuxName = this.#tmuxName(name)

    // Check for name collision before creating
    if (await this.terminal.hasSession(tmuxName)) {
      throw new Error(`Session already exists: ${name}`)
    }

    await this.terminal.createSession(tmuxName, cwd || undefined)
    await this.terminal.sendKeys(tmuxName, '0', '0', command)
    await this.terminal.sendKeys(tmuxName, '0', '0', 'Enter')

    return { name, alive: true }
  }

  async sendTask(name, input) {
    const tmuxName = this.#tmuxName(name)
    if (!(await this.terminal.hasSession(tmuxName))) {
      throw new Error(`Session not found: ${name}`)
    }
    await this.terminal.sendKeys(tmuxName, '0', '0', input)
    await this.terminal.sendKeys(tmuxName, '0', '0', 'Enter')
  }

  async getOutput(name) {
    const tmuxName = this.#tmuxName(name)
    try {
      return await this.terminal.capturePane(tmuxName, '0', '0')
    } catch {
      return ''
    }
  }

  async kill(name) {
    const tmuxName = this.#tmuxName(name)
    if (!(await this.terminal.hasSession(tmuxName))) {
      throw new Error(`Session not found: ${name}`)
    }
    await this.terminal.killSession(tmuxName)
  }

  async list() {
    const allSessions = await this.terminal.listSessions()
    return allSessions
      .filter(s => s.name.startsWith(SESSION_PREFIX))
      .map(s => ({
        name: s.name.slice(SESSION_PREFIX.length),
        tmux_session: s.name,
        alive: true,
      }))
  }

  async health(name) {
    const tmuxName = this.#tmuxName(name)
    const alive = await this.terminal.hasSession(tmuxName)
    return { name, tmux_session: tmuxName, alive }
  }
}
```

- [ ] **Run tests to verify they pass**

Run: `npx vitest run tests/services/session.test.js`
Expected: ALL PASS

- [ ] **Commit**

```bash
git add src/server/services/session.js tests/services/session.test.js
git commit -m "refactor: rewrite SessionService to be stateless — no DB, name-based"
```

---

## Task 2: Update session routes for stateless API

**Files:**
- Modify: `src/server/routes/sessions.js`
- Rewrite: `tests/routes/sessions.test.js`

### Step 1: Write the new session route tests

- [ ] **Replace `tests/routes/sessions.test.js` with stateless route tests**

```javascript
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import Fastify from 'fastify'
import { authPlugin } from '../../src/server/plugins/auth.js'
import { sessionRoutes } from '../../src/server/routes/sessions.js'
import { TerminalService } from '../../src/server/services/terminal.js'
import { SessionService } from '../../src/server/services/session.js'

const API_KEY = 'test-key'
const headers = { 'x-api-key': API_KEY }
const SESSION_PREFIX = 'session-'

let app, terminal, sessionService

beforeAll(async () => {
  terminal = new TerminalService()
  sessionService = new SessionService(terminal)

  app = Fastify()
  app.decorate('terminal', terminal)
  app.decorate('sessionService', sessionService)
  await app.register(authPlugin, { apiKey: API_KEY })
  await app.register(sessionRoutes, { prefix: '/api' })
})

afterEach(async () => {
  const sessions = await sessionService.list()
  for (const s of sessions) {
    try { await sessionService.kill(s.name) } catch {}
  }
})

afterAll(async () => {
  await app.close()
})

describe('POST /api/sessions', () => {
  it('should require auth', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/sessions',
      payload: { name: 'auth-test', command: 'bash' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('should spawn a session', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/sessions', headers,
      payload: { name: 'spawn-rt', command: 'bash' },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(body.data.name).toBe('spawn-rt')
    expect(body.data.alive).toBe(true)
  })

  it('should spawn with cwd', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/sessions', headers,
      payload: { name: 'cwd-rt', command: 'bash', cwd: '/tmp' },
    })
    expect(res.statusCode).toBe(201)
  })

  it('should reject invalid name', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/sessions', headers,
      payload: { name: 'bad name!', command: 'bash' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('should reject duplicate name', async () => {
    await app.inject({
      method: 'POST', url: '/api/sessions', headers,
      payload: { name: 'dup-rt', command: 'bash' },
    })
    const res = await app.inject({
      method: 'POST', url: '/api/sessions', headers,
      payload: { name: 'dup-rt', command: 'bash' },
    })
    expect(res.statusCode).toBe(409)
  })
})

describe('GET /api/sessions', () => {
  it('should list sessions', async () => {
    await app.inject({
      method: 'POST', url: '/api/sessions', headers,
      payload: { name: 'list-rt', command: 'bash' },
    })
    const res = await app.inject({
      method: 'GET', url: '/api/sessions', headers,
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })
})

describe('GET /api/sessions/:name', () => {
  it('should return session detail with output', async () => {
    await app.inject({
      method: 'POST', url: '/api/sessions', headers,
      payload: { name: 'detail-rt', command: 'bash' },
    })
    const res = await app.inject({
      method: 'GET', url: '/api/sessions/detail-rt', headers,
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.name).toBe('detail-rt')
    expect(res.json().data.output).toBeDefined()
  })

  it('should 404 for unknown session', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/sessions/nonexistent', headers,
    })
    expect(res.statusCode).toBe(404)
  })
})

describe('POST /api/sessions/:name/task', () => {
  it('should send task to session', async () => {
    await app.inject({
      method: 'POST', url: '/api/sessions', headers,
      payload: { name: 'task-rt', command: 'bash' },
    })
    const res = await app.inject({
      method: 'POST', url: '/api/sessions/task-rt/task', headers,
      payload: { input: 'echo hello' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().success).toBe(true)
  })

  it('should 404 for unknown session', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/sessions/nonexistent/task', headers,
      payload: { input: 'echo hi' },
    })
    expect(res.statusCode).toBe(404)
  })
})

describe('DELETE /api/sessions/:name', () => {
  it('should kill session', async () => {
    await app.inject({
      method: 'POST', url: '/api/sessions', headers,
      payload: { name: 'kill-rt', command: 'bash' },
    })
    const res = await app.inject({
      method: 'DELETE', url: '/api/sessions/kill-rt', headers,
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().success).toBe(true)
  })

  it('should 404 for unknown session', async () => {
    const res = await app.inject({
      method: 'DELETE', url: '/api/sessions/nonexistent', headers,
    })
    expect(res.statusCode).toBe(404)
  })
})

describe('GET /api/sessions/:name/health', () => {
  it('should return health for alive session', async () => {
    await app.inject({
      method: 'POST', url: '/api/sessions', headers,
      payload: { name: 'health-rt', command: 'bash' },
    })
    const res = await app.inject({
      method: 'GET', url: '/api/sessions/health-rt/health', headers,
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.alive).toBe(true)
  })

  it('should return alive=false for dead session', async () => {
    await app.inject({
      method: 'POST', url: '/api/sessions', headers,
      payload: { name: 'health-dead-rt', command: 'bash' },
    })
    await terminal.killSession(`${SESSION_PREFIX}health-dead-rt`)
    const res = await app.inject({
      method: 'GET', url: '/api/sessions/health-dead-rt/health', headers,
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.alive).toBe(false)
  })
})
```

- [ ] **Run tests to verify they fail**

Run: `npx vitest run tests/routes/sessions.test.js`
Expected: FAIL — routes still use `:id` and expect DB

### Step 2: Rewrite session routes

- [ ] **Replace `src/server/routes/sessions.js`**

```javascript
const namePattern = '^[a-zA-Z0-9_-]+$'

export async function sessionRoutes(fastify) {
  const { sessionService } = fastify

  // POST /api/sessions — spawn session
  fastify.post('/sessions', {
    schema: {
      tags: ['Sessions'],
      summary: 'Spawn a new session',
      body: {
        type: 'object',
        required: ['name', 'command'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 128, pattern: namePattern },
          command: { type: 'string', minLength: 1, maxLength: 4096 },
          cwd: { type: 'string', pattern: '^/', maxLength: 4096 },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { name, command, cwd } = request.body
      const data = await sessionService.spawn(name, command, cwd)
      reply.code(201)
      return { success: true, data }
    } catch (err) {
      if (err.message.includes('already exists')) {
        reply.code(409)
      } else {
        reply.code(500)
      }
      return { success: false, error: err.message }
    }
  })

  // GET /api/sessions — list sessions
  fastify.get('/sessions', {
    schema: {
      tags: ['Sessions'],
      summary: 'List all managed sessions',
    },
  }, async () => {
    const data = await sessionService.list()
    return { success: true, data }
  })

  // GET /api/sessions/:name — session detail
  fastify.get('/sessions/:name', {
    schema: {
      tags: ['Sessions'],
      summary: 'Get session detail with output',
      params: {
        type: 'object',
        properties: { name: { type: 'string', pattern: namePattern } },
      },
    },
  }, async (request, reply) => {
    try {
      const { name } = request.params
      const health = await sessionService.health(name)
      if (!health.alive) {
        reply.code(404)
        return { success: false, error: `Session not found: ${name}` }
      }
      const output = await sessionService.getOutput(name)
      return { success: true, data: { ...health, output } }
    } catch (err) {
      reply.code(404)
      return { success: false, error: err.message }
    }
  })

  // POST /api/sessions/:name/task — send task
  fastify.post('/sessions/:name/task', {
    schema: {
      tags: ['Sessions'],
      summary: 'Send task to session',
      params: {
        type: 'object',
        properties: { name: { type: 'string', pattern: namePattern } },
      },
      body: {
        type: 'object',
        required: ['input'],
        properties: {
          input: { type: 'string', minLength: 1, maxLength: 4096 },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { name } = request.params
      await sessionService.sendTask(name, request.body.input)
      return { success: true, data: { name, task_sent: true } }
    } catch (err) {
      if (err.message.includes('not found')) {
        reply.code(404)
      } else {
        reply.code(500)
      }
      return { success: false, error: err.message }
    }
  })

  // DELETE /api/sessions/:name — kill session
  fastify.delete('/sessions/:name', {
    schema: {
      tags: ['Sessions'],
      summary: 'Kill a session',
      params: {
        type: 'object',
        properties: { name: { type: 'string', pattern: namePattern } },
      },
    },
  }, async (request, reply) => {
    try {
      await sessionService.kill(request.params.name)
      return { success: true, data: { name: request.params.name, killed: true } }
    } catch (err) {
      if (err.message.includes('not found')) {
        reply.code(404)
      } else {
        reply.code(500)
      }
      return { success: false, error: err.message }
    }
  })

  // GET /api/sessions/:name/health — health check
  fastify.get('/sessions/:name/health', {
    schema: {
      tags: ['Sessions'],
      summary: 'Health check single session',
      params: {
        type: 'object',
        properties: { name: { type: 'string', pattern: namePattern } },
      },
    },
  }, async (request, reply) => {
    try {
      const data = await sessionService.health(request.params.name)
      return { success: true, data }
    } catch (err) {
      reply.code(404)
      return { success: false, error: err.message }
    }
  })
}
```

- [ ] **Run tests to verify they pass**

Run: `npx vitest run tests/routes/sessions.test.js`
Expected: ALL PASS

- [ ] **Commit**

```bash
git add src/server/routes/sessions.js tests/routes/sessions.test.js
git commit -m "refactor: rewrite session routes — name-based, no DB dependency"
```

---

## Task 3: Remove backend stateful code

**Files:**
- Delete: `src/server/services/database.js`, `src/server/services/agent.js`
- Delete: `src/server/routes/agents.js`, `src/server/routes/events.js`, `src/server/routes/health.js`, `src/server/routes/authProxy.js`
- Delete: `tests/services/agent.test.js`, `tests/services/database.test.js`, `tests/routes/agents.test.js`, `tests/routes/events.test.js`, `tests/routes/health.test.js`
- Modify: `src/server/plugins/auth.js`
- Modify: `src/server/index.js`

### Step 1: Clean up auth plugin

- [ ] **Remove event route bypass from `src/server/plugins/auth.js`**

Remove lines 10-11 (the event endpoint bypass):

```javascript
    // Events endpoint uses per-session token auth, not API key
    if (request.method === 'POST' && /^\/api\/sessions\/[^/]+\/events(\?|$)/.test(request.url)) return
```

The auth plugin should become:

```javascript
import fp from 'fastify-plugin'

async function auth(fastify, opts) {
  const apiKey = opts.apiKey
  const authAccountsUrl = opts.authAccountsUrl

  fastify.addHook('onRequest', async (request, reply) => {
    if (!request.url.startsWith('/api/')) return

    // Try API key first
    const providedKey = request.headers['x-api-key']
    if (providedKey && providedKey === apiKey) return

    // Try Bearer token
    const authHeader = request.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ') && authAccountsUrl) {
      try {
        const res = await fetch(`${authAccountsUrl}/api/proxy/me`, {
          headers: { authorization: authHeader },
        })
        if (res.ok) return
      } catch {
        // Fall through to 401
      }
    }

    reply.code(401).send({ success: false, error: 'Unauthorized' })
  })
}

export const authPlugin = fp(auth, { name: 'auth' })
```

### Step 2: Delete stateful files

- [ ] **Delete all stateful backend files and their tests**

```bash
rm src/server/services/database.js
rm src/server/services/agent.js
rm src/server/routes/agents.js
rm src/server/routes/events.js
rm src/server/routes/health.js
rm src/server/routes/authProxy.js
rm tests/services/agent.test.js
rm tests/services/database.test.js
rm tests/routes/agents.test.js
rm tests/routes/events.test.js
rm tests/routes/health.test.js
```

- [ ] **Commit deletions**

```bash
git add -A
git commit -m "refactor: delete database, agent, event, health, authProxy files"
```

### Step 3: Rewrite index.js

- [ ] **Rewrite `src/server/index.js` to remove all DB/agent/event wiring**

```javascript
import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import rateLimit from '@fastify/rate-limit'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync } from 'node:fs'
import 'dotenv/config'

import { TerminalService } from './services/terminal.js'
import { SessionService } from './services/session.js'
import { authPlugin } from './plugins/auth.js'
import { swaggerSetup } from './plugins/swagger.js'
import { terminalRoutes } from './routes/terminals.js'
import { windowRoutes } from './routes/windows.js'
import { paneRoutes } from './routes/panes.js'
import { sessionRoutes } from './routes/sessions.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = parseInt(process.env.PORT || '9993', 10)
const API_KEY = process.env.API_KEY
const AUTH_ACCOUNTS_URL = process.env.AUTH_ACCOUNTS_URL
const SWAGGER_ENABLED = process.env.SWAGGER_ENABLED !== 'false'

if (!API_KEY) {
  console.error('ERROR: API_KEY must be set in .env')
  process.exit(1)
}

const app = Fastify({ logger: true })

// Decorate with services
const terminal = new TerminalService()
app.decorate('terminal', terminal)
app.decorate('sessionService', new SessionService(terminal))

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
await app.register(authPlugin, { apiKey: API_KEY, authAccountsUrl: AUTH_ACCOUNTS_URL })
await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  keyGenerator: (request) => request.headers['x-api-key'] || request.headers['authorization'] || request.ip,
  hook: 'onRequest',
  allowList: [],
})

// API routes
await app.register(terminalRoutes, { prefix: '/api' })
await app.register(windowRoutes, { prefix: '/api' })
await app.register(paneRoutes, { prefix: '/api' })
await app.register(sessionRoutes, { prefix: '/api' })

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
  await app.listen({ port: PORT, host: '0.0.0.0' })
  console.log(`tmux-api running on port ${PORT}`)
  if (SWAGGER_ENABLED) {
    console.log(`Swagger UI: http://localhost:${PORT}/docs`)
  }
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
```

- [ ] **Run all tests**

Run: `npm test`
Expected: ALL PASS (terminal, session, pane, window, auth route tests)

- [ ] **Commit**

```bash
git add src/server/index.js src/server/plugins/auth.js
git commit -m "refactor: rewrite index.js and auth plugin — stateless backend"
```

---

## Task 4: Strip frontend to public pages only

**Files:**
- Delete: `src/frontend/pages/SessionsPage.jsx`, `src/frontend/pages/AgentsPage.jsx`, `src/frontend/pages/CallbackPage.jsx`
- Delete: `src/frontend/components/ProtectedRoute.jsx`, `src/frontend/components/ConfirmDialog.jsx`, `src/frontend/components/TerminalViewer.jsx`
- Delete: `src/frontend/layouts/AuthLayout.jsx`
- Delete: `src/frontend/lib/auth.js`, `src/frontend/lib/api.js`
- Modify: `src/frontend/App.jsx`
- Modify: `src/frontend/components/Sidebar.jsx`

### Step 1: Delete frontend files

- [ ] **Delete all auth/protected frontend files**

```bash
rm src/frontend/pages/SessionsPage.jsx
rm src/frontend/pages/AgentsPage.jsx
rm src/frontend/pages/CallbackPage.jsx
rm src/frontend/components/ProtectedRoute.jsx
rm src/frontend/components/ConfirmDialog.jsx
rm src/frontend/components/TerminalViewer.jsx
rm src/frontend/layouts/AuthLayout.jsx
rm src/frontend/lib/auth.js
rm src/frontend/lib/api.js
```

### Step 2: Simplify App.jsx

- [ ] **Rewrite `src/frontend/App.jsx` — public routes only**

```jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './layouts/AppLayout.jsx'
import HomePage from './pages/HomePage.jsx'
import AboutTmuxPage from './pages/AboutTmuxPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about-tmux" element={<AboutTmuxPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
```

### Step 3: Simplify Sidebar

- [ ] **Rewrite `src/frontend/components/Sidebar.jsx` — no auth, fewer nav items**

```jsx
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { BookOpen, FileText, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'

const navItems = [
  { to: '/about-tmux', label: 'About Tmux', icon: BookOpen },
]

function SidebarNav({ onNavigate }) {
  const linkClass = ({ isActive }) =>
    cn(
      'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
      'hover:bg-accent hover:text-accent-foreground',
      isActive
        ? 'border-l-2 border-primary bg-accent/50 text-foreground font-medium'
        : 'border-l-2 border-transparent text-muted-foreground'
    )

  return (
    <div className="flex h-full flex-col bg-sidebar-background border-r border-sidebar-border">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-5">
        <span className="text-lg font-semibold text-foreground">tmux-api</span>
      </div>
      <Separator className="bg-sidebar-border" />

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={linkClass} onClick={onNavigate}>
            <Icon className="size-4 shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
        <a
          href="/docs"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            'border-l-2 border-transparent text-muted-foreground'
          )}
        >
          <FileText className="size-4 shrink-0" />
          <span>API Docs</span>
          <span className="ml-auto text-xs text-muted-foreground">↗</span>
        </a>
      </nav>
    </div>
  )
}

export default function Sidebar() {
  const isMobile = useIsMobile()
  const [sheetOpen, setSheetOpen] = useState(false)

  if (isMobile) {
    return (
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <div className="fixed inset-x-0 top-0 z-50 flex h-14 items-center border-b border-border bg-background px-4">
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <span className="ml-2 text-sm font-semibold">tmux-api</span>
        </div>
        <SheetContent side="left" className="w-60 p-0 bg-sidebar-background border-sidebar-border">
          <SidebarNav onNavigate={() => setSheetOpen(false)} />
        </SheetContent>
      </Sheet>
    )
  }

  return <SidebarNav />
}
```

### Step 4: Verify frontend builds

- [ ] **Build the frontend**

Run: `npm run build`
Expected: Build succeeds with no import errors

- [ ] **Commit**

```bash
git add -A
git commit -m "refactor: strip frontend to public pages only — remove auth, sessions, agents"
```

---

## Task 5: Update package.json and remove unused dependencies

**Files:**
- Modify: `package.json`

### Step 1: Update package metadata and remove deps

- [ ] **Update `package.json`**

Changes:
- `"name": "foreman"` → `"name": "tmux-api"`
- Remove `"better-sqlite3"` from dependencies
- Remove `"@yaotoshi/auth-sdk"` from dependencies
- Remove shadcn UI deps that are only used by deleted components: check which `@radix-ui/*` packages are still needed

Check which radix packages are still used:
- `@radix-ui/react-separator` — used by Sidebar (KEEP)
- `@radix-ui/react-slot` — used by Button (KEEP)
- `@radix-ui/react-dialog` — used by Sheet (KEEP)
- `@radix-ui/react-alert-dialog` — used by ConfirmDialog (DELETE — file removed)
- `@radix-ui/react-select` — used by SessionsPage filter (DELETE — file removed)
- `@radix-ui/react-tooltip` — check if still used by remaining pages

- [ ] **Run `npm install` to update lockfile**

Run: `npm install`
Expected: No errors, lockfile updated

- [ ] **Run tests**

Run: `npm test`
Expected: ALL PASS

- [ ] **Build frontend**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: rename to tmux-api, remove better-sqlite3 and auth-sdk deps"
```

---

## Task 6: Update CLAUDE.md, README, .env.example, and documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/architecture.md`
- Modify: `README.md` — update for tmux-api identity
- Modify: `.env.example` — remove `VITE_*` variables

### Step 1: Update CLAUDE.md

- [ ] **Rewrite CLAUDE.md to reflect tmux-api identity**

Key changes:
- Title: "tmux-api Development Guide"
- Description: stateless REST API for tmux
- Remove all references to L3, L4, AgentService, OrchestratorService
- Remove DatabaseService from project structure
- Remove agent/event routes from structure
- Update SessionService description (stateless, no DB)
- Remove `better-sqlite3`, `@yaotoshi/auth-sdk` from tech stack
- Remove VITE_* env vars
- Remove frontend auth references
- Update project structure to match actual files
- Remove "Future Direction" section about L3/L4 (that's the new foreman's job)

### Step 2: Update architecture.md

- [ ] **Update `docs/architecture.md` to reflect tmux-api scope**

Remove L3/L4 sections. Add note that agent management lives in a separate project (foreman).

### Step 3: Update README.md

- [ ] **Update `README.md` for tmux-api identity**

Update title, description, and any references to Foreman. Remove mentions of agents, orchestration, database.

### Step 4: Update .env.example

- [ ] **Remove `VITE_*` variables from `.env.example`**

Remove `VITE_AUTH_CLIENT_ID`, `VITE_AUTH_ACCOUNTS_URL`, `VITE_AUTH_REDIRECT_URI`, `VITE_AUTH_POST_LOGOUT_URI`. Keep `API_KEY`, `PORT`, `SWAGGER_ENABLED`, `AUTH_ACCOUNTS_URL`.

- [ ] **Commit**

```bash
git add CLAUDE.md docs/architecture.md README.md .env.example
git commit -m "docs: update CLAUDE.md, README, .env.example for tmux-api identity"
```

---

## Task 7: Clean up unused shadcn components and verify

**Files:**
- Potentially delete unused shadcn/ui components
- Delete: `data/` directory reference from `.gitignore` if present

### Step 1: Check for unused UI components

- [ ] **Check which shadcn/ui components are still imported by remaining files**

Search all remaining `.jsx` files for imports from `@/components/ui/`. Remove any UI component files that are no longer imported anywhere.

Likely removable:
- `ui/alert-dialog.jsx` — only used by deleted ConfirmDialog
- `ui/select.jsx` — only used by deleted SessionsPage
- `ui/input.jsx` — check if used by remaining pages
- `ui/skeleton.jsx` — check if used by remaining pages
- `ui/badge.jsx` — check if used by remaining pages
- `ui/alert.jsx` — check if used by remaining pages
- `ui/tooltip.jsx` — check if used by remaining pages
- `ui/dialog.jsx` — check if used by remaining pages

Keep:
- `ui/button.jsx` — used by Sidebar
- `ui/separator.jsx` — used by Sidebar
- `ui/sheet.jsx` — used by Sidebar (mobile)
- `ui/card.jsx` — likely used by HomePage/AboutTmuxPage
- `ui/table.jsx` — likely used by AboutTmuxPage

### Step 2: Delete unused components

- [ ] **Delete unused shadcn/ui component files**

### Step 3: Final verification

- [ ] **Run full test suite**

Run: `npm test`
Expected: ALL PASS

- [ ] **Build frontend**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Commit**

```bash
git add -A
git commit -m "chore: remove unused shadcn/ui components"
```

---

## Task 8: Final integration test and tag

### Step 1: Full verification

- [ ] **Run all tests one final time**

Run: `npm test`
Expected: ALL PASS

- [ ] **Build frontend one final time**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Start the server and verify it runs**

Run: `API_KEY=test npm start` (verify it starts without DB errors, Ctrl+C to stop)
Expected: Server starts, logs "tmux-api running on port 9993"

### Step 2: Tag release

- [ ] **Commit any remaining changes and tag**

```bash
git add -A
git commit -m "chore: final cleanup for tmux-api v1.0.0"
```

Note: Version bump and release tagging should follow git-flow release process.
