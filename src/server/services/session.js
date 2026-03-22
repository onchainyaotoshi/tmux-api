import { randomUUID } from 'node:crypto'

const SESSION_PREFIX = 'session-'

const EVENT_STATE_MAP = {
  notification: 'waiting_input',
  stop: 'idle',
  stop_failure: 'error',
  tool_use: 'running',
}

export class SessionService {
  constructor(terminal, db) {
    this.terminal = terminal
    this.db = db
  }

  async spawn(name, command, cwd) {
    const id = randomUUID()
    const eventToken = randomUUID()
    const sessionName = `${SESSION_PREFIX}${name}`

    await this.terminal.createSession(sessionName, cwd || undefined)
    await this.terminal.sendKeys(sessionName, '0', '0', command)
    await this.terminal.sendKeys(sessionName, '0', '0', 'Enter')

    try {
      return this.db.createSession({
        id, name, command, status: 'idle',
        cwd: cwd || null,
        event_token: eventToken,
      })
    } catch (err) {
      try { await this.terminal.killSession(sessionName) } catch {}
      throw err
    }
  }

  // Token validation is optional at service level — route enforces it.
  // When token is undefined, check is skipped (allows internal calls without token).
  async processEvent(id, type, data, token) {
    const session = this.db.getSession(id)
    if (!session) throw new Error(`Session not found: ${id}`)

    if (token !== undefined && token !== session.event_token) {
      throw new Error('Invalid event token')
    }

    const event = this.db.createEvent({
      id: randomUUID(),
      session_id: id,
      type,
      data: data || null,
    })

    const newStatus = EVENT_STATE_MAP[type]
    if (newStatus) {
      this.db.updateStatus(id, newStatus)
    }

    return event
  }

  getEvents(id, limit) {
    return this.db.listEvents(id, limit)
  }

  async sendTask(id, input) {
    const session = this.db.getSession(id)
    if (!session) throw new Error(`Session not found: ${id}`)
    if (session.status === 'stopped' || session.status === 'failed') {
      throw new Error(`Cannot send task to ${session.status} session`)
    }

    const sessionName = `${SESSION_PREFIX}${session.name}`
    await this.terminal.sendKeys(sessionName, '0', '0', input)
    await this.terminal.sendKeys(sessionName, '0', '0', 'Enter')

    this.db.updateTask(id, input)
    return this.db.getSession(id)
  }

  async getOutput(id) {
    const session = this.db.getSession(id)
    if (!session) throw new Error(`Session not found: ${id}`)

    const sessionName = `${SESSION_PREFIX}${session.name}`
    try {
      return await this.terminal.capturePane(sessionName, '0', '0')
    } catch {
      return ''
    }
  }

  async kill(id) {
    const session = this.db.getSession(id)
    if (!session) throw new Error(`Session not found: ${id}`)
    if (session.status === 'stopped') throw new Error('Session already stopped')

    const sessionName = `${SESSION_PREFIX}${session.name}`
    try {
      await this.terminal.killSession(sessionName)
    } catch {
      // Session may already be dead
    }

    this.db.updateStatus(id, 'stopped')
    return this.db.getSession(id)
  }

  async checkHealth(id) {
    const session = this.db.getSession(id)
    if (!session) throw new Error(`Session not found: ${id}`)

    const sessionName = `${SESSION_PREFIX}${session.name}`
    const alive = await this.terminal.hasSession(sessionName)

    if (!alive && session.status !== 'stopped') {
      this.db.updateStatus(id, 'failed')
    }

    return {
      id: session.id,
      name: session.name,
      status: alive ? session.status : (session.status === 'stopped' ? 'stopped' : 'failed'),
      alive,
      last_activity_at: session.updated_at,
    }
  }

  async checkAllHealth() {
    const sessions = this.db.listSessions()
    const results = []
    for (const session of sessions) {
      results.push(await this.checkHealth(session.id))
    }
    return results
  }

  list(status) {
    return this.db.listSessions(status)
  }

  async get(id) {
    const session = this.db.getSession(id)
    if (!session) throw new Error(`Session not found: ${id}`)

    const output = await this.getOutput(id)
    const lastEvent = this.db.getLastEvent(id) || null
    return { ...session, output, last_event: lastEvent }
  }
}
