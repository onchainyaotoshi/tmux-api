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
