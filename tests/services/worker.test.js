import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { WorkerService } from '../../src/server/services/worker.js'
import { TmuxService } from '../../src/server/services/tmux.js'
import { DatabaseService } from '../../src/server/services/database.js'
import { existsSync, unlinkSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const TEST_DB = join(process.cwd(), 'data', 'test-worker.db')
const WORKER_PREFIX = 'worker-'

let workerService, tmux, db

beforeAll(() => {
  mkdirSync(join(process.cwd(), 'data'), { recursive: true })
  tmux = new TmuxService()
  db = new DatabaseService(TEST_DB)
  db.init()
  workerService = new WorkerService(tmux, db)
})

afterEach(async () => {
  const workers = db.listWorkers()
  for (const w of workers) {
    try { await tmux.killSession(`${WORKER_PREFIX}${w.name}`) } catch {}
  }
  db.db.exec('DELETE FROM workers')
})

afterAll(() => {
  db.close()
  if (existsSync(TEST_DB)) unlinkSync(TEST_DB)
})

describe('WorkerService', () => {
  describe('spawn', () => {
    it('should create a tmux session and database record', async () => {
      const worker = await workerService.spawn('test-w1', 'echo hello')
      expect(worker.name).toBe('test-w1')
      expect(worker.command).toBe('echo hello')
      expect(worker.status).toBe('idle')
      expect(worker.id).toBeDefined()

      const alive = await tmux.hasSession(`${WORKER_PREFIX}test-w1`)
      expect(alive).toBe(true)
    })

    it('should reject duplicate worker names', async () => {
      await workerService.spawn('dup-worker', 'echo hi')
      await expect(workerService.spawn('dup-worker', 'echo hi'))
        .rejects.toThrow()
    })
  })

  describe('sendTask', () => {
    it('should send input to worker and update status to running', async () => {
      const worker = await workerService.spawn('task-w1', 'bash')
      const updated = await workerService.sendTask(worker.id, 'echo task-running')
      expect(updated.status).toBe('running')
      expect(updated.current_task).toBe('echo task-running')
    })

    it('should reject task to stopped worker', async () => {
      const worker = await workerService.spawn('stopped-w1', 'bash')
      await workerService.kill(worker.id)
      await expect(workerService.sendTask(worker.id, 'echo nope'))
        .rejects.toThrow(/stopped/)
    })
  })

  describe('getOutput', () => {
    it('should capture pane output', async () => {
      const worker = await workerService.spawn('output-w1', 'bash')
      await tmux.sendKeys(`${WORKER_PREFIX}output-w1`, '0', '0', 'echo foreman-test-output')
      await tmux.sendKeys(`${WORKER_PREFIX}output-w1`, '0', '0', 'Enter')
      await new Promise(r => setTimeout(r, 500))
      const output = await workerService.getOutput(worker.id)
      expect(output).toContain('foreman-test-output')
    })
  })

  describe('kill', () => {
    it('should kill tmux session and update status', async () => {
      const worker = await workerService.spawn('kill-w1', 'bash')
      const killed = await workerService.kill(worker.id)
      expect(killed.status).toBe('stopped')

      const alive = await tmux.hasSession(`${WORKER_PREFIX}kill-w1`)
      expect(alive).toBe(false)
    })

    it('should throw for unknown worker', async () => {
      await expect(workerService.kill('nonexistent-id'))
        .rejects.toThrow()
    })
  })

  describe('checkHealth', () => {
    it('should return alive=true for running session', async () => {
      const worker = await workerService.spawn('health-w1', 'bash')
      const health = await workerService.checkHealth(worker.id)
      expect(health.alive).toBe(true)
      expect(health.status).toBe('idle')
    })

    it('should detect dead session and update status to failed', async () => {
      const worker = await workerService.spawn('health-w2', 'bash')
      await tmux.killSession(`${WORKER_PREFIX}health-w2`)
      const health = await workerService.checkHealth(worker.id)
      expect(health.alive).toBe(false)
      expect(health.status).toBe('failed')
    })
  })

  describe('list', () => {
    it('should list all workers', async () => {
      await workerService.spawn('list-w1', 'bash')
      await workerService.spawn('list-w2', 'bash')
      const workers = workerService.list()
      expect(workers.length).toBe(2)
    })

    it('should filter by status', async () => {
      await workerService.spawn('filter-w1', 'bash')
      const w2 = await workerService.spawn('filter-w2', 'bash')
      await workerService.kill(w2.id)
      const idle = workerService.list('idle')
      expect(idle.length).toBe(1)
      expect(idle[0].name).toBe('filter-w1')
    })
  })

  describe('get', () => {
    it('should return worker with output', async () => {
      const worker = await workerService.spawn('get-w1', 'bash')
      const detail = await workerService.get(worker.id)
      expect(detail.id).toBe(worker.id)
      expect(detail.output).toBeDefined()
    })

    it('should throw for unknown worker', async () => {
      await expect(workerService.get('nonexistent'))
        .rejects.toThrow()
    })
  })
})
