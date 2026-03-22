# AgentService (L3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add L3 AgentService — agent definitions (blueprints) that can launch sessions, with full CRUD API and agent-to-session tracking.

**Architecture:** AgentService owns agent definitions in DB and delegates session spawning to SessionService. New `agents` table stores blueprints. Sessions table gets `agent_id` FK for tracking. SessionService.spawn() extended with optional `env` and `agentId` params.

**Tech Stack:** Fastify, better-sqlite3, Vitest

**Spec:** `docs/superpowers/specs/2026-03-22-agent-service-design.md`

---

### Task 1: Add agents table and agent_id column to DatabaseService

**Files:**
- Modify: `src/server/services/database.js`
- Modify: `tests/services/database.test.js`

- [ ] **Step 1: Add agents table and agent_id migration to database.js**

In `src/server/services/database.js`, add to the end of `#migrate()`:

```js
this.db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    command TEXT NOT NULL,
    cwd TEXT,
    description TEXT,
    env TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

try { this.db.exec('ALTER TABLE sessions ADD COLUMN agent_id TEXT REFERENCES agents(id)') } catch {}
```

- [ ] **Step 2: Add agent CRUD methods to DatabaseService**

Add these methods to `DatabaseService`:

```js
createAgent({ id, name, command, cwd = null, description = null, env = null }) {
  const now = new Date().toISOString()
  const envStr = env ? JSON.stringify(env) : null
  this.db.prepare(`
    INSERT INTO agents (id, name, command, cwd, description, env, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, command, cwd, description, envStr, now, now)
  return this.getAgent(id)
}

getAgent(id) {
  const row = this.db.prepare('SELECT * FROM agents WHERE id = ?').get(id)
  if (row && row.env) row.env = JSON.parse(row.env)
  return row
}

listAgents() {
  const rows = this.db.prepare('SELECT * FROM agents').all()
  return rows.map(row => {
    if (row.env) row.env = JSON.parse(row.env)
    return row
  })
}

updateAgent(id, fields) {
  const allowed = ['name', 'command', 'cwd', 'description', 'env']
  const sets = []
  const values = []
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = ?`)
      values.push(key === 'env' && fields[key] ? JSON.stringify(fields[key]) : fields[key])
    }
  }
  if (sets.length === 0) return this.getAgent(id)
  sets.push('updated_at = ?')
  values.push(new Date().toISOString())
  values.push(id)
  this.db.prepare(`UPDATE agents SET ${sets.join(', ')} WHERE id = ?`).run(...values)
  return this.getAgent(id)
}

deleteAgent(id) {
  this.db.prepare('DELETE FROM agents WHERE id = ?').run(id)
}

countActiveSessionsByAgent(agentId) {
  const row = this.db.prepare(
    "SELECT COUNT(*) as count FROM sessions WHERE agent_id = ? AND status != 'stopped'"
  ).get(agentId)
  return row.count
}

listSessionsByAgent(agentId) {
  return this.db.prepare('SELECT * FROM sessions WHERE agent_id = ?').all(agentId)
}
```

- [ ] **Step 3: Update createSession to accept agent_id**

Modify `createSession` signature and SQL:

```js
createSession({ id, name, command, status = 'idle', cwd = null, event_token = null, agent_id = null }) {
  const now = new Date().toISOString()
  this.db.prepare(`
    INSERT INTO sessions (id, name, command, status, cwd, event_token, agent_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, command, status, cwd, event_token, agent_id, now, now)
  return this.getSession(id)
}
```

- [ ] **Step 4: Write database tests for agent methods**

Add agent tests to `tests/services/database.test.js`:

```js
describe('agents', () => {
  it('should create and get agent', () => {
    const agent = db.createAgent({
      id: 'agent-1', name: 'test-agent', command: 'echo hello',
      cwd: '/tmp', description: 'Test agent', env: { FOO: 'bar' },
    })
    expect(agent.name).toBe('test-agent')
    expect(agent.env).toEqual({ FOO: 'bar' })
    const fetched = db.getAgent('agent-1')
    expect(fetched.command).toBe('echo hello')
  })

  it('should list agents', () => {
    db.createAgent({ id: 'a1', name: 'agent-a', command: 'cmd-a' })
    db.createAgent({ id: 'a2', name: 'agent-b', command: 'cmd-b' })
    expect(db.listAgents()).toHaveLength(2)
  })

  it('should update agent', () => {
    db.createAgent({ id: 'a1', name: 'orig', command: 'cmd' })
    const updated = db.updateAgent('a1', { description: 'updated' })
    expect(updated.description).toBe('updated')
    expect(updated.command).toBe('cmd')
  })

  it('should delete agent', () => {
    db.createAgent({ id: 'a1', name: 'del', command: 'cmd' })
    db.deleteAgent('a1')
    expect(db.getAgent('a1')).toBeUndefined()
  })

  it('should count active sessions by agent', () => {
    db.createAgent({ id: 'a1', name: 'agent', command: 'cmd' })
    db.createSession({ id: 's1', name: 'sess1', command: 'cmd', agent_id: 'a1' })
    db.createSession({ id: 's2', name: 'sess2', command: 'cmd', agent_id: 'a1', status: 'stopped' })
    expect(db.countActiveSessionsByAgent('a1')).toBe(1)
  })

  it('should list sessions by agent', () => {
    db.createAgent({ id: 'a1', name: 'agent', command: 'cmd' })
    db.createSession({ id: 's1', name: 'sess1', command: 'cmd', agent_id: 'a1' })
    db.createSession({ id: 's2', name: 'sess2', command: 'cmd' })
    expect(db.listSessionsByAgent('a1')).toHaveLength(1)
  })
})
```

Add cleanup for agents table in `afterEach`:
```js
db.db.exec('DELETE FROM session_events')
db.db.exec('DELETE FROM sessions')
db.db.exec('DELETE FROM agents')
```

- [ ] **Step 5: Run database tests**

Run: `npx vitest run tests/services/database.test.js`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/server/services/database.js tests/services/database.test.js
git commit -m "feat: add agents table, agent_id FK, and agent CRUD to DatabaseService"
```

