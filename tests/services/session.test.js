import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { SessionService } from '../../src/server/services/session.js'
import { TerminalService } from '../../src/server/services/terminal.js'

const SESSION_PREFIX = 'session-'
let sessionService, tmux

beforeAll(() => {
  tmux = new TerminalService()
  sessionService = new SessionService(tmux)
})

afterEach(async () => {
  const sessions = await sessionService.list()
  for (const s of sessions) {
    try { await sessionService.kill(s.name) } catch {}
  }
})

describe('SessionService', () => {
  describe('spawn', () => {
    it('should create a tmux session and return session info', async () => {
      const session = await sessionService.spawn('test-ss1', 'bash')
      expect(session.name).toBe('test-ss1')
      expect(session.alive).toBe(true)
      const alive = await tmux.hasSession(`${SESSION_PREFIX}test-ss1`)
      expect(alive).toBe(true)
    })

    it('should spawn with cwd', async () => {
      const session = await sessionService.spawn('cwd-ss1', 'bash', '/tmp')
      expect(session.name).toBe('cwd-ss1')
      expect(session.alive).toBe(true)
    })

    it('should reject duplicate session names', async () => {
      await sessionService.spawn('dup-ss1', 'bash')
      await expect(sessionService.spawn('dup-ss1', 'bash'))
        .rejects.toThrow(/already exists/)
    })
  })

  describe('sendTask', () => {
    it('should send input to session', async () => {
      await sessionService.spawn('task-ss1', 'bash')
      await sessionService.sendTask('task-ss1', 'echo hello')
    })

    it('should throw for nonexistent session', async () => {
      await expect(sessionService.sendTask('nonexistent', 'echo hi'))
        .rejects.toThrow()
    })
  })

  describe('getOutput', () => {
    it('should capture pane output', async () => {
      await sessionService.spawn('out-ss1', 'bash')
      await tmux.sendKeys(`${SESSION_PREFIX}out-ss1`, '0', '0', 'echo tmuxapi-test')
      await tmux.sendKeys(`${SESSION_PREFIX}out-ss1`, '0', '0', 'Enter')
      await new Promise(r => setTimeout(r, 500))
      const output = await sessionService.getOutput('out-ss1')
      expect(output).toContain('tmuxapi-test')
    })
  })

  describe('kill', () => {
    it('should kill tmux session', async () => {
      await sessionService.spawn('kill-ss1', 'bash')
      await sessionService.kill('kill-ss1')
      const alive = await tmux.hasSession(`${SESSION_PREFIX}kill-ss1`)
      expect(alive).toBe(false)
    })

    it('should throw for nonexistent session', async () => {
      await expect(sessionService.kill('nonexistent'))
        .rejects.toThrow()
    })
  })

  describe('list', () => {
    it('should list managed sessions from tmux', async () => {
      await sessionService.spawn('list-ss1', 'bash')
      await sessionService.spawn('list-ss2', 'bash')
      const sessions = await sessionService.list()
      const names = sessions.map(s => s.name)
      expect(names).toContain('list-ss1')
      expect(names).toContain('list-ss2')
    })

    it('should not list non-managed tmux sessions', async () => {
      await tmux.createSession('unmanaged-test')
      await sessionService.spawn('managed-ss1', 'bash')
      const sessions = await sessionService.list()
      const names = sessions.map(s => s.name)
      expect(names).toContain('managed-ss1')
      expect(names).not.toContain('unmanaged-test')
      await tmux.killSession('unmanaged-test')
    })
  })

  describe('health', () => {
    it('should return alive=true for running session', async () => {
      await sessionService.spawn('health-ss1', 'bash')
      const health = await sessionService.health('health-ss1')
      expect(health.alive).toBe(true)
    })

    it('should return alive=false for dead session', async () => {
      await sessionService.spawn('health-ss2', 'bash')
      await tmux.killSession(`${SESSION_PREFIX}health-ss2`)
      const health = await sessionService.health('health-ss2')
      expect(health.alive).toBe(false)
    })
  })
})
