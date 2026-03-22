import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { SessionService } from '../../src/server/services/session.js'
import { TerminalService } from '../../src/server/services/terminal.js'
import { DatabaseService } from '../../src/server/services/database.js'
import { existsSync, unlinkSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const TEST_DB = join(process.cwd(), 'data', 'test-session.db')
const SESSION_PREFIX = 'session-'

let sessionService, tmux, db

beforeAll(() => {
  mkdirSync(join(process.cwd(), 'data'), { recursive: true })
  tmux = new TerminalService()
  db = new DatabaseService(TEST_DB)
  db.init()
  sessionService = new SessionService(tmux, db)
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

describe('spawn with cwd', () => {
  it('should create session with cwd', async () => {
    const session = await sessionService.spawn('cwd-w1', 'bash', '/tmp')
    expect(session.cwd).toBe('/tmp')
    expect(session.event_token).toBeDefined()
    expect(session.event_token.length).toBe(36) // UUID
  })

  it('should work without cwd', async () => {
    const session = await sessionService.spawn('no-cwd-w1', 'bash')
    expect(session.cwd).toBeNull()
    expect(session.event_token).toBeDefined()
  })
})

describe('processEvent', () => {
  it('should store event and update status to waiting_input', async () => {
    const session = await sessionService.spawn('evt-w1', 'bash')
    const event = await sessionService.processEvent(session.id, 'notification', { message: 'confirm?' })
    expect(event.type).toBe('notification')
    const updated = db.getSession(session.id)
    expect(updated.status).toBe('waiting_input')
  })

  it('should update status to idle on stop event', async () => {
    const session = await sessionService.spawn('evt-w2', 'bash')
    await sessionService.processEvent(session.id, 'tool_use', {})
    expect(db.getSession(session.id).status).toBe('running')
    await sessionService.processEvent(session.id, 'stop', {})
    expect(db.getSession(session.id).status).toBe('idle')
  })

  it('should update status to error on stop_failure', async () => {
    const session = await sessionService.spawn('evt-w3', 'bash')
    await sessionService.processEvent(session.id, 'stop_failure', { error: 'rate_limit' })
    expect(db.getSession(session.id).status).toBe('error')
  })

  it('should not change status for unknown event type', async () => {
    const session = await sessionService.spawn('evt-w4', 'bash')
    await sessionService.processEvent(session.id, 'custom_event', {})
    expect(db.getSession(session.id).status).toBe('idle')
  })

  it('should throw for unknown session', async () => {
    await expect(sessionService.processEvent('nonexistent', 'stop', {}))
      .rejects.toThrow()
  })

  it('should validate event_token', async () => {
    const session = await sessionService.spawn('evt-w5', 'bash')
    await expect(sessionService.processEvent(session.id, 'stop', {}, 'wrong-token'))
      .rejects.toThrow(/Invalid event token/)
  })

  it('should accept valid event_token', async () => {
    const session = await sessionService.spawn('evt-w6', 'bash')
    const event = await sessionService.processEvent(session.id, 'stop', {}, session.event_token)
    expect(event.type).toBe('stop')
  })
})

describe('getEvents', () => {
  it('should return event history', async () => {
    const session = await sessionService.spawn('hist-w1', 'bash')
    await sessionService.processEvent(session.id, 'tool_use', {})
    await sessionService.processEvent(session.id, 'stop', {})
    const events = sessionService.getEvents(session.id)
    expect(events.length).toBe(2)
    expect(events[0].type).toBe('stop') // newest first
  })
})

describe('SessionService', () => {
  describe('spawn', () => {
    it('should create a tmux session and database record', async () => {
      const session = await sessionService.spawn('test-w1', 'echo hello')
      expect(session.name).toBe('test-w1')
      expect(session.command).toBe('echo hello')
      expect(session.status).toBe('idle')
      expect(session.id).toBeDefined()

      const alive = await tmux.hasSession(`${SESSION_PREFIX}test-w1`)
      expect(alive).toBe(true)
    })

    it('should spawn with env vars and agentId', async () => {
      const agent = db.createAgent({ id: 'test-agent-id', name: 'test-agent', command: 'bash' })
      const session = await sessionService.spawn('env-test', 'echo done', null, {
        env: { MY_VAR: 'hello' },
        agentId: agent.id,
      })
      expect(session.name).toBe('env-test')
      expect(session.agent_id).toBe('test-agent-id')
    })

    it('should reject duplicate session names', async () => {
      await sessionService.spawn('dup-worker', 'echo hi')
      await expect(sessionService.spawn('dup-worker', 'echo hi'))
        .rejects.toThrow()
    })
  })

  describe('sendTask', () => {
    it('should send input to session and update status to running', async () => {
      const session = await sessionService.spawn('task-w1', 'bash')
      const updated = await sessionService.sendTask(session.id, 'echo task-running')
      expect(updated.status).toBe('running')
      expect(updated.current_task).toBe('echo task-running')
    })

    it('should reject task to stopped session', async () => {
      const session = await sessionService.spawn('stopped-w1', 'bash')
      await sessionService.kill(session.id)
      await expect(sessionService.sendTask(session.id, 'echo nope'))
        .rejects.toThrow(/stopped/)
    })
  })

  describe('getOutput', () => {
    it('should capture pane output', async () => {
      const session = await sessionService.spawn('output-w1', 'bash')
      await tmux.sendKeys(`${SESSION_PREFIX}output-w1`, '0', '0', 'echo foreman-test-output')
      await tmux.sendKeys(`${SESSION_PREFIX}output-w1`, '0', '0', 'Enter')
      await new Promise(r => setTimeout(r, 500))
      const output = await sessionService.getOutput(session.id)
      expect(output).toContain('foreman-test-output')
    })
  })

  describe('kill', () => {
    it('should kill tmux session and update status', async () => {
      const session = await sessionService.spawn('kill-w1', 'bash')
      const killed = await sessionService.kill(session.id)
      expect(killed.status).toBe('stopped')

      const alive = await tmux.hasSession(`${SESSION_PREFIX}kill-w1`)
      expect(alive).toBe(false)
    })

    it('should throw for unknown session', async () => {
      await expect(sessionService.kill('nonexistent-id'))
        .rejects.toThrow()
    })
  })

  describe('checkHealth', () => {
    it('should return alive=true for running session', async () => {
      const session = await sessionService.spawn('health-w1', 'bash')
      const health = await sessionService.checkHealth(session.id)
      expect(health.alive).toBe(true)
      expect(health.status).toBe('idle')
    })

    it('should detect dead session and update status to failed', async () => {
      const session = await sessionService.spawn('health-w2', 'bash')
      await tmux.killSession(`${SESSION_PREFIX}health-w2`)
      const health = await sessionService.checkHealth(session.id)
      expect(health.alive).toBe(false)
      expect(health.status).toBe('failed')
    })
  })

  describe('list', () => {
    it('should list all sessions', async () => {
      await sessionService.spawn('list-w1', 'bash')
      await sessionService.spawn('list-w2', 'bash')
      const sessions = sessionService.list()
      expect(sessions.length).toBe(2)
    })

    it('should filter by status', async () => {
      await sessionService.spawn('filter-w1', 'bash')
      const s2 = await sessionService.spawn('filter-w2', 'bash')
      await sessionService.kill(s2.id)
      const idle = sessionService.list('idle')
      expect(idle.length).toBe(1)
      expect(idle[0].name).toBe('filter-w1')
    })
  })

  describe('get', () => {
    it('should return session with output', async () => {
      const session = await sessionService.spawn('get-w1', 'bash')
      const detail = await sessionService.get(session.id)
      expect(detail.id).toBe(session.id)
      expect(detail.output).toBeDefined()
    })

    it('should throw for unknown session', async () => {
      await expect(sessionService.get('nonexistent'))
        .rejects.toThrow()
    })
  })
})
