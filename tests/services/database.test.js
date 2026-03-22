import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { DatabaseService } from '../../src/server/services/database.js'
import { existsSync, unlinkSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const TEST_DB_PATH = join(process.cwd(), 'data', 'test-foreman.db')

let db

beforeAll(() => {
  mkdirSync(join(process.cwd(), 'data'), { recursive: true })
  db = new DatabaseService(TEST_DB_PATH)
  db.init()
})

afterAll(() => {
  db.close()
  if (existsSync(TEST_DB_PATH)) unlinkSync(TEST_DB_PATH)
})

describe('DatabaseService', () => {
  describe('init', () => {
    it('should create workers table', () => {
      const tables = db.db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='workers'"
      ).all()
      expect(tables).toHaveLength(1)
    })
  })

  describe('createWorker', () => {
    it('should insert a worker and return it', () => {
      const worker = db.createWorker({
        id: 'test-id-1',
        name: 'test-worker',
        command: 'claude',
        status: 'idle',
      })
      expect(worker.id).toBe('test-id-1')
      expect(worker.name).toBe('test-worker')
      expect(worker.command).toBe('claude')
      expect(worker.status).toBe('idle')
      expect(worker.created_at).toBeDefined()
      expect(worker.updated_at).toBeDefined()
    })

    it('should reject duplicate names', () => {
      expect(() => db.createWorker({
        id: 'test-id-dup',
        name: 'test-worker',
        command: 'claude',
        status: 'idle',
      })).toThrow()
    })
  })

  describe('getWorker', () => {
    it('should return worker by id', () => {
      const worker = db.getWorker('test-id-1')
      expect(worker.name).toBe('test-worker')
    })

    it('should return undefined for unknown id', () => {
      const worker = db.getWorker('nonexistent')
      expect(worker).toBeUndefined()
    })
  })

  describe('listWorkers', () => {
    it('should return all workers', () => {
      const workers = db.listWorkers()
      expect(workers.length).toBeGreaterThanOrEqual(1)
    })

    it('should filter by status', () => {
      const workers = db.listWorkers('idle')
      expect(workers.every(w => w.status === 'idle')).toBe(true)
    })
  })

  describe('updateStatus', () => {
    it('should update worker status', () => {
      db.updateStatus('test-id-1', 'running')
      const worker = db.getWorker('test-id-1')
      expect(worker.status).toBe('running')
    })
  })

  describe('updateTask', () => {
    it('should update current_task and set status to running', () => {
      db.updateTask('test-id-1', 'do something')
      const worker = db.getWorker('test-id-1')
      expect(worker.current_task).toBe('do something')
      expect(worker.status).toBe('running')
    })
  })

  describe('updateStatus to stopped', () => {
    it('should mark worker as stopped', () => {
      db.updateStatus('test-id-1', 'stopped')
      const worker = db.getWorker('test-id-1')
      expect(worker.status).toBe('stopped')
    })
  })

  describe('cwd and event_token columns', () => {
    it('should store cwd and event_token', () => {
      const worker = db.createWorker({
        id: 'cwd-test-id',
        name: 'cwd-worker',
        command: 'claude',
        cwd: '/home/claude/project',
        event_token: 'token-123',
      })
      expect(worker.cwd).toBe('/home/claude/project')
      expect(worker.event_token).toBe('token-123')
    })

    it('should allow null cwd', () => {
      const worker = db.createWorker({
        id: 'no-cwd-id',
        name: 'no-cwd-worker',
        command: 'bash',
      })
      expect(worker.cwd).toBeNull()
    })
  })

  describe('worker_events', () => {
    it('should create event', () => {
      const event = db.createEvent({
        id: 'evt-1',
        worker_id: 'test-id-1',
        type: 'notification',
        data: { message: 'test' },
      })
      expect(event.id).toBe('evt-1')
      expect(event.type).toBe('notification')
      expect(event.data).toEqual({ message: 'test' })
    })

    it('should get last event', () => {
      db.createEvent({ id: 'evt-2', worker_id: 'test-id-1', type: 'stop', data: null })
      const last = db.getLastEvent('test-id-1')
      expect(last.id).toBe('evt-2')
      expect(last.type).toBe('stop')
    })

    it('should list events newest first', () => {
      const events = db.listEvents('test-id-1', 50)
      expect(events[0].id).toBe('evt-2')
      expect(events[1].id).toBe('evt-1')
    })

    it('should return undefined for no events', () => {
      const last = db.getLastEvent('no-events-worker')
      expect(last).toBeUndefined()
    })
  })
})
