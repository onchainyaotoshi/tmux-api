const SESSION_PREFIX = 'session-'

export class SessionService {
  constructor(terminal) {
    this.terminal = terminal
  }

  #tmuxName(name) {
    return `${SESSION_PREFIX}${name}`
  }

  async spawn(name, command, cwd) {
    const tmuxName = this.#tmuxName(name)
    if (await this.terminal.hasSession(tmuxName)) {
      throw new Error(`Session already exists: ${name}`)
    }
    await this.terminal.createSession(tmuxName, cwd || undefined)
    await this.terminal.sendKeys(tmuxName, '0', '0', command)
    await this.terminal.sendKeys(tmuxName, '0', '0', 'Enter')
    return { name, alive: true }
  }

  async sendTask(name, input) {
    const tmuxName = this.#tmuxName(name)
    if (!(await this.terminal.hasSession(tmuxName))) {
      throw new Error(`Session not found: ${name}`)
    }
    await this.terminal.sendKeys(tmuxName, '0', '0', input)
    await this.terminal.sendKeys(tmuxName, '0', '0', 'Enter')
  }

  async getOutput(name) {
    const tmuxName = this.#tmuxName(name)
    try {
      return await this.terminal.capturePane(tmuxName, '0', '0')
    } catch {
      return ''
    }
  }

  async kill(name) {
    const tmuxName = this.#tmuxName(name)
    if (!(await this.terminal.hasSession(tmuxName))) {
      throw new Error(`Session not found: ${name}`)
    }
    await this.terminal.killSession(tmuxName)
  }

  async list() {
    const allSessions = await this.terminal.listSessions()
    return allSessions
      .filter(s => s.name.startsWith(SESSION_PREFIX))
      .map(s => ({
        name: s.name.slice(SESSION_PREFIX.length),
        tmux_session: s.name,
        alive: true,
      }))
  }

  async health(name) {
    const tmuxName = this.#tmuxName(name)
    const alive = await this.terminal.hasSession(tmuxName)
    return { name, tmux_session: tmuxName, alive }
  }
}
