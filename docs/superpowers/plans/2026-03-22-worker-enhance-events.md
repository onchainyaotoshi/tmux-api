# Worker Enhancement + Events — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add working directory support to worker spawn and an events endpoint so external agents can report state changes to Foreman.

**Architecture:** Modify `TmuxService.createSession` to accept optional `cwd` via tmux `-c` flag. Add `worker_events` SQLite table and `POST /api/workers/:id/events` endpoint with per-worker token auth. Events update worker status automatically based on type mapping.

**Tech Stack:** Fastify 5, better-sqlite3, vitest, existing TmuxService/WorkerService/DatabaseService

**Spec:** `docs/superpowers/specs/2026-03-22-worker-enhance-events-design.md`

---

## File Structure

```
MODIFY: src/server/services/tmux.js:45-47     — createSession accepts optional cwd (-c flag)
MODIFY: src/server/services/database.js       — migrate: add cwd + event_token columns, worker_events table, event CRUD
MODIFY: src/server/services/worker.js          — spawn with cwd + event_token, processEvent method
CREATE: src/server/routes/events.js            — POST + GET /api/workers/:id/events
MODIFY: src/server/routes/workers.js           — add cwd to spawn schema, update status enum, add cwd + event_token to workerSchema
MODIFY: src/server/plugins/auth.js:8           — skip auth for POST events endpoint
MODIFY: src/server/index.js                    — import + register events route

MODIFY: tests/services/tmux.test.js            — test createSession with cwd
MODIFY: tests/services/database.test.js        — test new columns + event CRUD
MODIFY: tests/services/worker.test.js          — test spawn with cwd, processEvent
CREATE: tests/routes/events.test.js            — test POST/GET events, token auth
MODIFY: tests/routes/workers.test.js           — test cwd in spawn, updated status enum
```

---

### Task 1: TmuxService — createSession with cwd

**Files:**
- Modify: `src/server/services/tmux.js:45-47`
- Test: `tests/services/tmux.test.js`

- [ ] **Step 1: Write failing test**

Add to `tests/services/tmux.test.js`, inside the existing describe block:

```js
describe('createSession with cwd', () => {
  it('should create session in specified directory', async () => {
    await tmux.createSession('cwd-test', '/tmp')
    const out = await tmux.capturePane('cwd-test', '0', '0')
    // The prompt should show /tmp as working directory
    expect(out).toContain('/tmp')
    await tmux.killSession('cwd-test')
  })

  it('should throw for non-existent cwd', async () => {
    await expect(tmux.createSession('cwd-bad', '/nonexistent/path/xyz'))
      .rejects.toThrow()
  })

  it('should work without cwd (backward compatible)', async () => {
    await tmux.createSession('cwd-none')
    const exists = await tmux.hasSession('cwd-none')
    expect(exists).toBe(true)
    await tmux.killSession('cwd-none')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/services/tmux.test.js -t "createSession with cwd"`
Expected: FAIL — `createSession` doesn't accept second arg (but won't crash since JS ignores extra args). The `/tmp` test may fail because cwd isn't set.

- [ ] **Step 3: Implement**

In `src/server/services/tmux.js`, modify `createSession`:

```js
  async createSession(name, cwd) {
    const args = ['-d', '-s', name]
    if (cwd) args.push('-c', cwd)
    await this.execute('new-session', args)
    return { name }
  }
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run tests/services/tmux.test.js`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/services/tmux.js tests/services/tmux.test.js
git commit -m "feat: add cwd support to TmuxService.createSession via -c flag"
```

---

### Task 2: DatabaseService — new columns + events table

**Files:**
- Modify: `src/server/services/database.js`
- Test: `tests/services/database.test.js`

- [ ] **Step 1: Write failing tests**

Add to `tests/services/database.test.js`:

```js
describe('cwd and event_token columns', () => {
  it('should store cwd and event_token', () => {
    const worker = db.createWorker({
      id: 'cwd-test-id',
      name: 'cwd-worker',
      command: 'claude',
      cwd: '/home/claude/project',
      event_token: 'token-123',
    })
    expect(worker.cwd).toBe('/home/claude/project')
    expect(worker.event_token).toBe('token-123')
  })

  it('should allow null cwd', () => {
    const worker = db.createWorker({
      id: 'no-cwd-id',
      name: 'no-cwd-worker',
      command: 'bash',
    })
    expect(worker.cwd).toBeNull()
  })
})

