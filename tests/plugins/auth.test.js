import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Fastify from 'fastify'
import { authPlugin } from '../../src/server/plugins/auth.js'

async function buildApp(apiKey) {
  const app = Fastify()
  await app.register(authPlugin, { apiKey })
  app.get('/api/test', async () => ({ ok: true }))
  app.get('/health', async () => ({ ok: true }))
  return app
}

describe('authPlugin', () => {
  let app

  beforeEach(async () => {
    app = await buildApp('test-key-123')
  })

  it('should reject /api/* requests without X-API-Key', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/test' })
    expect(res.statusCode).toBe(401)
    expect(res.json()).toEqual({ success: false, error: 'Unauthorized' })
  })

  it('should reject /api/* requests with wrong key', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/test',
      headers: { 'x-api-key': 'wrong-key' }
    })
    expect(res.statusCode).toBe(401)
  })

  it('should allow /api/* requests with correct key', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/test',
      headers: { 'x-api-key': 'test-key-123' }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })
  })

  it('should allow non-/api/ routes without key', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
  })
})

describe('authPlugin — Bearer token', () => {
  let app

  beforeEach(async () => {
    const appInstance = Fastify()
    await appInstance.register(authPlugin, { apiKey: 'test-key-123', authAccountsUrl: 'http://accounts.test' })
    appInstance.get('/api/test', async () => ({ ok: true }))
    appInstance.get('/health', async () => ({ ok: true }))
    app = appInstance
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete global.fetch
  })

  it('should allow /api/* with valid Bearer token', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sub: 'user-1', email: 'test@example.com' }),
    })

    const res = await app.inject({
      method: 'GET', url: '/api/test',
      headers: { authorization: 'Bearer valid-token' },
    })
    expect(res.statusCode).toBe(200)
    expect(global.fetch).toHaveBeenCalledWith('http://accounts.test/me', {
      headers: { authorization: 'Bearer valid-token' },
    })
  })

  it('should reject /api/* with invalid Bearer token', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 })

    const res = await app.inject({
      method: 'GET', url: '/api/test',
      headers: { authorization: 'Bearer invalid-token' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('should reject /api/* when accounts service is unreachable', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))

    const res = await app.inject({
      method: 'GET', url: '/api/test',
      headers: { authorization: 'Bearer some-token' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('should prefer API key when both are provided', async () => {
    global.fetch = vi.fn()

    const res = await app.inject({
      method: 'GET', url: '/api/test',
      headers: {
        'x-api-key': 'test-key-123',
        authorization: 'Bearer some-token',
      },
    })
    expect(res.statusCode).toBe(200)
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
