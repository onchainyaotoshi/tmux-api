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
    await tmux.killSession('worker-task-fail-test')
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
