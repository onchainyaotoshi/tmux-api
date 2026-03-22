import Database from 'better-sqlite3'

export class DatabaseService {
  constructor(dbPath) {
    this.dbPath = dbPath
    this.db = null
  }

  init() {
    this.db = new Database(this.dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.#migrate()
  }

  #migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workers (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        command TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'idle',
        current_task TEXT,
        cwd TEXT,
        event_token TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)

    // Migration for existing databases that lack new columns
    try { this.db.exec('ALTER TABLE workers ADD COLUMN cwd TEXT') } catch {}
    try { this.db.exec('ALTER TABLE workers ADD COLUMN event_token TEXT') } catch {}

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS worker_events (
        id TEXT PRIMARY KEY,
        worker_id TEXT NOT NULL REFERENCES workers(id),
        type TEXT NOT NULL,
        data TEXT,
        created_at TEXT NOT NULL
      )
    `)
  }

  createWorker({ id, name, command, status = 'idle', cwd = null, event_token = null }) {
    const now = new Date().toISOString()
    this.db.prepare(`
      INSERT INTO workers (id, name, command, status, cwd, event_token, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, command, status, cwd, event_token, now, now)
    return this.getWorker(id)
  }

  getWorker(id) {
    return this.db.prepare('SELECT * FROM workers WHERE id = ?').get(id)
  }

  listWorkers(status) {
    if (status) {
      return this.db.prepare('SELECT * FROM workers WHERE status = ?').all(status)
    }
    return this.db.prepare('SELECT * FROM workers').all()
  }

  updateStatus(id, status) {
    const now = new Date().toISOString()
    this.db.prepare('UPDATE workers SET status = ?, updated_at = ? WHERE id = ?')
      .run(status, now, id)
  }

  updateTask(id, task) {
    const now = new Date().toISOString()
    this.db.prepare('UPDATE workers SET current_task = ?, status = ?, updated_at = ? WHERE id = ?')
      .run(task, 'running', now, id)
  }

  createEvent({ id, worker_id, type, data }) {
    const now = new Date().toISOString()
    const dataStr = data ? JSON.stringify(data) : null
    this.db.prepare(`
      INSERT INTO worker_events (id, worker_id, type, data, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, worker_id, type, dataStr, now)
    return this.getEvent(id)
  }

  getEvent(id) {
    const row = this.db.prepare('SELECT * FROM worker_events WHERE id = ?').get(id)
    if (row && row.data) row.data = JSON.parse(row.data)
    return row
  }

  getLastEvent(workerId) {
    const row = this.db.prepare(
      'SELECT * FROM worker_events WHERE worker_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(workerId)
    if (row && row.data) row.data = JSON.parse(row.data)
    return row
  }

  listEvents(workerId, limit = 50) {
    const rows = this.db.prepare(
      'SELECT * FROM worker_events WHERE worker_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?'
    ).all(workerId, limit)
    return rows.map(row => {
      if (row.data) row.data = JSON.parse(row.data)
      return row
    })
  }

  close() {
    if (this.db) this.db.close()
  }
}
