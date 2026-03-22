import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import Fastify from 'fastify'
import { authPlugin } from '../../src/server/plugins/auth.js'
import { healthRoutes } from '../../src/server/routes/health.js'
import { TerminalService } from '../../src/server/services/terminal.js'
import { SessionService } from '../../src/server/services/session.js'
import { DatabaseService } from '../../src/server/services/database.js'
import { existsSync, unlinkSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const API_KEY = 'test-key'
const headers = { 'x-api-key': API_KEY }
const TEST_DB = join(process.cwd(), 'data', 'test-routes-health.db')
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
  await app.register(healthRoutes, { prefix: '/api' })
})

afterEach(async () => {
  const sessions = db.listSessions()
  for (const s of sessions) {
    try { await terminal.killSession(`${SESSION_PREFIX}${s.name}`) } catch {}
  }
  db.db.exec('DELETE FROM sessions')
})

afterAll(async () => {
  db.close()
  if (existsSync(TEST_DB)) unlinkSync(TEST_DB)
  await app.close()
})

describe('GET /api/health/sessions', () => {
  it('should require auth', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/health/sessions',
    })
    expect(res.statusCode).toBe(401)
  })

  it('should return health for all sessions', async () => {
    await sessionService.spawn('health-all-1', 'bash')
    await sessionService.spawn('health-all-2', 'bash')

    const res = await app.inject({
      method: 'GET', url: '/api/health/sessions', headers,
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(2)
    expect(body.data[0].alive).toBe(true)
    expect(body.data[1].alive).toBe(true)
  })

  it('should detect dead sessions', async () => {
    const session = await sessionService.spawn('health-dead', 'bash')
    await terminal.killSession(`${SESSION_PREFIX}health-dead`)

    const res = await app.inject({
      method: 'GET', url: '/api/health/sessions', headers,
    })
    const found = res.json().data.find(s => s.id === session.id)
    expect(found.alive).toBe(false)
    expect(found.status).toBe('failed')
  })
})
