import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Sessions } from '../src/resources/sessions.js'

function mockClient() {
  return {
    get: vi.fn().mockResolvedValue([]),
    post: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(null),
  }
}

describe('Sessions', () => {
  let client, sessions

  beforeEach(() => {
    client = mockClient()
    sessions = new Sessions(client)
  })

  it('list() calls GET /api/sessions', async () => {
    await sessions.list()
    expect(client.get).toHaveBeenCalledWith('/api/sessions')
  })

  it('create({ name, command }) calls POST /api/sessions', async () => {
    await sessions.create({ name: 'agent-1', command: 'claude --chat' })
    expect(client.post).toHaveBeenCalledWith('/api/sessions', { name: 'agent-1', command: 'claude --chat' })
  })

  it('create({ name, command, cwd }) passes cwd', async () => {
    await sessions.create({ name: 'a', command: 'bash', cwd: '/tmp' })
    expect(client.post).toHaveBeenCalledWith('/api/sessions', { name: 'a', command: 'bash', cwd: '/tmp' })
  })

  it('get(name) calls GET /api/sessions/:name', async () => {
    await sessions.get('agent-1')
    expect(client.get).toHaveBeenCalledWith('/api/sessions/agent-1')
  })

  it('health(name) calls GET /api/sessions/:name/health', async () => {
    await sessions.health('agent-1')
    expect(client.get).toHaveBeenCalledWith('/api/sessions/agent-1/health')
  })

  it('task(name, { input }) calls POST /api/sessions/:name/task', async () => {
    await sessions.task('agent-1', { input: 'do something' })
    expect(client.post).toHaveBeenCalledWith('/api/sessions/agent-1/task', { input: 'do something' })
  })

  it('delete(name) calls DELETE /api/sessions/:name', async () => {
    await sessions.delete('agent-1')
    expect(client.delete).toHaveBeenCalledWith('/api/sessions/agent-1')
  })
})
