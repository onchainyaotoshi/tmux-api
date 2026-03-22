import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { AgentService } from '../../src/server/services/agent.js'
import { SessionService } from '../../src/server/services/session.js'
import { TerminalService } from '../../src/server/services/terminal.js'
import { DatabaseService } from '../../src/server/services/database.js'
import { existsSync, unlinkSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const TEST_DB = join(process.cwd(), 'data', 'test-agent-service.db')
const SESSION_PREFIX = 'session-'

let agentService, sessionService, tmux, db

beforeAll(() => {
  mkdirSync(join(process.cwd(), 'data'), { recursive: true })
  tmux = new TerminalService()
  db = new DatabaseService(TEST_DB)
  db.init()
  sessionService = new SessionService(tmux, db)
  agentService = new AgentService(db, sessionService)
})

afterEach(async () => {
  const sessions = db.listSessions()
  for (const s of sessions) {
    try { await tmux.killSession(`${SESSION_PREFIX}${s.name}`) } catch {}
  }
  db.db.exec('DELETE FROM session_events')
  db.db.exec('DELETE FROM sessions')
  db.db.exec('DELETE FROM agents')
})

afterAll(() => {
  db.close()
  if (existsSync(TEST_DB)) unlinkSync(TEST_DB)
})

describe('AgentService CRUD', () => {
  it('should create agent with env', () => {
    const agent = agentService.create('my-agent', 'bash', '/tmp', 'A test agent', { TOKEN: 'abc' })
    expect(agent.id).toBeDefined()
    expect(agent.name).toBe('my-agent')
    expect(agent.command).toBe('bash')
    expect(agent.cwd).toBe('/tmp')
    expect(agent.description).toBe('A test agent')
    expect(agent.env).toEqual({ TOKEN: 'abc' })
  })

  it('should get agent with active_sessions count', async () => {
    const agent = agentService.create('get-agent', 'bash', null, null, null)
    const fetched = agentService.get(agent.id)
    expect(fetched.id).toBe(agent.id)
    expect(fetched.active_sessions).toBe(0)

    await agentService.launch(agent.id, 'get-agent-s1')
    const withSession = agentService.get(agent.id)
    expect(withSession.active_sessions).toBe(1)
  })

  it('should throw on get non-existent agent', () => {
    expect(() => agentService.get('nonexistent-id')).toThrow(/Agent not found/)
  })

  it('should list agents with active_sessions', async () => {
    const a1 = agentService.create('list-agent-1', 'bash', null, null, null)
    const a2 = agentService.create('list-agent-2', 'bash', null, null, null)

    await agentService.launch(a1.id, 'list-agent-1-s1')

    const agents = agentService.list()
    expect(agents.length).toBe(2)

    const found1 = agents.find(a => a.id === a1.id)
    const found2 = agents.find(a => a.id === a2.id)
    expect(found1.active_sessions).toBe(1)
    expect(found2.active_sessions).toBe(0)
  })

  it('should update agent', () => {
    const agent = agentService.create('update-agent', 'bash', null, 'original', null)
    const updated = agentService.update(agent.id, { description: 'updated desc', command: 'sh' })
    expect(updated.description).toBe('updated desc')
    expect(updated.command).toBe('sh')
    expect(updated.name).toBe('update-agent')
  })

  it('should delete agent', () => {
    const agent = agentService.create('delete-agent', 'bash', null, null, null)
    const deleted = agentService.delete(agent.id)
    expect(deleted.id).toBe(agent.id)
    expect(() => agentService.get(agent.id)).toThrow(/Agent not found/)
  })

  it('should reject delete with active sessions', async () => {
    const agent = agentService.create('active-agent', 'bash', null, null, null)
    await agentService.launch(agent.id, 'active-agent-s1')
    expect(() => agentService.delete(agent.id)).toThrow(/Cannot delete agent with active sessions/)
  })
})

describe('AgentService launch', () => {
  it('should launch session from agent with explicit name', async () => {
    const agent = agentService.create('launch-agent', 'bash', '/tmp', null, null)
    const session = await agentService.launch(agent.id, 'launch-explicit')
    expect(session.name).toBe('launch-explicit')
    expect(session.agent_id).toBe(agent.id)
    expect(session.cwd).toBe('/tmp')

    const alive = await tmux.hasSession(`${SESSION_PREFIX}launch-explicit`)
    expect(alive).toBe(true)
  })

  it('should auto-generate session name', async () => {
    const agent = agentService.create('agent-name', 'bash', null, null, null)
    const session = await agentService.launch(agent.id)
    expect(session.name).toMatch(/^agent-name-[a-f0-9]{4}$/)
  })

  it('should throw on launch non-existent agent', async () => {
    await expect(agentService.launch('nonexistent-id', 'some-session'))
      .rejects.toThrow(/Agent not found/)
  })
})

describe('AgentService listSessions', () => {
  it('should list sessions for agent', async () => {
    const agent = agentService.create('sessions-agent', 'bash', null, null, null)
    await agentService.launch(agent.id, 'sessions-agent-s1')
    await agentService.launch(agent.id, 'sessions-agent-s2')

    const sessions = agentService.listSessions(agent.id)
    expect(sessions.length).toBe(2)
    for (const s of sessions) {
      expect(s.agent_id).toBe(agent.id)
    }
  })

  it('should throw on listSessions for non-existent agent', () => {
    expect(() => agentService.listSessions('nonexistent-id')).toThrow(/Agent not found/)
  })
})
