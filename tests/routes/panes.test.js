import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { authPlugin } from '../../src/server/plugins/auth.js'
import { paneRoutes } from '../../src/server/routes/panes.js'
import { TmuxService } from '../../src/server/services/tmux.js'

const API_KEY = 'test-key'
const headers = { 'x-api-key': API_KEY }
const TEST_SESSION = 'pane-route-test'
const BASE = `/api/sessions/${TEST_SESSION}/windows/0/panes`

let app
const tmux = new TmuxService()

async function cleanup() {
  try { await tmux.killSession(TEST_SESSION) } catch {}
}

beforeAll(async () => {
  app = Fastify()
  app.decorate('tmux', tmux)
  await app.register(authPlugin, { apiKey: API_KEY })
  await app.register(paneRoutes, { prefix: '/api' })
})

beforeEach(async () => {
  await cleanup()
  await tmux.createSession(TEST_SESSION)
})

afterAll(async () => {
  await cleanup()
  await app.close()
})

describe('GET .../panes', () => {
  it('should list panes', async () => {
    const res = await app.inject({ method: 'GET', url: BASE, headers })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(body.data.length).toBe(1)
  })
})

describe('POST .../panes', () => {
  it('should split pane horizontally', async () => {
    const res = await app.inject({
      method: 'POST', url: BASE, headers,
      payload: { direction: 'h' }
    })
    expect(res.statusCode).toBe(201)
    const panes = await tmux.listPanes(TEST_SESSION, 0)
    expect(panes.length).toBe(2)
  })

  it('should split pane vertically', async () => {
    const res = await app.inject({
      method: 'POST', url: BASE, headers,
      payload: { direction: 'v' }
    })
    expect(res.statusCode).toBe(201)
  })

  it('should reject invalid direction', async () => {
    const res = await app.inject({
      method: 'POST', url: BASE, headers,
      payload: { direction: 'x' }
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('PUT .../panes/:index/resize', () => {
  it('should resize a pane', async () => {
    await tmux.splitPane(TEST_SESSION, 0, 'h')
    const res = await app.inject({
      method: 'PUT', url: `${BASE}/0/resize`, headers,
      payload: { direction: 'R', amount: 5 }
    })
    expect(res.statusCode).toBe(200)
  })

  it('should reject invalid resize direction', async () => {
    await tmux.splitPane(TEST_SESSION, 0, 'h')
    const res = await app.inject({
      method: 'PUT', url: `${BASE}/0/resize`, headers,
      payload: { direction: 'X', amount: 5 }
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('DELETE .../panes/:index', () => {
  it('should kill a pane', async () => {
    await tmux.splitPane(TEST_SESSION, 0, 'h')
    const res = await app.inject({
      method: 'DELETE', url: `${BASE}/1`, headers
    })
    expect(res.statusCode).toBe(200)
  })
})

describe('POST .../panes/:index/send-keys', () => {
  it('should send keys', async () => {
    const res = await app.inject({
      method: 'POST', url: `${BASE}/0/send-keys`, headers,
      payload: { keys: 'echo test' }
    })
    expect(res.statusCode).toBe(200)
  })
})

describe('GET .../panes/:index/capture', () => {
  it('should capture pane output', async () => {
    const res = await app.inject({
      method: 'GET', url: `${BASE}/0/capture`, headers
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data).toHaveProperty('content')
  })
})
