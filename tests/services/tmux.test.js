import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TmuxService } from '../../src/server/services/tmux.js'

const tmux = new TmuxService()
const TEST_SESSION = 'test-api-session'

// Clean up any leftover test sessions
async function cleanup() {
  try { await tmux.killSession(TEST_SESSION) } catch {}
  try { await tmux.killSession('test-renamed') } catch {}
  try { await tmux.killSession('cwd-test') } catch {}
  try { await tmux.killSession('cwd-bad') } catch {}
  try { await tmux.killSession('cwd-none') } catch {}
}

describe('TmuxService', () => {
  beforeEach(cleanup)
  afterEach(cleanup)

  describe('sessions', () => {
    it('should list sessions', async () => {
      const sessions = await tmux.listSessions()
      expect(Array.isArray(sessions)).toBe(true)
    })

    it('should create and list a session', async () => {
      await tmux.createSession(TEST_SESSION)
      const sessions = await tmux.listSessions()
      const found = sessions.find(s => s.name === TEST_SESSION)
      expect(found).toBeDefined()
      expect(found.name).toBe(TEST_SESSION)
      expect(typeof found.windows).toBe('number')
    })

    it('should kill a session', async () => {
      await tmux.createSession(TEST_SESSION)
      await tmux.killSession(TEST_SESSION)
      const sessions = await tmux.listSessions()
      expect(sessions.find(s => s.name === TEST_SESSION)).toBeUndefined()
    })

    it('should rename a session', async () => {
      await tmux.createSession(TEST_SESSION)
      await tmux.renameSession(TEST_SESSION, 'test-renamed')
      const sessions = await tmux.listSessions()
      expect(sessions.find(s => s.name === 'test-renamed')).toBeDefined()
    })

    it('should throw on duplicate session name', async () => {
      await tmux.createSession(TEST_SESSION)
      await expect(tmux.createSession(TEST_SESSION)).rejects.toThrow()
    })
  })

  describe('windows', () => {
    beforeEach(async () => {
      await tmux.createSession(TEST_SESSION)
    })

    it('should list windows in a session', async () => {
      const windows = await tmux.listWindows(TEST_SESSION)
      expect(windows.length).toBeGreaterThanOrEqual(1)
      expect(windows[0]).toHaveProperty('index')
      expect(windows[0]).toHaveProperty('name')
    })

    it('should create a new window', async () => {
      await tmux.createWindow(TEST_SESSION, 'mywin')
      const windows = await tmux.listWindows(TEST_SESSION)
      expect(windows.find(w => w.name === 'mywin')).toBeDefined()
    })

    it('should kill a window', async () => {
      await tmux.createWindow(TEST_SESSION, 'tokill')
      const windows = await tmux.listWindows(TEST_SESSION)
      const target = windows.find(w => w.name === 'tokill')
      await tmux.killWindow(TEST_SESSION, target.index)
      const after = await tmux.listWindows(TEST_SESSION)
      expect(after.find(w => w.name === 'tokill')).toBeUndefined()
    })

    it('should rename a window', async () => {
      const windows = await tmux.listWindows(TEST_SESSION)
      await tmux.renameWindow(TEST_SESSION, windows[0].index, 'renamed-win')
      const after = await tmux.listWindows(TEST_SESSION)
      expect(after.find(w => w.name === 'renamed-win')).toBeDefined()
    })
  })

  describe('panes', () => {
    beforeEach(async () => {
      await tmux.createSession(TEST_SESSION)
    })

    it('should list panes', async () => {
      const panes = await tmux.listPanes(TEST_SESSION, 0)
      expect(panes.length).toBe(1)
      expect(panes[0]).toHaveProperty('index')
    })

    it('should split pane horizontally', async () => {
      await tmux.splitPane(TEST_SESSION, 0, 'h')
      const panes = await tmux.listPanes(TEST_SESSION, 0)
      expect(panes.length).toBe(2)
    })

    it('should split pane vertically', async () => {
      await tmux.splitPane(TEST_SESSION, 0, 'v')
      const panes = await tmux.listPanes(TEST_SESSION, 0)
      expect(panes.length).toBe(2)
    })

    it('should kill a pane', async () => {
      await tmux.splitPane(TEST_SESSION, 0, 'h')
      await tmux.killPane(TEST_SESSION, 0, 1)
      const panes = await tmux.listPanes(TEST_SESSION, 0)
      expect(panes.length).toBe(1)
    })

    it('should resize a pane', async () => {
      await tmux.splitPane(TEST_SESSION, 0, 'h')
      // Should not throw
      await tmux.resizePane(TEST_SESSION, 0, 0, 'R', 5)
    })
  })

  describe('control', () => {
    beforeEach(async () => {
      await tmux.createSession(TEST_SESSION)
    })

    it('should send keys to a pane', async () => {
      await tmux.sendKeys(TEST_SESSION, 0, 0, 'echo hello')
      // Should not throw
    })

    it('should capture pane output', async () => {
      const content = await tmux.capturePane(TEST_SESSION, 0, 0)
      expect(typeof content).toBe('string')
    })
  })

  describe('hasSession', () => {
    it('should return true for existing session', async () => {
      await tmux.createSession('has-session-test')
      const result = await tmux.hasSession('has-session-test')
      expect(result).toBe(true)
      await tmux.killSession('has-session-test')
    })

    it('should return false for non-existing session', async () => {
      const result = await tmux.hasSession('nonexistent-session-xyz')
      expect(result).toBe(false)
    })
  })

  describe('createSession with cwd', () => {
    it('should create session in specified directory', async () => {
      await tmux.createSession('cwd-test', '/tmp')
      // Run pwd to verify working directory
      await tmux.sendKeys('cwd-test', '0', '0', 'pwd')
      await tmux.sendKeys('cwd-test', '0', '0', 'Enter')
      await new Promise(r => setTimeout(r, 500))
      const out = await tmux.capturePane('cwd-test', '0', '0')
      expect(out).toContain('/tmp')
      await tmux.killSession('cwd-test')
    })

    it('should throw for non-existent cwd', async () => {
      await expect(tmux.createSession('cwd-bad', '/nonexistent/path/xyz'))
        .rejects.toThrow()
    })

    it('should work without cwd (backward compatible)', async () => {
      await tmux.createSession('cwd-none')
      const exists = await tmux.hasSession('cwd-none')
      expect(exists).toBe(true)
      await tmux.killSession('cwd-none')
    })
  })
})