---

### Task 2: Extend SessionService.spawn() with env and agentId

**Files:**
- Modify: `src/server/services/session.js`
- Modify: `tests/services/session.test.js`

- [ ] **Step 1: Extend spawn() signature**

In `src/server/services/session.js`, update `spawn`:

```js
async spawn(name, command, cwd, { env = null, agentId = null } = {}) {
  const id = randomUUID()
  const eventToken = randomUUID()
  const sessionName = `${SESSION_PREFIX}${name}`

  await this.terminal.createSession(sessionName, cwd || undefined)

  // Send env vars before command
  if (env && typeof env === 'object') {
    for (const [key, val] of Object.entries(env)) {
      await this.terminal.sendKeys(sessionName, '0', '0', `export ${key}=${val}`)
      await this.terminal.sendKeys(sessionName, '0', '0', 'Enter')
    }
  }

  await this.terminal.sendKeys(sessionName, '0', '0', command)
  await this.terminal.sendKeys(sessionName, '0', '0', 'Enter')

  try {
    return this.db.createSession({
      id, name, command, status: 'idle',
      cwd: cwd || null,
      event_token: eventToken,
      agent_id: agentId,
    })
  } catch (err) {
    try { await this.terminal.killSession(sessionName) } catch {}
    throw err
  }
}
```

- [ ] **Step 2: Add test for spawn with env and agentId**

In `tests/services/session.test.js`, add:

```js
it('should spawn with env vars and agentId', async () => {
  const session = await sessionService.spawn('env-test', 'echo done', null, {
    env: { MY_VAR: 'hello' },
    agentId: 'test-agent-id',
  })
  expect(session.name).toBe('env-test')
  expect(session.agent_id).toBe('test-agent-id')
})
```

- [ ] **Step 3: Run session service tests**

Run: `npx vitest run tests/services/session.test.js`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/server/services/session.js tests/services/session.test.js
git commit -m "feat: extend SessionService.spawn() with env and agentId support"
```

---

### Task 3: Create AgentService

**Files:**
- Create: `src/server/services/agent.js`
- Create: `tests/services/agent.test.js`

- [ ] **Step 1: Create AgentService class**

Create `src/server/services/agent.js`:

```js
import { randomUUID } from 'node:crypto'

export class AgentService {
  constructor(db, sessionService) {
    this.db = db
    this.sessionService = sessionService
  }

  create(name, command, cwd, description, env) {
    const id = randomUUID()
    return this.db.createAgent({ id, name, command, cwd, description, env })
  }

  get(id) {
    const agent = this.db.getAgent(id)
    if (!agent) throw new Error(`Agent not found: ${id}`)
    agent.active_sessions = this.db.countActiveSessionsByAgent(id)
    return agent
  }

  list() {
    const agents = this.db.listAgents()
    return agents.map(agent => {
      agent.active_sessions = this.db.countActiveSessionsByAgent(agent.id)
      return agent
    })
  }

  update(id, fields) {
    const agent = this.db.getAgent(id)
    if (!agent) throw new Error(`Agent not found: ${id}`)
    return this.db.updateAgent(id, fields)
  }

