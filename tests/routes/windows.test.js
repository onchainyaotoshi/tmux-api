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
