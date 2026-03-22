import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { DatabaseService } from '../../src/server/services/database.js'
import { existsSync, unlinkSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const TEST_DB_PATH = join(process.cwd(), 'data', 'test-foreman.db')

let db

beforeAll(() => {
  mkdirSync(join(process.cwd(), 'data'), { recursive: true })
  db = new DatabaseService(TEST_DB_PATH)
  db.init()
})

afterAll(() => {
  db.close()
  if (existsSync(TEST_DB_PATH)) unlinkSync(TEST_DB_PATH)
})


describe('DatabaseService', () => {
  describe('init', () => {
    it('should create sessions table', () => {
      const tables = db.db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'"
      ).all()
      expect(tables).toHaveLength(1)
    })
  })

  describe('createSession', () => {
    it('should insert a session and return it', () => {
      const session = db.createSession({
        id: 'test-id-1',
        name: 'test-session',
        command: 'claude',
        status: 'idle',
      })
      expect(session.id).toBe('test-id-1')
      expect(session.name).toBe('test-session')
      expect(session.command).toBe('claude')
      expect(session.status).toBe('idle')
      expect(session.created_at).toBeDefined()
      expect(session.updated_at).toBeDefined()
    })

    it('should reject duplicate names', () => {
      expect(() => db.createSession({
        id: 'test-id-dup',
        name: 'test-session',
        command: 'claude',
        status: 'idle',
      })).toThrow()
    })
  })

  describe('getSession', () => {
    it('should return session by id', () => {
      const session = db.getSession('test-id-1')
      expect(session.name).toBe('test-session')
    })

    it('should return undefined for unknown id', () => {
      const session = db.getSession('nonexistent')
      expect(session).toBeUndefined()
    })
  })

  describe('listSessions', () => {
    it('should return all sessions', () => {
      const sessions = db.listSessions()
      expect(sessions.length).toBeGreaterThanOrEqual(1)
    })

    it('should filter by status', () => {
      const sessions = db.listSessions('idle')
      expect(sessions.every(s => s.status === 'idle')).toBe(true)
    })
  })

  describe('updateStatus', () => {
    it('should update session status', () => {
      db.updateStatus('test-id-1', 'running')
      const session = db.getSession('test-id-1')
      expect(session.status).toBe('running')
    })
  })

  describe('updateTask', () => {
    it('should update current_task and set status to running', () => {
      db.updateTask('test-id-1', 'do something')
      const session = db.getSession('test-id-1')
      expect(session.current_task).toBe('do something')
      expect(session.status).toBe('running')
    })
  })

  describe('updateStatus to stopped', () => {
    it('should mark session as stopped', () => {
      db.updateStatus('test-id-1', 'stopped')
      const session = db.getSession('test-id-1')
      expect(session.status).toBe('stopped')
    })
  })

  describe('cwd and event_token columns', () => {
    it('should store cwd and event_token', () => {
      const session = db.createSession({
        id: 'cwd-test-id',
        name: 'cwd-session',
        command: 'claude',
        cwd: '/home/claude/project',
        event_token: 'token-123',
      })
      expect(session.cwd).toBe('/home/claude/project')
      expect(session.event_token).toBe('token-123')
    })

    it('should allow null cwd', () => {
      const session = db.createSession({
        id: 'no-cwd-id',
        name: 'no-cwd-session',
        command: 'bash',
      })
      expect(session.cwd).toBeNull()
    })
  })

  describe('session_events', () => {
    it('should create event', () => {
      const event = db.createEvent({
        id: 'evt-1',
        session_id: 'test-id-1',
        type: 'notification',
        data: { message: 'test' },
      })
      expect(event.id).toBe('evt-1')
      expect(event.type).toBe('notification')
      expect(event.data).toEqual({ message: 'test' })
    })

    it('should get last event', () => {
      db.createEvent({ id: 'evt-2', session_id: 'test-id-1', type: 'stop', data: null })
      const last = db.getLastEvent('test-id-1')
      expect(last.id).toBe('evt-2')
      expect(last.type).toBe('stop')
    })

    it('should list events newest first', () => {
      const events = db.listEvents('test-id-1', 50)
      expect(events[0].id).toBe('evt-2')
      expect(events[1].id).toBe('evt-1')
    })

    it('should return undefined for no events', () => {
      const last = db.getLastEvent('no-events-session')
      expect(last).toBeUndefined()
    })
  })

  describe('agents', () => {
    afterEach(() => {
      db.db.exec('DELETE FROM session_events')
      db.db.exec('DELETE FROM sessions')
      db.db.exec('DELETE FROM agents')
    })

    it('should create and get agent with env JSON parsing', () => {
      const agent = db.createAgent({
        id: 'agent-1',
        name: 'claude-agent',
        command: 'claude',
        cwd: '/home/claude/project',
        description: 'A Claude agent',
        env: { ANTHROPIC_API_KEY: 'sk-test', NODE_ENV: 'production' },
      })
      expect(agent.id).toBe('agent-1')
      expect(agent.name).toBe('claude-agent')
      expect(agent.command).toBe('claude')
      expect(agent.cwd).toBe('/home/claude/project')
      expect(agent.description).toBe('A Claude agent')
      expect(agent.env).toEqual({ ANTHROPIC_API_KEY: 'sk-test', NODE_ENV: 'production' })
      expect(agent.created_at).toBeDefined()
      expect(agent.updated_at).toBeDefined()
    })

    it('should create agent without optional fields', () => {
      const agent = db.createAgent({
        id: 'agent-min',
        name: 'minimal-agent',
        command: 'bash',
      })
      expect(agent.id).toBe('agent-min')
      expect(agent.cwd).toBeNull()
      expect(agent.description).toBeNull()
      expect(agent.env).toBeNull()
    })

    it('should list agents', () => {
      db.createAgent({ id: 'agent-a', name: 'agent-a', command: 'claude' })
      db.createAgent({ id: 'agent-b', name: 'agent-b', command: 'bash' })
      const agents = db.listAgents()
      expect(agents.length).toBeGreaterThanOrEqual(2)
      expect(agents.some(a => a.id === 'agent-a')).toBe(true)
      expect(agents.some(a => a.id === 'agent-b')).toBe(true)
    })

    it('should update agent fields', () => {
      db.createAgent({ id: 'agent-upd', name: 'upd-agent', command: 'claude' })
      const updated = db.updateAgent('agent-upd', {
        name: 'updated-agent',
        description: 'now with description',
        env: { FOO: 'bar' },
      })
      expect(updated.name).toBe('updated-agent')
      expect(updated.description).toBe('now with description')
      expect(updated.env).toEqual({ FOO: 'bar' })
    })

    it('should delete agent', () => {
      db.createAgent({ id: 'agent-del', name: 'del-agent', command: 'claude' })
      db.deleteAgent('agent-del')
      const agent = db.getAgent('agent-del')
      expect(agent).toBeUndefined()
    })

    it('should count active sessions by agent', () => {
      db.createAgent({ id: 'agent-cnt', name: 'cnt-agent', command: 'claude' })
      db.createSession({ id: 'sess-a1', name: 'sess-a1', command: 'claude', status: 'running', agent_id: 'agent-cnt' })
      db.createSession({ id: 'sess-a2', name: 'sess-a2', command: 'claude', status: 'idle', agent_id: 'agent-cnt' })
      db.createSession({ id: 'sess-a3', name: 'sess-a3', command: 'claude', status: 'stopped', agent_id: 'agent-cnt' })
      const count = db.countActiveSessionsByAgent('agent-cnt')
      expect(count).toBe(2)
    })

    it('should list sessions by agent', () => {
      db.createAgent({ id: 'agent-lst', name: 'lst-agent', command: 'claude' })
      db.createSession({ id: 'sess-b1', name: 'sess-b1', command: 'claude', agent_id: 'agent-lst' })
      db.createSession({ id: 'sess-b2', name: 'sess-b2', command: 'claude', agent_id: 'agent-lst' })
      db.createSession({ id: 'sess-b3', name: 'sess-b3', command: 'claude' })
      const sessions = db.listSessionsByAgent('agent-lst')
      expect(sessions).toHaveLength(2)
      expect(sessions.every(s => s.agent_id === 'agent-lst')).toBe(true)
    })
  })
})
