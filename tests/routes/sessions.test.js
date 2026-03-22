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
