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
  // Only clean up sessions created by this test file (rt-* prefix)
  const sessions = await sessionService.list()
  for (const s of sessions) {
    if (s.name.startsWith('rt-')) {
      try { await sessionService.kill(s.name) } catch {}
    }
  }
})

afterAll(async () => {
  await app.close()
})

describe('POST /api/sessions', () => {
  it('should require auth', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/sessions',
      payload: { name: 'rt-auth', command: 'bash' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('should spawn a session', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/sessions', headers,
      payload: { name: 'rt-spawn', command: 'bash' },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(body.data.name).toBe('rt-spawn')
    expect(body.data.alive).toBe(true)
  })

  it('should spawn with cwd', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/sessions', headers,
      payload: { name: 'rt-cwd', command: 'bash', cwd: '/tmp' },
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
      payload: { name: 'rt-dup', command: 'bash' },
    })
    const res = await app.inject({
      method: 'POST', url: '/api/sessions', headers,
      payload: { name: 'rt-dup', command: 'bash' },
    })
    expect(res.statusCode).toBe(409)
  })
})

describe('GET /api/sessions', () => {
  it('should list sessions', async () => {
    await app.inject({
      method: 'POST', url: '/api/sessions', headers,
      payload: { name: 'rt-list', command: 'bash' },
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
      payload: { name: 'rt-detail', command: 'bash' },
    })
    const res = await app.inject({
      method: 'GET', url: '/api/sessions/rt-detail', headers,
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.name).toBe('rt-detail')
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
      payload: { name: 'rt-task', command: 'bash' },
    })
    const res = await app.inject({
      method: 'POST', url: '/api/sessions/rt-task/task', headers,
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
      payload: { name: 'rt-kill', command: 'bash' },
    })
    const res = await app.inject({
      method: 'DELETE', url: '/api/sessions/rt-kill', headers,
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
      payload: { name: 'rt-health', command: 'bash' },
    })
    const res = await app.inject({
      method: 'GET', url: '/api/sessions/rt-health/health', headers,
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.alive).toBe(true)
  })

  it('should return alive=false for dead session', async () => {
    await app.inject({
      method: 'POST', url: '/api/sessions', headers,
      payload: { name: 'rt-healthdead', command: 'bash' },
    })
    await terminal.killSession(`${SESSION_PREFIX}rt-healthdead`)
    const res = await app.inject({
      method: 'GET', url: '/api/sessions/rt-healthdead/health', headers,
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.alive).toBe(false)
  })
})
