# Worker API Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/api/workers` REST API layer that abstracts tmux session management into a simple worker lifecycle (spawn, send task, capture output, kill), backed by SQLite for persistent state.

**Architecture:** `WorkerService` sits on top of `TmuxService` + `DatabaseService`. Routes follow existing Fastify patterns (JSON Schema validation, response envelope, auth). SQLite via `better-sqlite3` stores worker metadata in `data/foreman.db`.

**Tech Stack:** Fastify 5, better-sqlite3, vitest, existing TmuxService

**Spec:** `docs/superpowers/specs/2026-03-22-worker-api-design.md`

---

## File Structure

```
CREATE: src/server/services/database.js    — SQLite wrapper (init, CRUD for workers table)
CREATE: src/server/services/worker.js      — WorkerService class (spawn, sendTask, kill, health)
CREATE: src/server/routes/workers.js       — /api/workers REST endpoints
CREATE: src/server/routes/health.js        — /api/health/workers endpoint
CREATE: tests/services/database.test.js    — DatabaseService unit tests
CREATE: tests/services/worker.test.js      — WorkerService integration tests (real tmux)
CREATE: tests/routes/workers.test.js       — Worker route integration tests
CREATE: tests/routes/health.test.js        — Health route tests
MODIFY: src/server/services/tmux.js:6-11   — Add 'has-session' to ALLOWED_SUBCOMMANDS
MODIFY: src/server/services/tmux.js        — Add hasSession() method
MODIFY: src/server/index.js:9-16           — Import and register new services/routes
MODIFY: .gitignore                         — Add data/ directory
```

---

### Task 1: Add `has-session` to TmuxService

**Files:**
- Modify: `src/server/services/tmux.js:6-11` (ALLOWED_SUBCOMMANDS)
- Modify: `src/server/services/tmux.js` (add hasSession method after line 56)
- Test: `tests/services/tmux.test.js`

- [ ] **Step 1: Write failing test for hasSession**

In `tests/services/tmux.test.js`, add at the end of the file (before the closing of the outer describe):

```js
describe('hasSession', () => {
  it('should return true for existing session', async () => {
    await tmux.createSession('has-session-test')
    const result = await tmux.hasSession('has-session-test')
    expect(result).toBe(true)
    await tmux.killSession('has-session-test')
  })

  it('should return false for non-existing session', async () => {
    const result = await tmux.hasSession('nonexistent-session-xyz')
    expect(result).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/services/tmux.test.js -t "hasSession"`
Expected: FAIL — `tmux.hasSession is not a function`

- [ ] **Step 3: Add has-session to whitelist and implement hasSession**

In `src/server/services/tmux.js`, add `'has-session'` to ALLOWED_SUBCOMMANDS array:

```js
const ALLOWED_SUBCOMMANDS = [
  'list-sessions', 'new-session', 'kill-session', 'rename-session',
  'list-windows', 'new-window', 'kill-window', 'rename-window',
  'list-panes', 'split-window', 'kill-pane', 'resize-pane',
  'send-keys', 'capture-pane', 'has-session',
]
```

Add `hasSession` method after `renameSession` (after line 56):

```js
  async hasSession(name) {
    try {
      await this.execute('has-session', ['-t', name])
      return true
    } catch {
      return false
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/services/tmux.test.js -t "hasSession"`
Expected: PASS

- [ ] **Step 5: Run all tmux tests to ensure no regression**

