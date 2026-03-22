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
  // Only clean up sessions created by this test file (svc-* prefix)
  const sessions = await sessionService.list()
  for (const s of sessions) {
    if (s.name.startsWith('svc-')) {
      try { await sessionService.kill(s.name) } catch {}
    }
  }
})

describe('SessionService', () => {
  describe('spawn', () => {
    it('should create a tmux session and return session info', async () => {
      const session = await sessionService.spawn('svc-test1', 'bash')
      expect(session.name).toBe('svc-test1')
      expect(session.alive).toBe(true)
      const alive = await tmux.hasSession(`${SESSION_PREFIX}svc-test1`)
      expect(alive).toBe(true)
    })

    it('should spawn with cwd', async () => {
      const session = await sessionService.spawn('svc-cwd1', 'bash', '/tmp')
      expect(session.name).toBe('svc-cwd1')
      expect(session.alive).toBe(true)
    })

    it('should reject duplicate session names', async () => {
      await sessionService.spawn('svc-dup1', 'bash')
      await expect(sessionService.spawn('svc-dup1', 'bash'))
        .rejects.toThrow(/already exists/)
    })
  })

  describe('sendTask', () => {
    it('should send input to session', async () => {
      await sessionService.spawn('svc-task1', 'bash')
      await sessionService.sendTask('svc-task1', 'echo hello')
    })

    it('should throw for nonexistent session', async () => {
      await expect(sessionService.sendTask('nonexistent', 'echo hi'))
        .rejects.toThrow()
    })
  })

  describe('getOutput', () => {
    it('should capture pane output', async () => {
      await sessionService.spawn('svc-out1', 'bash')
      await tmux.sendKeys(`${SESSION_PREFIX}svc-out1`, '0', '0', 'echo tmuxapi-test')
      await tmux.sendKeys(`${SESSION_PREFIX}svc-out1`, '0', '0', 'Enter')
      await new Promise(r => setTimeout(r, 500))
      const output = await sessionService.getOutput('svc-out1')
      expect(output).toContain('tmuxapi-test')
    })
  })

  describe('kill', () => {
    it('should kill tmux session', async () => {
      await sessionService.spawn('svc-kill1', 'bash')
      await sessionService.kill('svc-kill1')
      const alive = await tmux.hasSession(`${SESSION_PREFIX}svc-kill1`)
      expect(alive).toBe(false)
    })

    it('should throw for nonexistent session', async () => {
      await expect(sessionService.kill('nonexistent'))
        .rejects.toThrow()
    })
  })

  describe('list', () => {
    it('should list managed sessions from tmux', async () => {
      await sessionService.spawn('svc-list1', 'bash')
      await sessionService.spawn('svc-list2', 'bash')
      const sessions = await sessionService.list()
      const names = sessions.map(s => s.name)
      expect(names).toContain('svc-list1')
      expect(names).toContain('svc-list2')
    })

    it('should not list non-managed tmux sessions', async () => {
      await tmux.createSession('unmanaged-test')
      await sessionService.spawn('svc-managed1', 'bash')
      const sessions = await sessionService.list()
      const names = sessions.map(s => s.name)
      expect(names).toContain('svc-managed1')
      expect(names).not.toContain('unmanaged-test')
      await tmux.killSession('unmanaged-test')
    })
  })

  describe('health', () => {
    it('should return alive=true for running session', async () => {
      await sessionService.spawn('svc-health1', 'bash')
      const health = await sessionService.health('svc-health1')
      expect(health.alive).toBe(true)
    })

    it('should return alive=false for dead session', async () => {
      await sessionService.spawn('svc-health2', 'bash')
      await tmux.killSession(`${SESSION_PREFIX}svc-health2`)
      const health = await sessionService.health('svc-health2')
      expect(health.alive).toBe(false)
    })
  })
})
