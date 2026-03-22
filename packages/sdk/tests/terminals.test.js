import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Terminals, Windows, Panes } from '../src/resources/terminals.js'

function mockClient() {
  return {
    get: vi.fn().mockResolvedValue([]),
    post: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(null),
  }
}

describe('Terminals', () => {
  let client, terminals

  beforeEach(() => {
    client = mockClient()
    terminals = new Terminals(client)
  })

  it('list() calls GET /api/terminals', async () => {
    await terminals.list()
    expect(client.get).toHaveBeenCalledWith('/api/terminals')
  })

  it('create({ name }) calls POST /api/terminals', async () => {
    await terminals.create({ name: 'worker-1' })
    expect(client.post).toHaveBeenCalledWith('/api/terminals', { name: 'worker-1' })
  })

  it('update(name, { newName }) calls PUT /api/terminals/:name', async () => {
    await terminals.update('worker-1', { newName: 'worker-2' })
    expect(client.put).toHaveBeenCalledWith('/api/terminals/worker-1', { newName: 'worker-2' })
  })

  it('delete(name) calls DELETE /api/terminals/:name', async () => {
    await terminals.delete('worker-1')
    expect(client.delete).toHaveBeenCalledWith('/api/terminals/worker-1')
  })

  it('has .windows property', () => {
    expect(terminals.windows).toBeInstanceOf(Windows)
  })

  it('has .panes property', () => {
    expect(terminals.panes).toBeInstanceOf(Panes)
  })
})

describe('Windows', () => {
  let client, windows

  beforeEach(() => {
    client = mockClient()
    windows = new Windows(client)
  })

  it('list(terminal) calls GET', async () => {
    await windows.list('s1')
    expect(client.get).toHaveBeenCalledWith('/api/terminals/s1/windows')
  })

  it('create(terminal, { name }) calls POST', async () => {
    await windows.create('s1', { name: 'editor' })
    expect(client.post).toHaveBeenCalledWith('/api/terminals/s1/windows', { name: 'editor' })
  })

  it('create(terminal) works without options', async () => {
    await windows.create('s1')
    expect(client.post).toHaveBeenCalledWith('/api/terminals/s1/windows', undefined)
  })

  it('update(terminal, index, { newName }) calls PUT', async () => {
    await windows.update('s1', 0, { newName: 'main' })
    expect(client.put).toHaveBeenCalledWith('/api/terminals/s1/windows/0', { newName: 'main' })
  })

  it('delete(terminal, index) calls DELETE', async () => {
    await windows.delete('s1', 1)
    expect(client.delete).toHaveBeenCalledWith('/api/terminals/s1/windows/1')
  })
})

describe('Panes', () => {
  let client, panes

  beforeEach(() => {
    client = mockClient()
    panes = new Panes(client)
  })

  it('list(terminal, window) calls GET', async () => {
    await panes.list('s1', 0)
    expect(client.get).toHaveBeenCalledWith('/api/terminals/s1/windows/0/panes')
  })

  it('split(terminal, window, { direction }) calls POST', async () => {
    await panes.split('s1', 0, { direction: 'h' })
    expect(client.post).toHaveBeenCalledWith('/api/terminals/s1/windows/0/panes', { direction: 'h' })
  })

  it('resize(terminal, window, pane, opts) calls PUT', async () => {
    await panes.resize('s1', 0, 0, { direction: 'U', amount: 5 })
    expect(client.put).toHaveBeenCalledWith('/api/terminals/s1/windows/0/panes/0/resize', { direction: 'U', amount: 5 })
  })

  it('delete(terminal, window, pane) calls DELETE', async () => {
    await panes.delete('s1', 0, 1)
    expect(client.delete).toHaveBeenCalledWith('/api/terminals/s1/windows/0/panes/1')
  })

  it('sendKeys(terminal, window, pane, { keys }) calls POST', async () => {
    await panes.sendKeys('s1', 0, 0, { keys: 'echo hi' })
    expect(client.post).toHaveBeenCalledWith('/api/terminals/s1/windows/0/panes/0/send-keys', { keys: 'echo hi' })
  })

  it('capture(terminal, window, pane) calls GET', async () => {
    await panes.capture('s1', 0, 0)
    expect(client.get).toHaveBeenCalledWith('/api/terminals/s1/windows/0/panes/0/capture')
  })
})
