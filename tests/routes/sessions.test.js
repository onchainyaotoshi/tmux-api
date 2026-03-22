import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import Fastify from 'fastify'
import { authPlugin } from '../../src/server/plugins/auth.js'
import { sessionRoutes } from '../../src/server/routes/sessions.js'
import { TerminalService } from '../../src/server/services/terminal.js'
import { SessionService } from '../../src/server/services/session.js'
import { DatabaseService } from '../../src/server/services/database.js'
import { existsSync, unlinkSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const API_KEY = 'test-key'
const headers = { 'x-api-key': API_KEY }
const TEST_DB = join(process.cwd(), 'data', 'test-routes-sessions.db')
const SESSION_PREFIX = 'session-'

let app, terminal, db, sessionService

beforeAll(async () => {
  mkdirSync(join(process.cwd(), 'data'), { recursive: true })
  terminal = new TerminalService()
  db = new DatabaseService(TEST_DB)
  db.init()
  sessionService = new SessionService(terminal, db)

  app = Fastify()
  app.decorate('terminal', terminal)
  app.decorate('db', db)
  app.decorate('sessionService', sessionService)
  await app.register(authPlugin, { apiKey: API_KEY })
  await app.register(sessionRoutes, { prefix: '/api' })
})

afterEach(async () => {
  const sessions = db.listSessions()
  for (const s of sessions) {
    try { await terminal.killSession(`${SESSION_PREFIX}${s.name}`) } catch {}
  }
  db.db.exec('DELETE FROM session_events')
  db.db.exec('DELETE FROM sessions')
})

afterAll(async () => {
  db.close()
  if (existsSync(TEST_DB)) unlinkSync(TEST_DB)
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
      method: 'POST', url: '/api/sessions', headers,
      payload: { name: 'invalid name!', command: 'bash' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('should reject missing command', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/sessions', headers,
      payload: { name: 'no-cmd' },
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('GET /api/sessions', () => {
  it('should list sessions', async () => {
    await app.inject({
      method: 'POST', url: '/api/sessions', headers,
      payload: { name: 'list-test', command: 'bash' },
    })
    const res = await app.inject({
      method: 'GET', url: '/api/sessions', headers,
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThanOrEqual(1)
  })

  it('should filter by status', async () => {
    await app.inject({
      method: 'POST', url: '/api/sessions', headers,
      payload: { name: 'filter-test', command: 'bash' },
    })
    const res = await app.inject({
      method: 'GET', url: '/api/sessions?status=idle', headers,
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.every(s => s.status === 'idle')).toBe(true)
  })
})

describe('GET /api/sessions/:id', () => {
  it('should return session detail with output', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/sessions', headers,
      payload: { name: 'detail-test', command: 'bash' },
    })
    const { id } = created.json().data
    const res = await app.inject({
      method: 'GET', url: `/api/sessions/${id}`, headers,
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.id).toBe(id)
    expect(res.json().data.output).toBeDefined()
  })

  it('should 404 for unknown session', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/sessions/nonexistent-id', headers,
    })
    expect(res.statusCode).toBe(404)
  })
})

describe('POST /api/sessions/:id/task', () => {
  it('should send task to session', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/sessions', headers,
      payload: { name: 'task-test', command: 'bash' },
    })
    const { id } = created.json().data
    const res = await app.inject({
      method: 'POST', url: `/api/sessions/${id}/task`, headers,
      payload: { input: 'echo hello' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.status).toBe('running')
    expect(res.json().data.current_task).toBe('echo hello')
  })

  it('should reject task to stopped session', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/sessions', headers,
      payload: { name: 'task-stop-test', command: 'bash' },
    })
    const { id } = created.json().data
    await app.inject({
      method: 'DELETE', url: `/api/sessions/${id}`, headers,
    })
    const res = await app.inject({
      method: 'POST', url: `/api/sessions/${id}/task`, headers,
      payload: { input: 'echo nope' },
    })
    expect(res.statusCode).toBe(409)
  })

  it('should reject task to failed session', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/sessions', headers,
      payload: { name: 'task-fail-test', command: 'bash' },
    })
    const { id } = created.json().data
    await terminal.killSession('session-task-fail-test')
    await sessionService.checkHealth(id)
    const res = await app.inject({
      method: 'POST', url: `/api/sessions/${id}/task`, headers,
      payload: { input: 'echo nope' },
    })
    expect(res.statusCode).toBe(409)
  })
})

describe('DELETE /api/sessions/:id', () => {
  it('should kill session', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/sessions', headers,
      payload: { name: 'kill-test', command: 'bash' },
    })
    const { id } = created.json().data
    const res = await app.inject({
      method: 'DELETE', url: `/api/sessions/${id}`, headers,
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.status).toBe('stopped')
  })

  it('should 404 for unknown session', async () => {
    const res = await app.inject({
      method: 'DELETE', url: '/api/sessions/nonexistent-id', headers,
    })
    expect(res.statusCode).toBe(404)
  })
})

describe('GET /api/sessions/:id/health', () => {
  it('should return health for alive session', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/sessions', headers,
      payload: { name: 'health-test', command: 'bash' },
    })
    const { id } = created.json().data
    const res = await app.inject({
      method: 'GET', url: `/api/sessions/${id}/health`, headers,
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.alive).toBe(true)
  })
})

describe('POST /api/sessions with cwd', () => {
  it('should spawn session with cwd', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/sessions', headers,
      payload: { name: 'cwd-route-test', command: 'bash', cwd: '/tmp' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().data.cwd).toBe('/tmp')
    expect(res.json().data.event_token).toBeDefined()
  })

  it('should reject non-absolute cwd', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/sessions', headers,
      payload: { name: 'cwd-relative', command: 'bash', cwd: 'relative/path' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('should accept spawn without cwd', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/sessions', headers,
      payload: { name: 'no-cwd-route', command: 'bash' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().data.cwd).toBeNull()
  })
})

describe('GET /api/sessions with new statuses', () => {
  it('should filter by waiting_input status', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/sessions', headers,
      payload: { name: 'status-filter', command: 'bash' },
    })
    const { id } = created.json().data
    await sessionService.processEvent(id, 'notification', { message: 'confirm?' })

    const res = await app.inject({
      method: 'GET', url: '/api/sessions?status=waiting_input', headers,
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.length).toBeGreaterThanOrEqual(1)
    expect(res.json().data.every(s => s.status === 'waiting_input')).toBe(true)
  })
})

describe('GET /api/sessions/:id with last_event', () => {
  it('should include last_event in detail', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/sessions', headers,
      payload: { name: 'detail-evt', command: 'bash' },
    })
    const { id } = created.json().data
    await sessionService.processEvent(id, 'notification', { message: 'test' })

    const res = await app.inject({
      method: 'GET', url: `/api/sessions/${id}`, headers,
    })
    expect(res.json().data.last_event).toBeDefined()
    expect(res.json().data.last_event.type).toBe('notification')
  })

  it('should have null last_event when no events', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/sessions', headers,
      payload: { name: 'detail-no-evt', command: 'bash' },
    })
    const { id } = created.json().data
    const res = await app.inject({
      method: 'GET', url: `/api/sessions/${id}`, headers,
    })
    expect(res.json().data.last_event).toBeNull()
  })
})
