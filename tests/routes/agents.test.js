import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import Fastify from 'fastify'
import { authPlugin } from '../../src/server/plugins/auth.js'
import { agentRoutes } from '../../src/server/routes/agents.js'
import { TerminalService } from '../../src/server/services/terminal.js'
import { SessionService } from '../../src/server/services/session.js'
import { AgentService } from '../../src/server/services/agent.js'
import { DatabaseService } from '../../src/server/services/database.js'
import { existsSync, unlinkSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const API_KEY = 'test-key'
const headers = { 'x-api-key': API_KEY }
const TEST_DB = join(process.cwd(), 'data', 'test-routes-agents.db')
const SESSION_PREFIX = 'session-'

let app, terminal, db, sessionService, agentService

beforeAll(async () => {
  mkdirSync(join(process.cwd(), 'data'), { recursive: true })
  terminal = new TerminalService()
  db = new DatabaseService(TEST_DB)
  db.init()
  sessionService = new SessionService(terminal, db)
  agentService = new AgentService(db, sessionService)

  app = Fastify()
  app.decorate('terminal', terminal)
  app.decorate('db', db)
  app.decorate('sessionService', sessionService)
  app.decorate('agentService', agentService)
  await app.register(authPlugin, { apiKey: API_KEY })
  await app.register(agentRoutes, { prefix: '/api' })
})

afterEach(async () => {
  const sessions = db.listSessions()
  for (const s of sessions) {
    try { await terminal.killSession(`${SESSION_PREFIX}${s.name}`) } catch {}
  }
  db.db.exec('DELETE FROM session_events')
  db.db.exec('DELETE FROM sessions')
  db.db.exec('DELETE FROM agents')
})

afterAll(async () => {
  db.close()
  if (existsSync(TEST_DB)) unlinkSync(TEST_DB)
  await app.close()
})

describe('POST /api/agents', () => {
  it('should require auth', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/agents',
      payload: { name: 'auth-test', command: 'bash' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('should create an agent', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/agents', headers,
      payload: { name: 'my-agent', command: 'claude --dangerously-skip-permissions' },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(body.data.name).toBe('my-agent')
    expect(body.data.command).toBe('claude --dangerously-skip-permissions')
    expect(body.data.id).toBeDefined()
  })

  it('should create agent with optional fields', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/agents', headers,
      payload: {
        name: 'full-agent',
        command: 'bash',
        cwd: '/tmp',
        description: 'A test agent',
        env: { FOO: 'bar' },
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.data.cwd).toBe('/tmp')
    expect(body.data.description).toBe('A test agent')
    expect(body.data.env).toEqual({ FOO: 'bar' })
  })

  it('should reject invalid name', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/agents', headers,
      payload: { name: 'invalid name!', command: 'bash' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('should reject missing command', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/agents', headers,
      payload: { name: 'no-cmd' },
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('GET /api/agents', () => {
  it('should list agents', async () => {
    await app.inject({
      method: 'POST', url: '/api/agents', headers,
      payload: { name: 'list-agent', command: 'bash' },
    })
    const res = await app.inject({
      method: 'GET', url: '/api/agents', headers,
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThanOrEqual(1)
  })

  it('should include active_sessions count', async () => {
    await app.inject({
      method: 'POST', url: '/api/agents', headers,
      payload: { name: 'count-agent', command: 'bash' },
    })
    const res = await app.inject({
      method: 'GET', url: '/api/agents', headers,
    })
    expect(res.json().data[0].active_sessions).toBeDefined()
  })
})

describe('GET /api/agents/:id', () => {
  it('should 404 for missing agent', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/agents/nonexistent-id', headers,
    })
    expect(res.statusCode).toBe(404)
  })

  it('should get agent detail with active_sessions', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/agents', headers,
      payload: { name: 'detail-agent', command: 'bash' },
    })
    const { id } = created.json().data
    const res = await app.inject({
      method: 'GET', url: `/api/agents/${id}`, headers,
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.id).toBe(id)
    expect(body.data.active_sessions).toBe(0)
  })
})

describe('PUT /api/agents/:id', () => {
  it('should update agent', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/agents', headers,
      payload: { name: 'update-agent', command: 'bash' },
    })
    const { id } = created.json().data
    const res = await app.inject({
      method: 'PUT', url: `/api/agents/${id}`, headers,
      payload: { description: 'Updated description' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.description).toBe('Updated description')
  })

  it('should 404 for missing agent', async () => {
    const res = await app.inject({
      method: 'PUT', url: '/api/agents/nonexistent-id', headers,
      payload: { description: 'nope' },
    })
    expect(res.statusCode).toBe(404)
  })
})

describe('DELETE /api/agents/:id', () => {
  it('should delete agent', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/agents', headers,
      payload: { name: 'delete-agent', command: 'bash' },
    })
    const { id } = created.json().data
    const res = await app.inject({
      method: 'DELETE', url: `/api/agents/${id}`, headers,
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.id).toBe(id)

    // Confirm it's gone
    const check = await app.inject({
      method: 'GET', url: `/api/agents/${id}`, headers,
    })
    expect(check.statusCode).toBe(404)
  })

  it('should reject delete with active sessions (409)', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/agents', headers,
      payload: { name: 'active-agent', command: 'bash' },
    })
    const agentId = created.json().data.id

    // Launch a session to make it active
    await app.inject({
      method: 'POST', url: `/api/agents/${agentId}/launch`, headers,
      payload: {},
    })

    const res = await app.inject({
      method: 'DELETE', url: `/api/agents/${agentId}`, headers,
    })
    expect(res.statusCode).toBe(409)
  })

  it('should 404 for missing agent', async () => {
    const res = await app.inject({
      method: 'DELETE', url: '/api/agents/nonexistent-id', headers,
    })
    expect(res.statusCode).toBe(404)
  })
})

describe('POST /api/agents/:id/launch', () => {
  it('should 404 for missing agent', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/agents/nonexistent-id/launch', headers,
      payload: {},
    })
    expect(res.statusCode).toBe(404)
  })

  it('should launch session with explicit name (201)', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/agents', headers,
      payload: { name: 'launch-agent', command: 'bash' },
    })
    const agentId = created.json().data.id
    const res = await app.inject({
      method: 'POST', url: `/api/agents/${agentId}/launch`, headers,
      payload: { name: 'explicit-session' },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(body.data.name).toBe('explicit-session')
    expect(body.data.status).toBe('idle')
  })

  it('should auto-generate session name when not provided', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/agents', headers,
      payload: { name: 'autoname-agent', command: 'bash' },
    })
    const agentId = created.json().data.id
    const res = await app.inject({
      method: 'POST', url: `/api/agents/${agentId}/launch`, headers,
      payload: {},
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.data.name).toMatch(/^autoname-agent-/)
    expect(body.data.id).toBeDefined()
  })
})

describe('GET /api/agents/:id/sessions', () => {
  it('should 404 for missing agent', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/agents/nonexistent-id/sessions', headers,
    })
    expect(res.statusCode).toBe(404)
  })

  it('should list sessions for agent', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/agents', headers,
      payload: { name: 'sessions-agent', command: 'bash' },
    })
    const agentId = created.json().data.id

    // Launch two sessions
    await app.inject({
      method: 'POST', url: `/api/agents/${agentId}/launch`, headers,
      payload: { name: 'sess-one' },
    })
    await app.inject({
      method: 'POST', url: `/api/agents/${agentId}/launch`, headers,
      payload: { name: 'sess-two' },
    })

    const res = await app.inject({
      method: 'GET', url: `/api/agents/${agentId}/sessions`, headers,
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBe(2)
  })
})
