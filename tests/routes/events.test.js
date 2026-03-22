import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import Fastify from 'fastify'
import { authPlugin } from '../../src/server/plugins/auth.js'
import { eventRoutes } from '../../src/server/routes/events.js'
import { TerminalService } from '../../src/server/services/terminal.js'
import { SessionService } from '../../src/server/services/session.js'
import { DatabaseService } from '../../src/server/services/database.js'
import { existsSync, unlinkSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const API_KEY = 'test-key'
const headers = { 'x-api-key': API_KEY }
const TEST_DB = join(process.cwd(), 'data', 'test-routes-events.db')
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
  await app.register(eventRoutes, { prefix: '/api' })
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

describe('POST /api/sessions/:id/events', () => {
  it('should accept event with valid token', async () => {
    const session = await sessionService.spawn('evt-test', 'bash')
    const res = await app.inject({
      method: 'POST',
      url: `/api/sessions/${session.id}/events?token=${session.event_token}`,
      payload: { type: 'notification', data: { message: 'test' } },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().success).toBe(true)
    expect(res.json().data.type).toBe('notification')
  })

  it('should reject invalid token with 403', async () => {
    const session = await sessionService.spawn('evt-bad-token', 'bash')
    const res = await app.inject({
      method: 'POST',
      url: `/api/sessions/${session.id}/events?token=wrong`,
      payload: { type: 'stop' },
    })
    expect(res.statusCode).toBe(403)
  })

  it('should reject missing token with 403', async () => {
    const session = await sessionService.spawn('evt-no-token', 'bash')
    const res = await app.inject({
      method: 'POST',
      url: `/api/sessions/${session.id}/events`,
      payload: { type: 'stop' },
    })
    expect(res.statusCode).toBe(403)
  })

  it('should 404 for unknown session', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/sessions/nonexistent/events?token=anything',
      payload: { type: 'stop' },
    })
    expect(res.statusCode).toBe(404)
  })

  it('should update session status from event type', async () => {
    const session = await sessionService.spawn('evt-status', 'bash')
    await app.inject({
      method: 'POST',
      url: `/api/sessions/${session.id}/events?token=${session.event_token}`,
      payload: { type: 'notification', data: { notification_type: 'permission_prompt' } },
    })
    const updated = db.getSession(session.id)
    expect(updated.status).toBe('waiting_input')
  })

  it('should normalize hook_event_name to type', async () => {
    const session = await sessionService.spawn('evt-hook', 'bash')
    const res = await app.inject({
      method: 'POST',
      url: `/api/sessions/${session.id}/events?token=${session.event_token}`,
      payload: { hook_event_name: 'StopFailure', session_id: 'abc' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().data.type).toBe('stop_failure')
  })

  it('should not require auth header (token-based)', async () => {
    const session = await sessionService.spawn('evt-noauth', 'bash')
    const res = await app.inject({
      method: 'POST',
      url: `/api/sessions/${session.id}/events?token=${session.event_token}`,
      payload: { type: 'stop' },
      // No x-api-key header
    })
    expect(res.statusCode).toBe(201)
  })
})

describe('GET /api/sessions/:id/events', () => {
  it('should require auth', async () => {
    const session = await sessionService.spawn('evt-list-auth', 'bash')
    const res = await app.inject({
      method: 'GET',
      url: `/api/sessions/${session.id}/events`,
    })
    expect(res.statusCode).toBe(401)
  })

  it('should return events newest first', async () => {
    const session = await sessionService.spawn('evt-list', 'bash')
    await sessionService.processEvent(session.id, 'tool_use', {})
    await sessionService.processEvent(session.id, 'notification', { message: 'confirm?' })
    await sessionService.processEvent(session.id, 'stop', {})

    const res = await app.inject({
      method: 'GET',
      url: `/api/sessions/${session.id}/events`,
      headers,
    })
    expect(res.statusCode).toBe(200)
    const events = res.json().data
    expect(events.length).toBe(3)
    expect(events[0].type).toBe('stop')
    expect(events[2].type).toBe('tool_use')
  })

  it('should respect limit param', async () => {
    const session = await sessionService.spawn('evt-limit', 'bash')
    await sessionService.processEvent(session.id, 'tool_use', {})
    await sessionService.processEvent(session.id, 'stop', {})

    const res = await app.inject({
      method: 'GET',
      url: `/api/sessions/${session.id}/events?limit=1`,
      headers,
    })
    expect(res.json().data.length).toBe(1)
  })
})
