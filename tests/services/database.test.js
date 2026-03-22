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
    it('should create sessions table', () => {
      const tables = db.db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'"
      ).all()
      expect(tables).toHaveLength(1)
    })
  })

  describe('createSession', () => {
    it('should insert a session and return it', () => {
      const session = db.createSession({
        id: 'test-id-1',
        name: 'test-session',
        command: 'claude',
        status: 'idle',
      })
      expect(session.id).toBe('test-id-1')
      expect(session.name).toBe('test-session')
      expect(session.command).toBe('claude')
      expect(session.status).toBe('idle')
      expect(session.created_at).toBeDefined()
      expect(session.updated_at).toBeDefined()
    })

    it('should reject duplicate names', () => {
      expect(() => db.createSession({
        id: 'test-id-dup',
        name: 'test-session',
        command: 'claude',
        status: 'idle',
      })).toThrow()
    })
  })

  describe('getSession', () => {
    it('should return session by id', () => {
      const session = db.getSession('test-id-1')
      expect(session.name).toBe('test-session')
    })

    it('should return undefined for unknown id', () => {
      const session = db.getSession('nonexistent')
      expect(session).toBeUndefined()
    })
  })

  describe('listSessions', () => {
    it('should return all sessions', () => {
      const sessions = db.listSessions()
      expect(sessions.length).toBeGreaterThanOrEqual(1)
    })

    it('should filter by status', () => {
      const sessions = db.listSessions('idle')
      expect(sessions.every(s => s.status === 'idle')).toBe(true)
    })
  })

  describe('updateStatus', () => {
    it('should update session status', () => {
      db.updateStatus('test-id-1', 'running')
      const session = db.getSession('test-id-1')
      expect(session.status).toBe('running')
    })
  })

  describe('updateTask', () => {
    it('should update current_task and set status to running', () => {
      db.updateTask('test-id-1', 'do something')
      const session = db.getSession('test-id-1')
      expect(session.current_task).toBe('do something')
      expect(session.status).toBe('running')
    })
  })

  describe('updateStatus to stopped', () => {
    it('should mark session as stopped', () => {
      db.updateStatus('test-id-1', 'stopped')
      const session = db.getSession('test-id-1')
      expect(session.status).toBe('stopped')
    })
  })

  describe('cwd and event_token columns', () => {
    it('should store cwd and event_token', () => {
      const session = db.createSession({
        id: 'cwd-test-id',
        name: 'cwd-session',
        command: 'claude',
        cwd: '/home/claude/project',
        event_token: 'token-123',
      })
      expect(session.cwd).toBe('/home/claude/project')
      expect(session.event_token).toBe('token-123')
    })

    it('should allow null cwd', () => {
      const session = db.createSession({
        id: 'no-cwd-id',
        name: 'no-cwd-session',
        command: 'bash',
      })
      expect(session.cwd).toBeNull()
    })
  })

  describe('session_events', () => {
    it('should create event', () => {
      const event = db.createEvent({
        id: 'evt-1',
        session_id: 'test-id-1',
        type: 'notification',
        data: { message: 'test' },
      })
      expect(event.id).toBe('evt-1')
      expect(event.type).toBe('notification')
      expect(event.data).toEqual({ message: 'test' })
    })

    it('should get last event', () => {
      db.createEvent({ id: 'evt-2', session_id: 'test-id-1', type: 'stop', data: null })
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
      const last = db.getLastEvent('no-events-session')
      expect(last).toBeUndefined()
    })
  })
})
