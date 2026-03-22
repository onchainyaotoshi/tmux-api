import { randomUUID } from 'node:crypto'

const WORKER_PREFIX = 'worker-'

const EVENT_STATE_MAP = {
  notification: 'waiting_input',
  stop: 'idle',
  stop_failure: 'error',
  tool_use: 'running',
}

export class WorkerService {
  constructor(tmux, db) {
    this.tmux = tmux
    this.db = db
  }

  async spawn(name, command, cwd) {
    const id = randomUUID()
    const eventToken = randomUUID()
    const sessionName = `${WORKER_PREFIX}${name}`

    await this.tmux.createSession(sessionName, cwd || undefined)
    await this.tmux.sendKeys(sessionName, '0', '0', command)
    await this.tmux.sendKeys(sessionName, '0', '0', 'Enter')

    try {
      return this.db.createWorker({
        id, name, command, status: 'idle',
        cwd: cwd || null,
        event_token: eventToken,
      })
    } catch (err) {
      try { await this.tmux.killSession(sessionName) } catch {}
      throw err
    }
  }

  // Token validation is optional at service level — route enforces it.
  // When token is undefined, check is skipped (allows internal calls without token).
  async processEvent(id, type, data, token) {
    const worker = this.db.getWorker(id)
    if (!worker) throw new Error(`Worker not found: ${id}`)

    if (token !== undefined && token !== worker.event_token) {
      throw new Error('Invalid event token')
    }

    const event = this.db.createEvent({
      id: randomUUID(),
      worker_id: id,
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
    const worker = this.db.getWorker(id)
    if (!worker) throw new Error(`Worker not found: ${id}`)
    if (worker.status === 'stopped' || worker.status === 'failed') {
      throw new Error(`Cannot send task to ${worker.status} worker`)
    }

    const sessionName = `${WORKER_PREFIX}${worker.name}`
    await this.tmux.sendKeys(sessionName, '0', '0', input)
    await this.tmux.sendKeys(sessionName, '0', '0', 'Enter')

    this.db.updateTask(id, input)
    return this.db.getWorker(id)
  }

  async getOutput(id) {
    const worker = this.db.getWorker(id)
    if (!worker) throw new Error(`Worker not found: ${id}`)

    const sessionName = `${WORKER_PREFIX}${worker.name}`
    try {
      return await this.tmux.capturePane(sessionName, '0', '0')
    } catch {
      return ''
    }
  }

  async kill(id) {
    const worker = this.db.getWorker(id)
    if (!worker) throw new Error(`Worker not found: ${id}`)
    if (worker.status === 'stopped') throw new Error('Worker already stopped')

    const sessionName = `${WORKER_PREFIX}${worker.name}`
    try {
      await this.tmux.killSession(sessionName)
    } catch {
      // Session may already be dead
    }

    this.db.updateStatus(id, 'stopped')
    return this.db.getWorker(id)
  }

  async checkHealth(id) {
    const worker = this.db.getWorker(id)
    if (!worker) throw new Error(`Worker not found: ${id}`)

    const sessionName = `${WORKER_PREFIX}${worker.name}`
    const alive = await this.tmux.hasSession(sessionName)

    if (!alive && worker.status !== 'stopped') {
      this.db.updateStatus(id, 'failed')
    }

    return {
      id: worker.id,
      name: worker.name,
      status: alive ? worker.status : (worker.status === 'stopped' ? 'stopped' : 'failed'),
      alive,
      last_activity_at: worker.updated_at,
    }
  }

  async checkAllHealth() {
    const workers = this.db.listWorkers()
    const results = []
    for (const worker of workers) {
      results.push(await this.checkHealth(worker.id))
    }
    return results
  }

  list(status) {
    return this.db.listWorkers(status)
  }

  async get(id) {
    const worker = this.db.getWorker(id)
    if (!worker) throw new Error(`Worker not found: ${id}`)

    const output = await this.getOutput(id)
    const lastEvent = this.db.getLastEvent(id) || null
    return { ...worker, output, last_event: lastEvent }
  }
}
