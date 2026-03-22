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
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)
  }

  createWorker({ id, name, command, status = 'idle' }) {
    const now = new Date().toISOString()
    this.db.prepare(`
      INSERT INTO workers (id, name, command, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, command, status, now, now)
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

  close() {
    if (this.db) this.db.close()
  }
}
