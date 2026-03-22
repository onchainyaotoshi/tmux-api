import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import Fastify from 'fastify'
import { authPlugin } from '../../src/server/plugins/auth.js'
import { terminalRoutes } from '../../src/server/routes/terminals.js'
import { TerminalService } from '../../src/server/services/terminal.js'

const API_KEY = 'test-key'
const headers = { 'x-api-key': API_KEY }
const TEST_SESSION = 'route-test-session'

let app
const terminalService = new TerminalService()

async function cleanup() {
  try { await terminalService.killSession(TEST_SESSION) } catch {}
  try { await terminalService.killSession('renamed-session') } catch {}
}

beforeAll(async () => {
  app = Fastify()
  app.decorate('terminal', terminalService)
  await app.register(authPlugin, { apiKey: API_KEY })
  await app.register(terminalRoutes, { prefix: '/api' })
})

afterEach(cleanup)
afterAll(async () => {
  await cleanup()
  await app.close()
})

describe('GET /api/terminals', () => {
  it('should return array of terminals', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/terminals', headers })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })
})

describe('POST /api/terminals', () => {
  it('should create a terminal', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/terminals', headers,
      payload: { name: TEST_SESSION }
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().success).toBe(true)
  })

  it('should reject missing name', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/terminals', headers,
      payload: {}
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('PUT /api/terminals/:terminal', () => {
  it('should rename a terminal', async () => {
    await terminalService.createSession(TEST_SESSION)
    const res = await app.inject({
      method: 'PUT', url: `/api/terminals/${TEST_SESSION}`, headers,
      payload: { newName: 'renamed-session' }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().success).toBe(true)
  })
})

describe('DELETE /api/terminals/:terminal', () => {
  it('should kill a terminal', async () => {
    await terminalService.createSession(TEST_SESSION)
    const res = await app.inject({
      method: 'DELETE', url: `/api/terminals/${TEST_SESSION}`, headers
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().success).toBe(true)
  })
})