describe('worker_events', () => {
  it('should create event', () => {
    const event = db.createEvent({
      id: 'evt-1',
      worker_id: 'test-id-1',
      type: 'notification',
      data: { message: 'test' },
    })
    expect(event.id).toBe('evt-1')
    expect(event.type).toBe('notification')
    expect(event.data).toEqual({ message: 'test' })
  })

  it('should get last event', () => {
    db.createEvent({ id: 'evt-2', worker_id: 'test-id-1', type: 'stop', data: null })
    const last = db.getLastEvent('test-id-1')
    expect(last.id).toBe('evt-2')
    expect(last.type).toBe('stop')
  })

  it('should list events newest first', () => {
    const events = db.listEvents('test-id-1', 50)
    expect(events[0].id).toBe('evt-2')
    expect(events[1].id).toBe('evt-1')
  })

  it('should return null for no events', () => {
    const last = db.getLastEvent('no-events-worker')
    expect(last).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/services/database.test.js`
Expected: FAIL — `createWorker` doesn't accept cwd/event_token, no `createEvent` method

- [ ] **Step 3: Implement**

Update `src/server/services/database.js`:

```js
import Database from 'better-sqlite3'

export class DatabaseService {
  constructor(dbPath) {
    this.dbPath = dbPath
    this.db = null
  }

  init() {
    this.db = new Database(this.dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.#migrate()
  }

  #migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workers (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        command TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'idle',
        current_task TEXT,
        cwd TEXT,
        event_token TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS worker_events (
        id TEXT PRIMARY KEY,
        worker_id TEXT NOT NULL REFERENCES workers(id),
        type TEXT NOT NULL,
        data TEXT,
        created_at TEXT NOT NULL
      )
    `)
  }

  createWorker({ id, name, command, status = 'idle', cwd = null, event_token = null }) {
    const now = new Date().toISOString()
    this.db.prepare(`
      INSERT INTO workers (id, name, command, status, cwd, event_token, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, command, status, cwd, event_token, now, now)
    return this.getWorker(id)
  }

  getWorker(id) {
    return this.db.prepare('SELECT * FROM workers WHERE id = ?').get(id)
  }

  listWorkers(status) {
    if (status) {
      return this.db.prepare('SELECT * FROM workers WHERE status = ?').all(status)
    }
    return this.db.prepare('SELECT * FROM workers').all()
  }

  updateStatus(id, status) {
    const now = new Date().toISOString()
    this.db.prepare('UPDATE workers SET status = ?, updated_at = ? WHERE id = ?')
      .run(status, now, id)
  }

  updateTask(id, task) {
    const now = new Date().toISOString()
    this.db.prepare('UPDATE workers SET current_task = ?, status = ?, updated_at = ? WHERE id = ?')
      .run(task, 'running', now, id)
  }

  createEvent({ id, worker_id, type, data }) {
    const now = new Date().toISOString()
    const dataStr = data ? JSON.stringify(data) : null
    this.db.prepare(`
      INSERT INTO worker_events (id, worker_id, type, data, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, worker_id, type, dataStr, now)
    return this.getEvent(id)
  }

  getEvent(id) {
    const row = this.db.prepare('SELECT * FROM worker_events WHERE id = ?').get(id)
    if (row && row.data) row.data = JSON.parse(row.data)
    return row
  }

  getLastEvent(workerId) {
    const row = this.db.prepare(
      'SELECT * FROM worker_events WHERE worker_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(workerId)
    if (row && row.data) row.data = JSON.parse(row.data)
    return row
  }

  listEvents(workerId, limit = 50) {
    const rows = this.db.prepare(
      'SELECT * FROM worker_events WHERE worker_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(workerId, limit)
    return rows.map(row => {
      if (row.data) row.data = JSON.parse(row.data)
      return row
    })
  }

  close() {
    if (this.db) this.db.close()
  }
}
```

**Important:** This is a full rewrite of database.js because the migration adds new columns and a new table. For existing databases (data/foreman.db), the `CREATE TABLE IF NOT EXISTS` with new columns will work for fresh DBs. For existing DBs, the old table won't have cwd/event_token columns. Since this is pre-production, dropping and recreating is acceptable. If needed, add `ALTER TABLE` statements wrapped in try-catch.

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run tests/services/database.test.js`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/services/database.js tests/services/database.test.js
git commit -m "feat: add cwd, event_token columns and worker_events table to DatabaseService"
```

---

### Task 3: WorkerService — spawn with cwd, processEvent

**Files:**
- Modify: `src/server/services/worker.js`
- Test: `tests/services/worker.test.js`

- [ ] **Step 1: Write failing tests**

Add to `tests/services/worker.test.js`:

```js
describe('spawn with cwd', () => {
  it('should create worker with cwd', async () => {
    const worker = await workerService.spawn('cwd-w1', 'bash', '/tmp')
    expect(worker.cwd).toBe('/tmp')
    expect(worker.event_token).toBeDefined()
    expect(worker.event_token.length).toBe(36) // UUID
  })

  it('should work without cwd', async () => {
    const worker = await workerService.spawn('no-cwd-w1', 'bash')
    expect(worker.cwd).toBeNull()
    expect(worker.event_token).toBeDefined()
  })
})

describe('processEvent', () => {
  it('should store event and update status to waiting_input', async () => {
    const worker = await workerService.spawn('evt-w1', 'bash')
    const event = await workerService.processEvent(worker.id, 'notification', { message: 'confirm?' })
    expect(event.type).toBe('notification')
    const updated = db.getWorker(worker.id)
    expect(updated.status).toBe('waiting_input')
  })

  it('should update status to idle on stop event', async () => {
    const worker = await workerService.spawn('evt-w2', 'bash')
    await workerService.processEvent(worker.id, 'tool_use', {})
    expect(db.getWorker(worker.id).status).toBe('running')
    await workerService.processEvent(worker.id, 'stop', {})
    expect(db.getWorker(worker.id).status).toBe('idle')
  })

  it('should update status to error on stop_failure', async () => {
    const worker = await workerService.spawn('evt-w3', 'bash')
    await workerService.processEvent(worker.id, 'stop_failure', { error: 'rate_limit' })
    expect(db.getWorker(worker.id).status).toBe('error')
  })

  it('should not change status for unknown event type', async () => {
    const worker = await workerService.spawn('evt-w4', 'bash')
    await workerService.processEvent(worker.id, 'custom_event', {})
    expect(db.getWorker(worker.id).status).toBe('idle')
  })

  it('should throw for unknown worker', async () => {
    await expect(workerService.processEvent('nonexistent', 'stop', {}))
      .rejects.toThrow()
  })

  it('should validate event_token', async () => {
    const worker = await workerService.spawn('evt-w5', 'bash')
    await expect(workerService.processEvent(worker.id, 'stop', {}, 'wrong-token'))
      .rejects.toThrow(/Invalid event token/)
  })

  it('should accept valid event_token', async () => {
    const worker = await workerService.spawn('evt-w6', 'bash')
    const event = await workerService.processEvent(worker.id, 'stop', {}, worker.event_token)
    expect(event.type).toBe('stop')
  })
})

describe('getEvents', () => {
  it('should return event history', async () => {
    const worker = await workerService.spawn('hist-w1', 'bash')
    await workerService.processEvent(worker.id, 'tool_use', {})
    await workerService.processEvent(worker.id, 'stop', {})
    const events = workerService.getEvents(worker.id)
    expect(events.length).toBe(2)
    expect(events[0].type).toBe('stop') // newest first
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/services/worker.test.js -t "spawn with cwd"`
Expected: FAIL — `spawn` doesn't accept cwd

- [ ] **Step 3: Implement**

Update `src/server/services/worker.js`:

```js
import { randomUUID } from 'node:crypto'

const WORKER_PREFIX = 'worker-'

const EVENT_STATE_MAP = {
  notification: 'waiting_input',
  stop: 'idle',
  stop_failure: 'error',
  tool_use: 'running',
}

export class WorkerService {
  constructor(tmux, db) {
    this.tmux = tmux
    this.db = db
  }

  async spawn(name, command, cwd) {
    const id = randomUUID()
    const eventToken = randomUUID()
    const sessionName = `${WORKER_PREFIX}${name}`

    await this.tmux.createSession(sessionName, cwd || undefined)
    await this.tmux.sendKeys(sessionName, '0', '0', command)
    await this.tmux.sendKeys(sessionName, '0', '0', 'Enter')

    try {
      return this.db.createWorker({
        id, name, command, status: 'idle',
        cwd: cwd || null,
        event_token: eventToken,
      })
    } catch (err) {
      try { await this.tmux.killSession(sessionName) } catch {}
      throw err
    }
  }

  async processEvent(id, type, data, token) {
    const worker = this.db.getWorker(id)
    if (!worker) throw new Error(`Worker not found: ${id}`)

    if (token !== undefined && token !== worker.event_token) {
      throw new Error('Invalid event token')
    }

    const event = this.db.createEvent({
      id: randomUUID(),
      worker_id: id,
      type,
      data: data || null,
    })

    const newStatus = EVENT_STATE_MAP[type]
    if (newStatus) {
      this.db.updateStatus(id, newStatus)
    }

    return event
  }

  getEvents(id, limit) {
    return this.db.listEvents(id, limit)
  }

  async sendTask(id, input) {
    const worker = this.db.getWorker(id)
    if (!worker) throw new Error(`Worker not found: ${id}`)
    if (worker.status === 'stopped' || worker.status === 'failed') {
      throw new Error(`Cannot send task to ${worker.status} worker`)
    }

    const sessionName = `${WORKER_PREFIX}${worker.name}`
    await this.tmux.sendKeys(sessionName, '0', '0', input)
    await this.tmux.sendKeys(sessionName, '0', '0', 'Enter')

    this.db.updateTask(id, input)
    return this.db.getWorker(id)
  }

  async getOutput(id) {
    const worker = this.db.getWorker(id)
    if (!worker) throw new Error(`Worker not found: ${id}`)

    const sessionName = `${WORKER_PREFIX}${worker.name}`
    try {
      return await this.tmux.capturePane(sessionName, '0', '0')
    } catch {
      return ''
    }
  }

  async kill(id) {
    const worker = this.db.getWorker(id)
    if (!worker) throw new Error(`Worker not found: ${id}`)
    if (worker.status === 'stopped') throw new Error('Worker already stopped')

    const sessionName = `${WORKER_PREFIX}${worker.name}`
    try {
      await this.tmux.killSession(sessionName)
    } catch {
      // Session may already be dead
    }

    this.db.updateStatus(id, 'stopped')
    return this.db.getWorker(id)
  }

  async checkHealth(id) {
    const worker = this.db.getWorker(id)
    if (!worker) throw new Error(`Worker not found: ${id}`)

    const sessionName = `${WORKER_PREFIX}${worker.name}`
    const alive = await this.tmux.hasSession(sessionName)

    if (!alive && worker.status !== 'stopped') {
      this.db.updateStatus(id, 'failed')
    }

    return {
      id: worker.id,
      name: worker.name,
      status: alive ? worker.status : (worker.status === 'stopped' ? 'stopped' : 'failed'),
      alive,
      last_activity_at: worker.updated_at,
    }
  }

  async checkAllHealth() {
    const workers = this.db.listWorkers()
    const results = []
    for (const worker of workers) {
      results.push(await this.checkHealth(worker.id))
    }
    return results
  }

  list(status) {
    return this.db.listWorkers(status)
  }

  async get(id) {
    const worker = this.db.getWorker(id)
    if (!worker) throw new Error(`Worker not found: ${id}`)

    const output = await this.getOutput(id)
    const lastEvent = this.db.getLastEvent(id) || null
    return { ...worker, output, last_event: lastEvent }
  }
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run tests/services/worker.test.js`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/services/worker.js tests/services/worker.test.js
git commit -m "feat: add cwd to spawn, processEvent with state mapping, event_token auth"
```

---

### Task 4: Auth Plugin — skip events endpoint

**Files:**
- Modify: `src/server/plugins/auth.js:8`
- Test: `tests/plugins/auth.test.js`

- [ ] **Step 1: Write failing test**

Add to `tests/plugins/auth.test.js`:

```js
it('should skip auth for POST /api/workers/:id/events', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/workers/some-id/events?token=test',
    payload: { type: 'test' },
  })
  // Should NOT be 401 — auth plugin should skip this route
  expect(res.statusCode).not.toBe(401)
})
```

Note: The actual route handler may return 404 (worker not found) or 403 (bad token), but NOT 401 from the auth plugin.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/plugins/auth.test.js`
Expected: FAIL — returns 401 because auth plugin blocks it

- [ ] **Step 3: Implement**

In `src/server/plugins/auth.js`, update the guard at line 8:

```js
  fastify.addHook('onRequest', async (request, reply) => {
    if (!request.url.startsWith('/api/')) return

    // Events endpoint uses per-worker token auth, not API key
    if (request.method === 'POST' && /^\/api\/workers\/[^/]+\/events/.test(request.url)) return

    // Try API key first
    const providedKey = request.headers['x-api-key']
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run tests/plugins/auth.test.js`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/plugins/auth.js tests/plugins/auth.test.js
git commit -m "feat: skip API key auth for POST /api/workers/:id/events (token-based)"
```

---

### Task 5: Events Route

**Files:**
- Create: `src/server/routes/events.js`
- Create: `tests/routes/events.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/routes/events.test.js`:

```js
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import Fastify from 'fastify'
import { authPlugin } from '../../src/server/plugins/auth.js'
import { eventRoutes } from '../../src/server/routes/events.js'
import { TmuxService } from '../../src/server/services/tmux.js'
import { WorkerService } from '../../src/server/services/worker.js'
import { DatabaseService } from '../../src/server/services/database.js'
import { existsSync, unlinkSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const API_KEY = 'test-key'
const headers = { 'x-api-key': API_KEY }
const TEST_DB = join(process.cwd(), 'data', 'test-routes-events.db')
const WORKER_PREFIX = 'worker-'

let app, tmux, db, workerService

beforeAll(async () => {
  mkdirSync(join(process.cwd(), 'data'), { recursive: true })
  tmux = new TmuxService()
  db = new DatabaseService(TEST_DB)
  db.init()
  workerService = new WorkerService(tmux, db)

  app = Fastify()
  app.decorate('tmux', tmux)
  app.decorate('db', db)
  app.decorate('workerService', workerService)
  await app.register(authPlugin, { apiKey: API_KEY })
  await app.register(eventRoutes, { prefix: '/api' })
})

afterEach(async () => {
  const workers = db.listWorkers()
  for (const w of workers) {
    try { await tmux.killSession(`${WORKER_PREFIX}${w.name}`) } catch {}
  }
  db.db.exec('DELETE FROM worker_events')
  db.db.exec('DELETE FROM workers')
})

afterAll(async () => {
  db.close()
  if (existsSync(TEST_DB)) unlinkSync(TEST_DB)
  await app.close()
})

describe('POST /api/workers/:id/events', () => {
  it('should accept event with valid token', async () => {
    const worker = await workerService.spawn('evt-test', 'bash')
    const res = await app.inject({
      method: 'POST',
      url: `/api/workers/${worker.id}/events?token=${worker.event_token}`,
      payload: { type: 'notification', data: { message: 'test' } },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().success).toBe(true)
    expect(res.json().data.type).toBe('notification')
  })

  it('should reject invalid token with 403', async () => {
    const worker = await workerService.spawn('evt-bad-token', 'bash')
    const res = await app.inject({
      method: 'POST',
      url: `/api/workers/${worker.id}/events?token=wrong`,
      payload: { type: 'stop' },
    })
    expect(res.statusCode).toBe(403)
  })

  it('should reject missing token with 403', async () => {
    const worker = await workerService.spawn('evt-no-token', 'bash')
    const res = await app.inject({
      method: 'POST',
      url: `/api/workers/${worker.id}/events`,
      payload: { type: 'stop' },
    })
    expect(res.statusCode).toBe(403)
  })

  it('should 404 for unknown worker', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/workers/nonexistent/events?token=anything',
      payload: { type: 'stop' },
    })
    expect(res.statusCode).toBe(404)
  })

  it('should update worker status from event type', async () => {
    const worker = await workerService.spawn('evt-status', 'bash')
    await app.inject({
      method: 'POST',
      url: `/api/workers/${worker.id}/events?token=${worker.event_token}`,
      payload: { type: 'notification', data: { notification_type: 'permission_prompt' } },
    })
    const updated = db.getWorker(worker.id)
    expect(updated.status).toBe('waiting_input')
  })

  it('should normalize hook_event_name to type', async () => {
    const worker = await workerService.spawn('evt-hook', 'bash')
    const res = await app.inject({
      method: 'POST',
      url: `/api/workers/${worker.id}/events?token=${worker.event_token}`,
      payload: { hook_event_name: 'StopFailure', session_id: 'abc' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().data.type).toBe('stop_failure')
  })

  it('should not require auth header (token-based)', async () => {
    const worker = await workerService.spawn('evt-noauth', 'bash')
    const res = await app.inject({
      method: 'POST',
      url: `/api/workers/${worker.id}/events?token=${worker.event_token}`,
      payload: { type: 'stop' },
      // No x-api-key header
    })
    expect(res.statusCode).toBe(201)
  })
})

describe('GET /api/workers/:id/events', () => {
  it('should require auth', async () => {
    const worker = await workerService.spawn('evt-list-auth', 'bash')
    const res = await app.inject({
      method: 'GET',
      url: `/api/workers/${worker.id}/events`,
    })
    expect(res.statusCode).toBe(401)
  })

  it('should return events newest first', async () => {
    const worker = await workerService.spawn('evt-list', 'bash')
    await workerService.processEvent(worker.id, 'tool_use', {})
    await workerService.processEvent(worker.id, 'notification', { message: 'confirm?' })
    await workerService.processEvent(worker.id, 'stop', {})

    const res = await app.inject({
      method: 'GET',
      url: `/api/workers/${worker.id}/events`,
      headers,
    })
    expect(res.statusCode).toBe(200)
    const events = res.json().data
    expect(events.length).toBe(3)
    expect(events[0].type).toBe('stop')
    expect(events[2].type).toBe('tool_use')
  })

  it('should respect limit param', async () => {
    const worker = await workerService.spawn('evt-limit', 'bash')
    await workerService.processEvent(worker.id, 'tool_use', {})
    await workerService.processEvent(worker.id, 'stop', {})

    const res = await app.inject({
      method: 'GET',
      url: `/api/workers/${worker.id}/events?limit=1`,
      headers,
    })
    expect(res.json().data.length).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/routes/events.test.js`
Expected: FAIL — cannot import `eventRoutes`

- [ ] **Step 3: Implement**

Create `src/server/routes/events.js`:

```js
const HOOK_NAME_MAP = {
  Notification: 'notification',
  Stop: 'stop',
  StopFailure: 'stop_failure',
  PreToolUse: 'tool_use',
}

export async function eventRoutes(fastify) {
  const { workerService } = fastify

  // POST /api/workers/:id/events — receive event (token auth, no API key)
  fastify.post('/workers/:id/events', {
    schema: {
      tags: ['Events'],
      summary: 'Report worker event (token auth)',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      querystring: {
        type: 'object',
        properties: { token: { type: 'string' } },
      },
      body: {
        type: 'object',
        properties: {
          type: { type: 'string', minLength: 1, maxLength: 256 },
          hook_event_name: { type: 'string' },
          data: { type: 'object' },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params
    const token = request.query.token

    if (!token) {
      reply.code(403)
      return { success: false, error: 'Missing event token' }
    }

    // Normalize hook_event_name from Claude Code hooks
    let type = request.body.type
    if (!type && request.body.hook_event_name) {
      type = HOOK_NAME_MAP[request.body.hook_event_name] || request.body.hook_event_name.toLowerCase()
    }
    if (!type) {
      reply.code(400)
      return { success: false, error: 'Missing type or hook_event_name' }
    }

    // Extract data — for hook payloads, the entire body IS the data (minus type fields)
    let data = request.body.data || null
    if (!data && request.body.hook_event_name) {
      const { type: _t, hook_event_name: _h, ...rest } = request.body
      data = Object.keys(rest).length > 0 ? rest : null
    }

    // Check data size (8KB max)
    if (data && JSON.stringify(data).length > 8192) {
      reply.code(400)
      return { success: false, error: 'Event data exceeds 8KB limit' }
    }

    try {
      const event = await workerService.processEvent(id, type, data, token)
      reply.code(201)
      return { success: true, data: event }
    } catch (err) {
      if (err.message.includes('not found')) {
        reply.code(404)
      } else if (err.message.includes('Invalid event token')) {
        reply.code(403)
      }
      return { success: false, error: err.message }
    }
  })

  // GET /api/workers/:id/events — list events (API key auth)
  fastify.get('/workers/:id/events', {
    schema: {
      tags: ['Events'],
      summary: 'List worker events',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
        },
      },
    },
  }, async (request) => {
    const data = workerService.getEvents(request.params.id, request.query.limit)
    return { success: true, data }
  })
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run tests/routes/events.test.js`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/routes/events.js tests/routes/events.test.js
git commit -m "feat: add events endpoint with token auth and hook name normalization"
```

---

### Task 6: Update Worker Routes — cwd + status enum

**Files:**
- Modify: `src/server/routes/workers.js`
- Test: `tests/routes/workers.test.js`

- [ ] **Step 1: Write failing tests**

Add to `tests/routes/workers.test.js`:

```js
describe('POST /api/workers with cwd', () => {
  it('should spawn worker with cwd', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/workers', headers,
      payload: { name: 'cwd-route-test', command: 'bash', cwd: '/tmp' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().data.cwd).toBe('/tmp')
    expect(res.json().data.event_token).toBeDefined()
  })

  it('should reject non-absolute cwd', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/workers', headers,
      payload: { name: 'cwd-relative', command: 'bash', cwd: 'relative/path' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('should accept spawn without cwd', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/workers', headers,
      payload: { name: 'no-cwd-route', command: 'bash' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().data.cwd).toBeNull()
  })
})

describe('GET /api/workers with new statuses', () => {
  it('should filter by waiting_input status', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/workers', headers,
      payload: { name: 'status-filter', command: 'bash' },
    })
    const { id } = created.json().data
    // Manually set status via service
    await workerService.processEvent(id, 'notification', { message: 'confirm?' })

    const res = await app.inject({
      method: 'GET', url: '/api/workers?status=waiting_input', headers,
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.length).toBeGreaterThanOrEqual(1)
    expect(res.json().data.every(w => w.status === 'waiting_input')).toBe(true)
  })
})

describe('GET /api/workers/:id with last_event', () => {
  it('should include last_event in detail', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/workers', headers,
      payload: { name: 'detail-evt', command: 'bash' },
    })
    const { id } = created.json().data
    await workerService.processEvent(id, 'notification', { message: 'test' })

    const res = await app.inject({
      method: 'GET', url: `/api/workers/${id}`, headers,
    })
    expect(res.json().data.last_event).toBeDefined()
    expect(res.json().data.last_event.type).toBe('notification')
  })

  it('should have null last_event when no events', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/workers', headers,
      payload: { name: 'detail-no-evt', command: 'bash' },
    })
    const { id } = created.json().data
    const res = await app.inject({
      method: 'GET', url: `/api/workers/${id}`, headers,
    })
    expect(res.json().data.last_event).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/routes/workers.test.js`
Expected: FAIL — cwd not in schema, status enum doesn't include waiting_input

- [ ] **Step 3: Implement**

Update `src/server/routes/workers.js`:

Add `cwd` and `event_token` to `workerSchema`:

```js
const workerSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    command: { type: 'string' },
    cwd: { type: ['string', 'null'] },
    event_token: { type: ['string', 'null'] },
    status: { type: 'string' },
    current_task: { type: ['string', 'null'] },
    created_at: { type: 'string' },
    updated_at: { type: 'string' },
  },
}
```

Add `cwd` to POST body schema:

```js
properties: {
  name: { type: 'string', minLength: 1, maxLength: 128, pattern: namePattern },
  command: { type: 'string', minLength: 1, maxLength: 4096 },
  cwd: { type: 'string', pattern: '^/', maxLength: 4096 },
},
```

Update spawn handler:

```js
}, async (request, reply) => {
  const { name, command, cwd } = request.body
  const data = await workerService.spawn(name, command, cwd)
  reply.code(201)
  return { success: true, data }
})
```

Update status enum:

```js
status: { type: 'string', enum: ['spawning', 'idle', 'running', 'waiting_input', 'error', 'failed', 'stopped'] },
```

Update GET detail response schema to include `last_event`:

```js
response: {
  200: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      data: {
        type: 'object',
        properties: {
          ...workerSchema.properties,
          output: { type: 'string' },
          last_event: {
            type: ['object', 'null'],
            properties: {
              id: { type: 'string' },
              type: { type: 'string' },
              data: {},
              created_at: { type: 'string' },
            },
          },
        },
      },
    },
  },
},
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run tests/routes/workers.test.js`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/routes/workers.js tests/routes/workers.test.js
git commit -m "feat: add cwd to spawn schema, update status enum, include last_event in detail"
```

---

### Task 7: Wire Events Route Into Server

**Files:**
- Modify: `src/server/index.js`

- [ ] **Step 1: Add import and register**

In `src/server/index.js`, add import after line 19:

```js
import { eventRoutes } from './routes/events.js'
```

Add route registration after line 76 (after healthRoutes):

```js
await app.register(eventRoutes, { prefix: '/api' })
```

- [ ] **Step 2: Run all tests**

Run: `npm test`
Expected: All PASS

- [ ] **Step 3: Commit**

```bash
git add src/server/index.js
git commit -m "feat: register events route in server"
```

---

### Task 8: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass, no regressions

- [ ] **Step 2: Verify event count**

Check total test count is significantly higher than 85 (v0.5.0 baseline).

- [ ] **Step 3: Commit any fixes if needed**
