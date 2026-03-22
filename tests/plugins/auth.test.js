import { describe, it, expect, beforeEach } from 'vitest'
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
    expect(res.json()).toEqual({ success: false, error: 'Missing or invalid API key' })
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
