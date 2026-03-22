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
    // Migrate existing v0.7.0 databases
    const hasWorkers = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='workers'"
    ).get()
    if (hasWorkers) {
      this.db.exec('ALTER TABLE workers RENAME TO sessions')
      this.db.exec('ALTER TABLE worker_events RENAME TO session_events')
      this.db.exec('ALTER TABLE session_events RENAME COLUMN worker_id TO session_id')
    }

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
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

    try { this.db.exec('ALTER TABLE sessions ADD COLUMN cwd TEXT') } catch {}
    try { this.db.exec('ALTER TABLE sessions ADD COLUMN event_token TEXT') } catch {}

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS session_events (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES sessions(id),
        type TEXT NOT NULL,
        data TEXT,
        created_at TEXT NOT NULL
      )
    `)

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        command TEXT NOT NULL,
        cwd TEXT,
        description TEXT,
        env TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)

    try { this.db.exec('ALTER TABLE sessions ADD COLUMN agent_id TEXT REFERENCES agents(id)') } catch {}
  }

  createSession({ id, name, command, status = 'idle', cwd = null, event_token = null, agent_id = null }) {
    const now = new Date().toISOString()
    this.db.prepare(`
      INSERT INTO sessions (id, name, command, status, cwd, event_token, agent_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, command, status, cwd, event_token, agent_id, now, now)
    return this.getSession(id)
  }

  getSession(id) {
    return this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id)
  }

  listSessions(status) {
    if (status) {
      return this.db.prepare('SELECT * FROM sessions WHERE status = ?').all(status)
    }
    return this.db.prepare('SELECT * FROM sessions').all()
  }

  updateStatus(id, status) {
    const now = new Date().toISOString()
    this.db.prepare('UPDATE sessions SET status = ?, updated_at = ? WHERE id = ?')
      .run(status, now, id)
  }

  updateTask(id, task) {
    const now = new Date().toISOString()
    this.db.prepare('UPDATE sessions SET current_task = ?, status = ?, updated_at = ? WHERE id = ?')
      .run(task, 'running', now, id)
  }

  createEvent({ id, session_id, type, data }) {
    const now = new Date().toISOString()
    const dataStr = data ? JSON.stringify(data) : null
    this.db.prepare(`
      INSERT INTO session_events (id, session_id, type, data, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, session_id, type, dataStr, now)
    return this.getEvent(id)
  }

  getEvent(id) {
    const row = this.db.prepare('SELECT * FROM session_events WHERE id = ?').get(id)
    if (row && row.data) row.data = JSON.parse(row.data)
    return row
  }

  getLastEvent(sessionId) {
    const row = this.db.prepare(
      'SELECT * FROM session_events WHERE session_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(sessionId)
    if (row && row.data) row.data = JSON.parse(row.data)
    return row
  }

  listEvents(sessionId, limit = 50) {
    const rows = this.db.prepare(
      'SELECT * FROM session_events WHERE session_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?'
    ).all(sessionId, limit)
    return rows.map(row => {
      if (row.data) row.data = JSON.parse(row.data)
      return row
    })
  }

  createAgent({ id, name, command, cwd = null, description = null, env = null }) {
    const now = new Date().toISOString()
    const envStr = env ? JSON.stringify(env) : null
    this.db.prepare(`
      INSERT INTO agents (id, name, command, cwd, description, env, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, command, cwd, description, envStr, now, now)
    return this.getAgent(id)
  }

  getAgent(id) {
    const row = this.db.prepare('SELECT * FROM agents WHERE id = ?').get(id)
    if (row && row.env) row.env = JSON.parse(row.env)
    return row
  }

  listAgents() {
    const rows = this.db.prepare('SELECT * FROM agents').all()
    return rows.map(row => {
      if (row.env) row.env = JSON.parse(row.env)
      return row
    })
  }

  updateAgent(id, fields) {
    const allowed = ['name', 'command', 'cwd', 'description', 'env']
    const updates = []
    const values = []
    for (const key of allowed) {
      if (key in fields) {
        updates.push(`${key} = ?`)
        values.push(key === 'env' && fields[key] != null ? JSON.stringify(fields[key]) : fields[key])
      }
    }
    if (updates.length === 0) return this.getAgent(id)
    const now = new Date().toISOString()
    updates.push('updated_at = ?')
    values.push(now, id)
    this.db.prepare(`UPDATE agents SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    return this.getAgent(id)
  }

  deleteAgent(id) {
    this.db.prepare('DELETE FROM agents WHERE id = ?').run(id)
  }

  countActiveSessionsByAgent(agentId) {
    const row = this.db.prepare(
      "SELECT COUNT(*) as count FROM sessions WHERE agent_id = ? AND status != 'stopped'"
    ).get(agentId)
    return row.count
  }

  listSessionsByAgent(agentId) {
    return this.db.prepare('SELECT * FROM sessions WHERE agent_id = ?').all(agentId)
  }

  close() {
    if (this.db) this.db.close()
  }
}