  delete(id) {
    const agent = this.db.getAgent(id)
    if (!agent) throw new Error(`Agent not found: ${id}`)
    const active = this.db.countActiveSessionsByAgent(id)
    if (active > 0) throw new Error('Cannot delete agent with active sessions')
    this.db.deleteAgent(id)
    return agent
  }

  async launch(id, sessionName) {
    const agent = this.db.getAgent(id)
    if (!agent) throw new Error(`Agent not found: ${id}`)

    if (!sessionName) {
      const base = agent.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-')
      const short = randomUUID().slice(0, 4)
      sessionName = `${base}-${short}`
    }

    return this.sessionService.spawn(
      sessionName, agent.command, agent.cwd,
      { env: agent.env, agentId: id }
    )
  }

  listSessions(id) {
    const agent = this.db.getAgent(id)
    if (!agent) throw new Error(`Agent not found: ${id}`)
    return this.db.listSessionsByAgent(id)
  }
}
```

- [ ] **Step 2: Create agent service tests**

Create `tests/services/agent.test.js`:

```js
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { AgentService } from '../../src/server/services/agent.js'
import { SessionService } from '../../src/server/services/session.js'
import { TerminalService } from '../../src/server/services/terminal.js'
import { DatabaseService } from '../../src/server/services/database.js'
import { existsSync, unlinkSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const TEST_DB = join(process.cwd(), 'data', 'test-agent-service.db')
const SESSION_PREFIX = 'session-'

let agentService, sessionService, terminal, db

beforeAll(() => {
  mkdirSync(join(process.cwd(), 'data'), { recursive: true })
  terminal = new TerminalService()
  db = new DatabaseService(TEST_DB)
  db.init()
  sessionService = new SessionService(terminal, db)
  agentService = new AgentService(db, sessionService)
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

afterAll(() => {
  db.close()
  if (existsSync(TEST_DB)) unlinkSync(TEST_DB)
})

describe('AgentService', () => {
  describe('CRUD', () => {
    it('should create agent', () => {
      const agent = agentService.create('test-agent', 'echo hello', '/tmp', 'A test', { KEY: 'val' })
      expect(agent.name).toBe('test-agent')
      expect(agent.command).toBe('echo hello')
      expect(agent.env).toEqual({ KEY: 'val' })
    })

    it('should get agent with active_sessions count', () => {
      const agent = agentService.create('my-agent', 'cmd', null, null, null)
      const fetched = agentService.get(agent.id)
      expect(fetched.active_sessions).toBe(0)
    })

    it('should throw on get non-existent agent', () => {
      expect(() => agentService.get('nope')).toThrow('Agent not found')
    })

    it('should list agents with active_sessions', () => {
      agentService.create('a1', 'cmd1', null, null, null)
      agentService.create('a2', 'cmd2', null, null, null)
      const list = agentService.list()
      expect(list).toHaveLength(2)
      expect(list[0]).toHaveProperty('active_sessions')
    })

    it('should update agent', () => {
      const agent = agentService.create('upd', 'cmd', null, null, null)
      const updated = agentService.update(agent.id, { description: 'new desc' })
      expect(updated.description).toBe('new desc')
    })

    it('should delete agent', () => {
      const agent = agentService.create('del', 'cmd', null, null, null)
      agentService.delete(agent.id)
      expect(() => agentService.get(agent.id)).toThrow('Agent not found')
    })

    it('should reject delete with active sessions', async () => {
      const agent = agentService.create('busy', 'echo hi', null, null, null)
      await agentService.launch(agent.id)
      expect(() => agentService.delete(agent.id)).toThrow('Cannot delete agent with active sessions')
    })
  })

  describe('launch', () => {
    it('should launch session from agent', async () => {
      const agent = agentService.create('launcher', 'echo hi', null, null, null)
      const session = await agentService.launch(agent.id, 'my-session')
      expect(session.name).toBe('my-session')
      expect(session.agent_id).toBe(agent.id)
    })

    it('should auto-generate session name', async () => {
      const agent = agentService.create('auto-name', 'echo hi', null, null, null)
      const session = await agentService.launch(agent.id)
      expect(session.name).toMatch(/^auto-name-[a-f0-9]{4}$/)
      expect(session.agent_id).toBe(agent.id)
    })

    it('should throw on launch non-existent agent', async () => {
      await expect(agentService.launch('nope')).rejects.toThrow('Agent not found')
    })
  })

  describe('listSessions', () => {
    it('should list sessions for agent', async () => {
      const agent = agentService.create('ls-agent', 'echo hi', null, null, null)
      await agentService.launch(agent.id, 'sess-1')
      await agentService.launch(agent.id, 'sess-2')
      const sessions = agentService.listSessions(agent.id)
      expect(sessions).toHaveLength(2)
    })
  })
})
```

- [ ] **Step 3: Run agent service tests**

Run: `npx vitest run tests/services/agent.test.js`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/server/services/agent.js tests/services/agent.test.js
git commit -m "feat: add AgentService with CRUD, launch, and session listing"
```

---

### Task 4: Create agent routes

**Files:**
- Create: `src/server/routes/agents.js`
- Create: `tests/routes/agents.test.js`

- [ ] **Step 1: Create agent routes file**

Create `src/server/routes/agents.js`:

```js
const namePattern = '^[a-zA-Z0-9_-]+$'

const agentSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    command: { type: 'string' },
    cwd: { type: ['string', 'null'] },
    description: { type: ['string', 'null'] },
    env: { type: ['object', 'null'] },
    active_sessions: { type: 'integer' },
    created_at: { type: 'string' },
    updated_at: { type: 'string' },
  },
}

export async function agentRoutes(fastify) {
  const { agentService } = fastify

  // GET /api/agents
  fastify.get('/agents', {
    schema: {
      tags: ['L3 — Agent'],
      summary: 'List all agents',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array', items: agentSchema },
          },
        },
      },
    },
  }, async () => {
    const data = agentService.list()
    return { success: true, data }
  })

  // POST /api/agents
  fastify.post('/agents', {
    schema: {
      tags: ['L3 — Agent'],
      summary: 'Create agent',
      body: {
        type: 'object',
        required: ['name', 'command'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 128, pattern: namePattern },
          command: { type: 'string', minLength: 1, maxLength: 4096 },
          cwd: { type: 'string', pattern: '^/', maxLength: 4096 },
          description: { type: 'string', maxLength: 1024 },
          env: { type: 'object', additionalProperties: { type: 'string' } },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: { success: { type: 'boolean' }, data: agentSchema },
        },
      },
    },
  }, async (request, reply) => {
    const { name, command, cwd, description, env } = request.body
    const data = agentService.create(name, command, cwd, description, env)
    reply.code(201)
    return { success: true, data }
  })

  // GET /api/agents/:id
  fastify.get('/agents/:id', {
    schema: {
      tags: ['L3 — Agent'],
      summary: 'Get agent detail',
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (request, reply) => {
    try {
      const data = agentService.get(request.params.id)
      return { success: true, data }
    } catch (err) {
      reply.code(404)
      return { success: false, error: err.message }
    }
  })

  // PUT /api/agents/:id
  fastify.put('/agents/:id', {
    schema: {
      tags: ['L3 — Agent'],
      summary: 'Update agent',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 128, pattern: namePattern },
          command: { type: 'string', minLength: 1, maxLength: 4096 },
          cwd: { type: 'string', pattern: '^/', maxLength: 4096 },
          description: { type: 'string', maxLength: 1024 },
          env: { type: 'object', additionalProperties: { type: 'string' } },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const data = agentService.update(request.params.id, request.body)
      return { success: true, data }
    } catch (err) {
      reply.code(404)
      return { success: false, error: err.message }
    }
  })

  // DELETE /api/agents/:id
  fastify.delete('/agents/:id', {
    schema: {
      tags: ['L3 — Agent'],
      summary: 'Delete agent',
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (request, reply) => {
    try {
      const data = agentService.delete(request.params.id)
      return { success: true, data }
    } catch (err) {
      if (err.message.includes('active sessions')) {
        reply.code(409)
      } else if (err.message.includes('not found')) {
        reply.code(404)
      }
      return { success: false, error: err.message }
    }
  })

  // POST /api/agents/:id/launch
  fastify.post('/agents/:id/launch', {
    schema: {
      tags: ['L3 — Agent'],
      summary: 'Launch session from agent',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 128, pattern: namePattern },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const data = await agentService.launch(request.params.id, request.body?.name)
      reply.code(201)
      return { success: true, data }
    } catch (err) {
      if (err.message.includes('not found')) {
        reply.code(404)
      }
      return { success: false, error: err.message }
    }
  })

  // GET /api/agents/:id/sessions
  fastify.get('/agents/:id/sessions', {
    schema: {
      tags: ['L3 — Agent'],
      summary: 'List sessions for agent',
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (request, reply) => {
    try {
      const data = agentService.listSessions(request.params.id)
      return { success: true, data }
    } catch (err) {
      reply.code(404)
      return { success: false, error: err.message }
    }
  })
}
```

- [ ] **Step 2: Create agent route tests**

Create `tests/routes/agents.test.js`:

```js
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
    const res = await app.inject({ method: 'POST', url: '/api/agents', payload: { name: 'test', command: 'cmd' } })
    expect(res.statusCode).toBe(401)
  })

  it('should create agent', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/agents', headers,
      payload: { name: 'my-agent', command: 'echo hi', description: 'Test agent' },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(body.data.name).toBe('my-agent')
  })
})

describe('GET /api/agents', () => {
  it('should list agents', async () => {
    agentService.create('a1', 'cmd1', null, null, null)
    const res = await app.inject({ method: 'GET', url: '/api/agents', headers })
    expect(res.statusCode).toBe(200)
    expect(res.json().data).toHaveLength(1)
  })
})

describe('GET /api/agents/:id', () => {
  it('should return 404 for missing agent', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/agents/nope', headers })
    expect(res.statusCode).toBe(404)
  })

  it('should get agent detail', async () => {
    const agent = agentService.create('detail', 'cmd', null, null, null)
    const res = await app.inject({ method: 'GET', url: `/api/agents/${agent.id}`, headers })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.active_sessions).toBe(0)
  })
})

describe('PUT /api/agents/:id', () => {
  it('should update agent', async () => {
    const agent = agentService.create('upd', 'cmd', null, null, null)
    const res = await app.inject({
      method: 'PUT', url: `/api/agents/${agent.id}`, headers,
      payload: { description: 'updated' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.description).toBe('updated')
  })
})

describe('DELETE /api/agents/:id', () => {
  it('should delete agent', async () => {
    const agent = agentService.create('del', 'cmd', null, null, null)
    const res = await app.inject({ method: 'DELETE', url: `/api/agents/${agent.id}`, headers })
    expect(res.statusCode).toBe(200)
  })

  it('should reject delete with active sessions', async () => {
    const agent = agentService.create('busy', 'echo hi', null, null, null)
    await agentService.launch(agent.id, 'active-sess')
    const res = await app.inject({ method: 'DELETE', url: `/api/agents/${agent.id}`, headers })
    expect(res.statusCode).toBe(409)
  })
})

describe('POST /api/agents/:id/launch', () => {
  it('should launch session from agent', async () => {
    const agent = agentService.create('launch-test', 'echo hi', null, null, null)
    const res = await app.inject({
      method: 'POST', url: `/api/agents/${agent.id}/launch`, headers,
      payload: { name: 'launched-sess' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().data.agent_id).toBe(agent.id)
  })

  it('should auto-generate session name', async () => {
    const agent = agentService.create('auto-launch', 'echo hi', null, null, null)
    const res = await app.inject({
      method: 'POST', url: `/api/agents/${agent.id}/launch`, headers,
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().data.name).toMatch(/^auto-launch-[a-f0-9]{4}$/)
  })
})

describe('GET /api/agents/:id/sessions', () => {
  it('should list sessions for agent', async () => {
    const agent = agentService.create('ls-agent', 'echo hi', null, null, null)
    await agentService.launch(agent.id, 'sess-1')
    const res = await app.inject({ method: 'GET', url: `/api/agents/${agent.id}/sessions`, headers })
    expect(res.statusCode).toBe(200)
    expect(res.json().data).toHaveLength(1)
  })
})
```

- [ ] **Step 3: Run agent route tests**

Run: `npx vitest run tests/routes/agents.test.js`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/server/routes/agents.js tests/routes/agents.test.js
git commit -m "feat: add /api/agents CRUD, launch, and session listing routes"
```

---

### Task 5: Wire AgentService into server + update Swagger

**Files:**
- Modify: `src/server/index.js`
- Modify: `src/server/plugins/swagger.js`

- [ ] **Step 1: Update index.js**

Add imports:
```js
import { AgentService } from './services/agent.js'
import { agentRoutes } from './routes/agents.js'
```

After `app.decorate('sessionService', ...)`, add:
```js
app.decorate('agentService', new AgentService(db, app.sessionService))
```

Register routes (after other API routes):
```js
await app.register(agentRoutes, { prefix: '/api' })
```

- [ ] **Step 2: Add L3 tag to Swagger**

In `src/server/plugins/swagger.js`, add to the `tags` array:
```js
{
  name: 'L3 — Agent',
  description: 'Agent definitions — reusable blueprints for spawning sessions.',
},
```

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/server/index.js src/server/plugins/swagger.js
git commit -m "feat: wire AgentService and routes into server, add L3 Swagger tag"
```
