import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TerminalService } from '../../src/server/services/terminal.js'

const terminal = new TerminalService()
const TEST_SESSION = 'test-api-session'

// Clean up any leftover test sessions
async function cleanup() {
  try { await terminal.killSession(TEST_SESSION) } catch {}
  try { await terminal.killSession('test-renamed') } catch {}
  try { await terminal.killSession('cwd-test') } catch {}
  try { await terminal.killSession('cwd-bad') } catch {}
  try { await terminal.killSession('cwd-none') } catch {}
  try { await terminal.killSession('env-test') } catch {}
}

describe('TerminalService', () => {
  beforeEach(cleanup)
  afterEach(cleanup)

  describe('sessions', () => {
    it('should list sessions', async () => {
      const sessions = await terminal.listSessions()
      expect(Array.isArray(sessions)).toBe(true)
    })

    it('should create and list a session', async () => {
      await terminal.createSession(TEST_SESSION)
      const sessions = await terminal.listSessions()
      const found = sessions.find(s => s.name === TEST_SESSION)
      expect(found).toBeDefined()
      expect(found.name).toBe(TEST_SESSION)
      expect(typeof found.windows).toBe('number')
    })

    it('should kill a session', async () => {
      await terminal.createSession(TEST_SESSION)
      await terminal.killSession(TEST_SESSION)
      const sessions = await terminal.listSessions()
      expect(sessions.find(s => s.name === TEST_SESSION)).toBeUndefined()
    })

    it('should rename a session', async () => {
      await terminal.createSession(TEST_SESSION)
      await terminal.renameSession(TEST_SESSION, 'test-renamed')
      const sessions = await terminal.listSessions()
      expect(sessions.find(s => s.name === 'test-renamed')).toBeDefined()
    })

    it('should throw on duplicate session name', async () => {
      await terminal.createSession(TEST_SESSION)
      await expect(terminal.createSession(TEST_SESSION)).rejects.toThrow()
    })
  })

  describe('windows', () => {
    beforeEach(async () => {
      await terminal.createSession(TEST_SESSION)
    })

    it('should list windows in a session', async () => {
      const windows = await terminal.listWindows(TEST_SESSION)
      expect(windows.length).toBeGreaterThanOrEqual(1)
      expect(windows[0]).toHaveProperty('index')
      expect(windows[0]).toHaveProperty('name')
    })

    it('should create a new window', async () => {
      await terminal.createWindow(TEST_SESSION, 'mywin')
      const windows = await terminal.listWindows(TEST_SESSION)
      expect(windows.find(w => w.name === 'mywin')).toBeDefined()
    })

    it('should kill a window', async () => {
      await terminal.createWindow(TEST_SESSION, 'tokill')
      const windows = await terminal.listWindows(TEST_SESSION)
      const target = windows.find(w => w.name === 'tokill')
      await terminal.killWindow(TEST_SESSION, target.index)
      const after = await terminal.listWindows(TEST_SESSION)
      expect(after.find(w => w.name === 'tokill')).toBeUndefined()
    })

    it('should rename a window', async () => {
      const windows = await terminal.listWindows(TEST_SESSION)
      await terminal.renameWindow(TEST_SESSION, windows[0].index, 'renamed-win')
      const after = await terminal.listWindows(TEST_SESSION)
      expect(after.find(w => w.name === 'renamed-win')).toBeDefined()
    })
  })

  describe('panes', () => {
    beforeEach(async () => {
      await terminal.createSession(TEST_SESSION)
    })

    it('should list panes', async () => {
      const panes = await terminal.listPanes(TEST_SESSION, 0)
      expect(panes.length).toBe(1)
      expect(panes[0]).toHaveProperty('index')
    })

    it('should split pane horizontally', async () => {
      await terminal.splitPane(TEST_SESSION, 0, 'h')
      const panes = await terminal.listPanes(TEST_SESSION, 0)
      expect(panes.length).toBe(2)
    })

    it('should split pane vertically', async () => {
      await terminal.splitPane(TEST_SESSION, 0, 'v')
      const panes = await terminal.listPanes(TEST_SESSION, 0)
      expect(panes.length).toBe(2)
    })

    it('should kill a pane', async () => {
      await terminal.splitPane(TEST_SESSION, 0, 'h')
      await terminal.killPane(TEST_SESSION, 0, 1)
      const panes = await terminal.listPanes(TEST_SESSION, 0)
      expect(panes.length).toBe(1)
    })

    it('should resize a pane', async () => {
      await terminal.splitPane(TEST_SESSION, 0, 'h')
      // Should not throw
      await terminal.resizePane(TEST_SESSION, 0, 0, 'R', 5)
    })
  })

  describe('control', () => {
    beforeEach(async () => {
      await terminal.createSession(TEST_SESSION)
    })

    it('should send keys to a pane', async () => {
      await terminal.sendKeys(TEST_SESSION, 0, 0, 'echo hello')
      // Should not throw
    })

    it('should capture pane output', async () => {
      const content = await terminal.capturePane(TEST_SESSION, 0, 0)
      expect(typeof content).toBe('string')
    })
  })

  describe('hasSession', () => {
    it('should return true for existing session', async () => {
      await terminal.createSession('has-session-test')
      const result = await terminal.hasSession('has-session-test')
      expect(result).toBe(true)
      await terminal.killSession('has-session-test')
    })

    it('should return false for non-existing session', async () => {
      const result = await terminal.hasSession('nonexistent-session-xyz')
      expect(result).toBe(false)
    })
  })

  describe('setEnvironment', () => {
    it('should set environment variable', async () => {
      // Create a session first
      await terminal.createSession('env-test')
      await terminal.setEnvironment('env-test', 'MY_VAR', 'hello')
      // tmux set-environment sets the session env (used by new panes/windows),
      // so verify via tmux show-environment by using send-keys
      await terminal.sendKeys('env-test', '0', '0', 'tmux show-environment -t env-test MY_VAR')
      await terminal.sendKeys('env-test', '0', '0', 'Enter')
      await new Promise(r => setTimeout(r, 500))
      const output = await terminal.capturePane('env-test', '0', '0')
      expect(output).toContain('MY_VAR=hello')
      await terminal.killSession('env-test')
    })
  })

  describe('createSession with cwd', () => {
    it('should create session in specified directory', async () => {
      await terminal.createSession('cwd-test', '/tmp')
      // Run pwd to verify working directory
      await terminal.sendKeys('cwd-test', '0', '0', 'pwd')
      await terminal.sendKeys('cwd-test', '0', '0', 'Enter')
      await new Promise(r => setTimeout(r, 500))
      const out = await terminal.capturePane('cwd-test', '0', '0')
      expect(out).toContain('/tmp')
      await terminal.killSession('cwd-test')
    })

    it('should throw for non-existent cwd', async () => {
      await expect(terminal.createSession('cwd-bad', '/nonexistent/path/xyz'))
        .rejects.toThrow()
    })

    it('should work without cwd (backward compatible)', async () => {
      await terminal.createSession('cwd-none')
      const exists = await terminal.hasSession('cwd-none')
      expect(exists).toBe(true)
      await terminal.killSession('cwd-none')
    })
  })
})
