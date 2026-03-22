import { randomUUID } from 'node:crypto'

const WORKER_PREFIX = 'worker-'

export class WorkerService {
  constructor(tmux, db) {
    this.tmux = tmux
    this.db = db
  }

  async spawn(name, command) {
    const id = randomUUID()
    const sessionName = `${WORKER_PREFIX}${name}`

    await this.tmux.createSession(sessionName)
    await this.tmux.sendKeys(sessionName, '0', '0', command)
    await this.tmux.sendKeys(sessionName, '0', '0', 'Enter')

    try {
      return this.db.createWorker({ id, name, command, status: 'idle' })
    } catch (err) {
      try { await this.tmux.killSession(sessionName) } catch {}
      throw err
    }
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
    return { ...worker, output }
  }
}
