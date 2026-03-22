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
