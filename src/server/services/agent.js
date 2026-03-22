import { randomUUID } from 'node:crypto'

export class AgentService {
  constructor(db, sessionService) {
    this.db = db
    this.sessionService = sessionService
  }

  create(name, command, cwd, description, env) {
    const id = randomUUID()
    return this.db.createAgent({ id, name, command, cwd, description, env })
  }

  get(id) {
    const agent = this.db.getAgent(id)
    if (!agent) throw new Error(`Agent not found: ${id}`)
    agent.active_sessions = this.db.countActiveSessionsByAgent(id)
    return agent
  }

  list() {
    const agents = this.db.listAgents()
    return agents.map(agent => {
      agent.active_sessions = this.db.countActiveSessionsByAgent(agent.id)
      return agent
    })
  }

  update(id, fields) {
    const agent = this.db.getAgent(id)
    if (!agent) throw new Error(`Agent not found: ${id}`)
    return this.db.updateAgent(id, fields)
  }

  delete(id) {
    const agent = this.db.getAgent(id)
    if (!agent) throw new Error(`Agent not found: ${id}`)
    const active = this.db.countActiveSessionsByAgent(id)
    if (active > 0) throw new Error('Cannot delete agent with active sessions')
    this.db.deleteAgent(id)
    return agent
  }

  async launch(id, sessionName) {
    const agent = this.db.getAgent(id)
    if (!agent) throw new Error(`Agent not found: ${id}`)

    if (!sessionName) {
      const base = agent.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-')
      const short = randomUUID().slice(0, 4)
      sessionName = `${base}-${short}`
    }

    return this.sessionService.spawn(
      sessionName, agent.command, agent.cwd,
      { env: agent.env, agentId: id }
    )
  }

  listSessions(id) {
    const agent = this.db.getAgent(id)
    if (!agent) throw new Error(`Agent not found: ${id}`)
    return this.db.listSessionsByAgent(id)
  }
}