Run: `npx vitest run tests/services/tmux.test.js`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/server/services/tmux.js tests/services/tmux.test.js
git commit -m "feat: add has-session to TmuxService for O(1) session checks"
```

---

### Task 2: DatabaseService

**Files:**
- Create: `src/server/services/database.js`
- Test: `tests/services/database.test.js`

- [ ] **Step 1: Write failing tests for DatabaseService**

Create `tests/services/database.test.js`:

```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { DatabaseService } from '../../src/server/services/database.js'
import { existsSync, unlinkSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const TEST_DB_PATH = join(process.cwd(), 'data', 'test-foreman.db')

let db

beforeAll(() => {
  mkdirSync(join(process.cwd(), 'data'), { recursive: true })
  db = new DatabaseService(TEST_DB_PATH)
  db.init()
})

afterAll(() => {
  db.close()
  if (existsSync(TEST_DB_PATH)) unlinkSync(TEST_DB_PATH)
})

describe('DatabaseService', () => {
  describe('init', () => {
    it('should create workers table', () => {
      const tables = db.db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='workers'"
      ).all()
      expect(tables).toHaveLength(1)
    })
  })

  describe('createWorker', () => {
    it('should insert a worker and return it', () => {
      const worker = db.createWorker({
        id: 'test-id-1',
        name: 'test-worker',
        command: 'claude',
        status: 'idle',
      })
      expect(worker.id).toBe('test-id-1')
      expect(worker.name).toBe('test-worker')
      expect(worker.command).toBe('claude')
      expect(worker.status).toBe('idle')
      expect(worker.created_at).toBeDefined()
      expect(worker.updated_at).toBeDefined()
    })

    it('should reject duplicate names', () => {
      expect(() => db.createWorker({
        id: 'test-id-dup',
        name: 'test-worker',
        command: 'claude',
        status: 'idle',
      })).toThrow()
    })
  })

  describe('getWorker', () => {
    it('should return worker by id', () => {
      const worker = db.getWorker('test-id-1')
      expect(worker.name).toBe('test-worker')
    })

    it('should return undefined for unknown id', () => {
      const worker = db.getWorker('nonexistent')
      expect(worker).toBeUndefined()
    })
  })

  describe('listWorkers', () => {
    it('should return all workers', () => {
      const workers = db.listWorkers()
      expect(workers.length).toBeGreaterThanOrEqual(1)
    })

    it('should filter by status', () => {
      const workers = db.listWorkers('idle')
      expect(workers.every(w => w.status === 'idle')).toBe(true)
    })
  })

  describe('updateStatus', () => {
    it('should update worker status', () => {
      db.updateStatus('test-id-1', 'running')
      const worker = db.getWorker('test-id-1')
      expect(worker.status).toBe('running')
    })
  })

  describe('updateTask', () => {
    it('should update current_task and set status to running', () => {
      db.updateTask('test-id-1', 'do something')
      const worker = db.getWorker('test-id-1')
      expect(worker.current_task).toBe('do something')
      expect(worker.status).toBe('running')
    })
  })

  describe('updateStatus to stopped', () => {
    it('should mark worker as stopped', () => {
      db.updateStatus('test-id-1', 'stopped')
      const worker = db.getWorker('test-id-1')
      expect(worker.status).toBe('stopped')
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/services/database.test.js`
Expected: FAIL — cannot import `DatabaseService`

- [ ] **Step 3: Implement DatabaseService**

Create `src/server/services/database.js`:

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
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)
  }

  createWorker({ id, name, command, status = 'idle' }) {
    const now = new Date().toISOString()
    this.db.prepare(`
      INSERT INTO workers (id, name, command, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, command, status, now, now)
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

  close() {
    if (this.db) this.db.close()
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/services/database.test.js`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/services/database.js tests/services/database.test.js
git commit -m "feat: add DatabaseService with SQLite persistence for workers"
```

---

### Task 3: WorkerService

**Files:**
- Create: `src/server/services/worker.js`
- Test: `tests/services/worker.test.js`

- [ ] **Step 1: Write failing tests for WorkerService**

Create `tests/services/worker.test.js`:

```js
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { WorkerService } from '../../src/server/services/worker.js'
import { TmuxService } from '../../src/server/services/tmux.js'
import { DatabaseService } from '../../src/server/services/database.js'
import { existsSync, unlinkSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const TEST_DB = join(process.cwd(), 'data', 'test-worker.db')
const WORKER_PREFIX = 'worker-'

let workerService, tmux, db

beforeAll(() => {
  mkdirSync(join(process.cwd(), 'data'), { recursive: true })
  tmux = new TmuxService()
  db = new DatabaseService(TEST_DB)
  db.init()
  workerService = new WorkerService(tmux, db)
})

afterEach(async () => {
  // Kill any worker sessions created during tests
  const workers = db.listWorkers()
  for (const w of workers) {
    try { await tmux.killSession(`${WORKER_PREFIX}${w.name}`) } catch {}
  }
  // Clear database
  db.db.exec('DELETE FROM workers')
})

afterAll(() => {
  db.close()
  if (existsSync(TEST_DB)) unlinkSync(TEST_DB)
})

describe('WorkerService', () => {
  describe('spawn', () => {
    it('should create a tmux session and database record', async () => {
      const worker = await workerService.spawn('test-w1', 'echo hello')
      expect(worker.name).toBe('test-w1')
      expect(worker.command).toBe('echo hello')
      expect(worker.status).toBe('idle')
      expect(worker.id).toBeDefined()

      // Verify tmux session exists
      const alive = await tmux.hasSession(`${WORKER_PREFIX}test-w1`)
      expect(alive).toBe(true)
    })

    it('should reject duplicate worker names', async () => {
      await workerService.spawn('dup-worker', 'echo hi')
      await expect(workerService.spawn('dup-worker', 'echo hi'))
        .rejects.toThrow()
    })
  })

  describe('sendTask', () => {
    it('should send input to worker and update status to running', async () => {
      const worker = await workerService.spawn('task-w1', 'bash')
      const updated = await workerService.sendTask(worker.id, 'echo task-running')
      expect(updated.status).toBe('running')
      expect(updated.current_task).toBe('echo task-running')
    })

    it('should reject task to stopped worker', async () => {
      const worker = await workerService.spawn('stopped-w1', 'bash')
      await workerService.kill(worker.id)
      await expect(workerService.sendTask(worker.id, 'echo nope'))
        .rejects.toThrow(/stopped/)
    })
  })

  describe('getOutput', () => {
    it('should capture pane output', async () => {
      const worker = await workerService.spawn('output-w1', 'bash')
      // Send a command and wait briefly for output
      await tmux.sendKeys(`${WORKER_PREFIX}output-w1`, '0', '0', 'echo foreman-test-output')
      await tmux.sendKeys(`${WORKER_PREFIX}output-w1`, '0', '0', 'Enter')
      await new Promise(r => setTimeout(r, 500))
      const output = await workerService.getOutput(worker.id)
      expect(output).toContain('foreman-test-output')
    })
  })

  describe('kill', () => {
    it('should kill tmux session and update status', async () => {
      const worker = await workerService.spawn('kill-w1', 'bash')
      const killed = await workerService.kill(worker.id)
      expect(killed.status).toBe('stopped')

      const alive = await tmux.hasSession(`${WORKER_PREFIX}kill-w1`)
      expect(alive).toBe(false)
    })

    it('should throw for unknown worker', async () => {
      await expect(workerService.kill('nonexistent-id'))
        .rejects.toThrow()
    })
  })

  describe('checkHealth', () => {
    it('should return alive=true for running session', async () => {
      const worker = await workerService.spawn('health-w1', 'bash')
      const health = await workerService.checkHealth(worker.id)
      expect(health.alive).toBe(true)
      expect(health.status).toBe('idle')
    })

    it('should detect dead session and update status to failed', async () => {
      const worker = await workerService.spawn('health-w2', 'bash')
      // Kill session directly via tmux (simulate crash)
      await tmux.killSession(`${WORKER_PREFIX}health-w2`)
      const health = await workerService.checkHealth(worker.id)
      expect(health.alive).toBe(false)
      expect(health.status).toBe('failed')
    })
  })

  describe('list', () => {
    it('should list all workers', async () => {
      await workerService.spawn('list-w1', 'bash')
      await workerService.spawn('list-w2', 'bash')
      const workers = workerService.list()
      expect(workers.length).toBe(2)
    })

    it('should filter by status', async () => {
      await workerService.spawn('filter-w1', 'bash')
      const w2 = await workerService.spawn('filter-w2', 'bash')
      await workerService.kill(w2.id)
      const idle = workerService.list('idle')
      expect(idle.length).toBe(1)
      expect(idle[0].name).toBe('filter-w1')
    })
  })

  describe('get', () => {
    it('should return worker with output', async () => {
      const worker = await workerService.spawn('get-w1', 'bash')
      const detail = await workerService.get(worker.id)
      expect(detail.id).toBe(worker.id)
      expect(detail.output).toBeDefined()
    })

    it('should throw for unknown worker', async () => {
      await expect(workerService.get('nonexistent'))
        .rejects.toThrow()
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/services/worker.test.js`
Expected: FAIL — cannot import `WorkerService`

- [ ] **Step 3: Implement WorkerService**

Create `src/server/services/worker.js`:

```js
import { randomUUID } from 'node:crypto'

const WORKER_PREFIX = 'worker-'

export class WorkerService {
  constructor(tmux, db) {
    this.tmux = tmux
    this.db = db
  }

  async spawn(name, command) {
    const id = randomUUID()
    const sessionName = `${WORKER_PREFIX}${name}`

    await this.tmux.createSession(sessionName)
    await this.tmux.sendKeys(sessionName, '0', '0', command)
    await this.tmux.sendKeys(sessionName, '0', '0', 'Enter')

    return this.db.createWorker({ id, name, command, status: 'idle' })
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
    return { ...worker, output }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/services/worker.test.js`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/services/worker.js tests/services/worker.test.js
git commit -m "feat: add WorkerService with spawn, task, health, and kill"
```

---

### Task 4: Worker Routes

**Files:**
- Create: `src/server/routes/workers.js`
- Test: `tests/routes/workers.test.js`

- [ ] **Step 1: Write failing route tests**

Create `tests/routes/workers.test.js`:

```js
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import Fastify from 'fastify'
import { authPlugin } from '../../src/server/plugins/auth.js'
import { workerRoutes } from '../../src/server/routes/workers.js'
import { TmuxService } from '../../src/server/services/tmux.js'
import { WorkerService } from '../../src/server/services/worker.js'
import { DatabaseService } from '../../src/server/services/database.js'
import { existsSync, unlinkSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const API_KEY = 'test-key'
const headers = { 'x-api-key': API_KEY }
const TEST_DB = join(process.cwd(), 'data', 'test-routes-workers.db')
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
  await app.register(workerRoutes, { prefix: '/api' })
})

afterEach(async () => {
  const workers = db.listWorkers()
  for (const w of workers) {
    try { await tmux.killSession(`${WORKER_PREFIX}${w.name}`) } catch {}
  }
  db.db.exec('DELETE FROM workers')
})

afterAll(async () => {
  db.close()
  if (existsSync(TEST_DB)) unlinkSync(TEST_DB)
  await app.close()
})

describe('POST /api/workers', () => {
  it('should require auth', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/workers',
      payload: { name: 'auth-test', command: 'bash' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('should spawn a worker', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/workers', headers,
      payload: { name: 'spawn-test', command: 'bash' },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(body.data.name).toBe('spawn-test')
    expect(body.data.status).toBe('idle')
    expect(body.data.id).toBeDefined()
  })

  it('should reject invalid name', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/workers', headers,
      payload: { name: 'invalid name!', command: 'bash' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('should reject missing command', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/workers', headers,
      payload: { name: 'no-cmd' },
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('GET /api/workers', () => {
  it('should list workers', async () => {
    await app.inject({
      method: 'POST', url: '/api/workers', headers,
      payload: { name: 'list-test', command: 'bash' },
    })
    const res = await app.inject({
      method: 'GET', url: '/api/workers', headers,
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThanOrEqual(1)
  })

  it('should filter by status', async () => {
    await app.inject({
      method: 'POST', url: '/api/workers', headers,
      payload: { name: 'filter-test', command: 'bash' },
    })
    const res = await app.inject({
      method: 'GET', url: '/api/workers?status=idle', headers,
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.every(w => w.status === 'idle')).toBe(true)
  })
})

describe('GET /api/workers/:id', () => {
  it('should return worker detail with output', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/workers', headers,
      payload: { name: 'detail-test', command: 'bash' },
    })
    const { id } = created.json().data
    const res = await app.inject({
      method: 'GET', url: `/api/workers/${id}`, headers,
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.id).toBe(id)
    expect(res.json().data.output).toBeDefined()
  })

  it('should 404 for unknown worker', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/workers/nonexistent-id', headers,
    })
    expect(res.statusCode).toBe(404)
  })
})

describe('POST /api/workers/:id/task', () => {
  it('should send task to worker', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/workers', headers,
      payload: { name: 'task-test', command: 'bash' },
    })
    const { id } = created.json().data
    const res = await app.inject({
      method: 'POST', url: `/api/workers/${id}/task`, headers,
      payload: { input: 'echo hello' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.status).toBe('running')
    expect(res.json().data.current_task).toBe('echo hello')
  })

  it('should reject task to stopped worker', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/workers', headers,
      payload: { name: 'task-stop-test', command: 'bash' },
    })
    const { id } = created.json().data
    await app.inject({
      method: 'DELETE', url: `/api/workers/${id}`, headers,
    })
    const res = await app.inject({
      method: 'POST', url: `/api/workers/${id}/task`, headers,
      payload: { input: 'echo nope' },
    })
    expect(res.statusCode).toBe(409)
  })

  it('should reject task to failed worker', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/workers', headers,
      payload: { name: 'task-fail-test', command: 'bash' },
    })
    const { id } = created.json().data
    // Simulate crash by killing tmux session directly
    await tmux.killSession('worker-task-fail-test')
    // Trigger health check to mark as failed
    await workerService.checkHealth(id)
    const res = await app.inject({
      method: 'POST', url: `/api/workers/${id}/task`, headers,
      payload: { input: 'echo nope' },
    })
    expect(res.statusCode).toBe(409)
  })
})

describe('DELETE /api/workers/:id', () => {
  it('should kill worker', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/workers', headers,
      payload: { name: 'kill-test', command: 'bash' },
    })
    const { id } = created.json().data
    const res = await app.inject({
      method: 'DELETE', url: `/api/workers/${id}`, headers,
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.status).toBe('stopped')
  })

  it('should 404 for unknown worker', async () => {
    const res = await app.inject({
      method: 'DELETE', url: '/api/workers/nonexistent-id', headers,
    })
    expect(res.statusCode).toBe(404)
  })
})

describe('GET /api/workers/:id/health', () => {
  it('should return health for alive worker', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/workers', headers,
      payload: { name: 'health-test', command: 'bash' },
    })
    const { id } = created.json().data
    const res = await app.inject({
      method: 'GET', url: `/api/workers/${id}/health`, headers,
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.alive).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/routes/workers.test.js`
Expected: FAIL — cannot import `workerRoutes`

- [ ] **Step 3: Implement worker routes**

Create `src/server/routes/workers.js`:

```js
const namePattern = '^[a-zA-Z0-9_-]+$'

const workerSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    command: { type: 'string' },
    status: { type: 'string' },
    current_task: { type: ['string', 'null'] },
    created_at: { type: 'string' },
    updated_at: { type: 'string' },
  },
}

export async function workerRoutes(fastify) {
  const { workerService } = fastify

  // POST /api/workers — spawn worker
  fastify.post('/workers', {
    schema: {
      tags: ['Workers'],
      summary: 'Spawn a new worker',
      body: {
        type: 'object',
        required: ['name', 'command'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 128, pattern: namePattern },
          command: { type: 'string', minLength: 1, maxLength: 4096 },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: workerSchema,
          },
        },
      },
    },
  }, async (request, reply) => {
    const { name, command } = request.body
    const data = await workerService.spawn(name, command)
    reply.code(201)
    return { success: true, data }
  })

  // GET /api/workers — list workers
  fastify.get('/workers', {
    schema: {
      tags: ['Workers'],
      summary: 'List all workers',
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['spawning', 'idle', 'running', 'failed', 'stopped'] },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array', items: workerSchema },
          },
        },
      },
    },
  }, async (request) => {
    const data = workerService.list(request.query.status)
    return { success: true, data }
  })

  // GET /api/workers/:id — worker detail
  fastify.get('/workers/:id', {
    schema: {
      tags: ['Workers'],
      summary: 'Get worker detail with output',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
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
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const data = await workerService.get(request.params.id)
      return { success: true, data }
    } catch (err) {
      reply.code(404)
      return { success: false, error: err.message }
    }
  })

  // POST /api/workers/:id/task — send task
  fastify.post('/workers/:id/task', {
    schema: {
      tags: ['Workers'],
      summary: 'Send task to worker',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
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
      const data = await workerService.sendTask(request.params.id, request.body.input)
      return { success: true, data }
    } catch (err) {
      if (err.message.includes('not found')) {
        reply.code(404)
      } else if (err.message.includes('stopped') || err.message.includes('failed')) {
        reply.code(409)
      }
      return { success: false, error: err.message }
    }
  })

  // DELETE /api/workers/:id — kill worker
  fastify.delete('/workers/:id', {
    schema: {
      tags: ['Workers'],
      summary: 'Kill a worker',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    try {
      const data = await workerService.kill(request.params.id)
      return { success: true, data }
    } catch (err) {
      if (err.message.includes('not found')) {
        reply.code(404)
      } else if (err.message.includes('already stopped')) {
        reply.code(409)
      }
      return { success: false, error: err.message }
    }
  })

  // GET /api/workers/:id/health — single worker health
  fastify.get('/workers/:id/health', {
    schema: {
      tags: ['Workers'],
      summary: 'Health check single worker',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    try {
      const data = await workerService.checkHealth(request.params.id)
      return { success: true, data }
    } catch (err) {
      reply.code(404)
      return { success: false, error: err.message }
    }
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/routes/workers.test.js`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/routes/workers.js tests/routes/workers.test.js
git commit -m "feat: add /api/workers REST endpoints"
```

---

### Task 5: Health Route (bulk)

**Files:**
- Create: `src/server/routes/health.js`
- Test: `tests/routes/health.test.js`

- [ ] **Step 1: Write failing test**

Create `tests/routes/health.test.js`:

```js
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import Fastify from 'fastify'
import { authPlugin } from '../../src/server/plugins/auth.js'
import { healthRoutes } from '../../src/server/routes/health.js'
import { TmuxService } from '../../src/server/services/tmux.js'
import { WorkerService } from '../../src/server/services/worker.js'
import { DatabaseService } from '../../src/server/services/database.js'
import { existsSync, unlinkSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const API_KEY = 'test-key'
const headers = { 'x-api-key': API_KEY }
const TEST_DB = join(process.cwd(), 'data', 'test-routes-health.db')
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
  await app.register(healthRoutes, { prefix: '/api' })
})

afterEach(async () => {
  const workers = db.listWorkers()
  for (const w of workers) {
    try { await tmux.killSession(`${WORKER_PREFIX}${w.name}`) } catch {}
  }
  db.db.exec('DELETE FROM workers')
})

afterAll(async () => {
  db.close()
  if (existsSync(TEST_DB)) unlinkSync(TEST_DB)
  await app.close()
})

describe('GET /api/health/workers', () => {
  it('should require auth', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/health/workers',
    })
    expect(res.statusCode).toBe(401)
  })

  it('should return health for all workers', async () => {
    // Spawn two workers via service directly
    await workerService.spawn('health-all-1', 'bash')
    await workerService.spawn('health-all-2', 'bash')

    const res = await app.inject({
      method: 'GET', url: '/api/health/workers', headers,
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(2)
    expect(body.data[0].alive).toBe(true)
    expect(body.data[1].alive).toBe(true)
  })

  it('should detect dead workers', async () => {
    const worker = await workerService.spawn('health-dead', 'bash')
    await tmux.killSession(`${WORKER_PREFIX}health-dead`)

    const res = await app.inject({
      method: 'GET', url: '/api/health/workers', headers,
    })
    const found = res.json().data.find(w => w.id === worker.id)
    expect(found.alive).toBe(false)
    expect(found.status).toBe('failed')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/routes/health.test.js`
Expected: FAIL — cannot import `healthRoutes`

- [ ] **Step 3: Implement health routes**

Create `src/server/routes/health.js`:

```js
export async function healthRoutes(fastify) {
  const { workerService } = fastify

  fastify.get('/health/workers', {
    schema: {
      tags: ['Health'],
      summary: 'Health check all workers',
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
                  id: { type: 'string' },
                  name: { type: 'string' },
                  status: { type: 'string' },
                  alive: { type: 'boolean' },
                  last_activity_at: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  }, async () => {
    const data = await workerService.checkAllHealth()
    return { success: true, data }
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/routes/health.test.js`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/routes/health.js tests/routes/health.test.js
git commit -m "feat: add /api/health/workers bulk health endpoint"
```

---

### Task 6: Wire Everything Into Server

**Files:**
- Modify: `src/server/index.js`
- Modify: `.gitignore`

- [ ] **Step 1: Install better-sqlite3**

Run: `npm install better-sqlite3`

- [ ] **Step 2: Add data/ to .gitignore**

Append to `.gitignore`:

```
data/
```

- [ ] **Step 3: Update index.js to register new services and routes**

In `src/server/index.js`, add imports after existing imports (after line 15):

```js
import { DatabaseService } from './services/database.js'
import { WorkerService } from './services/worker.js'
import { workerRoutes } from './routes/workers.js'
import { healthRoutes } from './routes/health.js'
```

Update the `node:fs` import at line 6 to also include `mkdirSync`:

```js
import { existsSync, mkdirSync } from 'node:fs'
```

After `app.decorate('tmux', new TmuxService())` (after line 31), add database and worker service setup. Uses existing `join` and `__dirname` from lines 5 and 17:

```js
// Database + WorkerService
const dataDir = join(__dirname, '../../data')
mkdirSync(dataDir, { recursive: true })
const db = new DatabaseService(join(dataDir, 'foreman.db'))
db.init()
app.decorate('db', db)
app.decorate('workerService', new WorkerService(app.tmux, db))

// Graceful shutdown
app.addHook('onClose', () => db.close())
```

After the existing route registrations (after line 59), add:

```js
await app.register(workerRoutes, { prefix: '/api' })
await app.register(healthRoutes, { prefix: '/api' })
```

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: All tests PASS (existing + new)

- [ ] **Step 5: Commit**

```bash
git add src/server/index.js .gitignore package.json package-lock.json
git commit -m "feat: wire DatabaseService, WorkerService, and routes into server"
```

---

### Task 7: Manual Smoke Test

- [ ] **Step 1: Start the server**

Run: `npm run dev:server`
Expected: `Foreman API running on port 9993`

- [ ] **Step 2: Test worker lifecycle via curl**

```bash
# Spawn worker
curl -s -X POST http://localhost:9993/api/workers \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"name":"test-claude","command":"bash"}' | jq .

# List workers
curl -s http://localhost:9993/api/workers \
  -H "X-API-Key: $API_KEY" | jq .

# Send task
# (use the id from spawn response)
curl -s -X POST http://localhost:9993/api/workers/{id}/task \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"input":"echo hello from worker"}' | jq .

# Get output
curl -s http://localhost:9993/api/workers/{id} \
  -H "X-API-Key: $API_KEY" | jq .

# Health check
curl -s http://localhost:9993/api/health/workers \
  -H "X-API-Key: $API_KEY" | jq .

# Kill worker
curl -s -X DELETE http://localhost:9993/api/workers/{id} \
  -H "X-API-Key: $API_KEY" | jq .
```

- [ ] **Step 3: Verify Swagger docs include worker endpoints**

Open: `http://localhost:9993/docs`
Expected: Workers and Health tags visible with all endpoints documented

- [ ] **Step 4: Stop server and commit any fixes if needed**

---

### Task 8: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass, no regressions

- [ ] **Step 2: Final commit (if any fixes)**

```bash
git add -A
git commit -m "test: verify full worker API integration"
```
