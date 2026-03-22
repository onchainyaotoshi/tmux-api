import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { access } from 'node:fs/promises'

const execFileAsync = promisify(execFile)

const ALLOWED_SUBCOMMANDS = [
  'list-sessions', 'new-session', 'kill-session', 'rename-session',
  'list-windows', 'new-window', 'kill-window', 'rename-window',
  'list-panes', 'split-window', 'kill-pane', 'resize-pane',
  'send-keys', 'capture-pane', 'has-session',
]

export class TmuxService {
  async execute(subcommand, args = []) {
    if (!ALLOWED_SUBCOMMANDS.includes(subcommand)) {
      throw new Error(`Disallowed tmux subcommand: ${subcommand}`)
    }
    try {
      const { stdout } = await execFileAsync('tmux', [subcommand, ...args])
      return stdout
    } catch (err) {
      const message = (err.stderr || err.message || 'Unknown tmux error').trim()
      throw new Error(message)
    }
  }

  // Sessions
  async listSessions() {
    try {
      const out = await this.execute('list-sessions', [
        '-F', '#{session_name}|#{session_windows}|#{session_created}'
      ])
      return out.trim().split('\n').filter(Boolean).map(line => {
        const [name, windows, created] = line.split('|')
        return { name, windows: parseInt(windows, 10), created: parseInt(created, 10) }
      })
    } catch (err) {
      if (err.message.includes('no server running') || err.message.includes('no sessions')) {
        return []
      }
      throw err
    }
  }

  async createSession(name, cwd) {
    const args = ['-d', '-s', name]
    if (cwd) {
      try {
        await access(cwd)
      } catch {
        throw new Error(`cwd does not exist: ${cwd}`)
      }
      args.push('-c', cwd)
    }
    await this.execute('new-session', args)
    return { name }
  }

  async killSession(name) {
    await this.execute('kill-session', ['-t', name])
  }

  async renameSession(name, newName) {
    await this.execute('rename-session', ['-t', name, newName])
  }

  async hasSession(name) {
    try {
      await this.execute('has-session', ['-t', name])
      return true
    } catch {
      return false
    }
  }

  // Windows
  async listWindows(session) {
    const out = await this.execute('list-windows', [
      '-t', session,
      '-F', '#{window_index}|#{window_name}|#{window_panes}|#{window_active}'
    ])
    return out.trim().split('\n').filter(Boolean).map(line => {
      const [index, name, panes, active] = line.split('|')
      return { index: parseInt(index, 10), name, panes: parseInt(panes, 10), active: active === '1' }
    })
  }

  async createWindow(session, name) {
    const args = ['-t', session]
    if (name) args.push('-n', name)
    await this.execute('new-window', args)
  }

  async killWindow(session, index) {
    await this.execute('kill-window', ['-t', `${session}:${index}`])
  }

  async renameWindow(session, index, newName) {
    await this.execute('rename-window', ['-t', `${session}:${index}`, newName])
  }

  // Panes
  async listPanes(session, window) {
    const out = await this.execute('list-panes', [
      '-t', `${session}:${window}`,
      '-F', '#{pane_index}|#{pane_width}|#{pane_height}|#{pane_active}'
    ])
    return out.trim().split('\n').filter(Boolean).map(line => {
      const [index, width, height, active] = line.split('|')
      return {
        index: parseInt(index, 10),
        width: parseInt(width, 10),
        height: parseInt(height, 10),
        active: active === '1'
      }
    })
  }

  async splitPane(session, window, direction) {
    const flag = direction === 'h' ? '-h' : '-v'
    await this.execute('split-window', [flag, '-t', `${session}:${window}`])
  }

  async killPane(session, window, index) {
    await this.execute('kill-pane', ['-t', `${session}:${window}.${index}`])
  }

  async resizePane(session, window, index, direction, amount) {
    const dirFlag = { U: '-U', D: '-D', L: '-L', R: '-R' }[direction]
    if (!dirFlag) throw new Error(`Invalid direction: ${direction}`)
    await this.execute('resize-pane', [
      '-t', `${session}:${window}.${index}`, dirFlag, String(amount)
    ])
  }

  // Control
  async sendKeys(session, window, pane, keys) {
    await this.execute('send-keys', ['-t', `${session}:${window}.${pane}`, keys])
  }

  async capturePane(session, window, pane) {
    const out = await this.execute('capture-pane', [
      '-t', `${session}:${window}.${pane}`, '-p'
    ])
    return out
  }
}
