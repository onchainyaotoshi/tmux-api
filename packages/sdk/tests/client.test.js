import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BaseClient } from '../src/client.js'
import { AuthenticationError, NotFoundError, ConflictError, ValidationError, RateLimitError, ServerError, ApiError } from '../src/errors.js'

describe('BaseClient', () => {
  let client

  beforeEach(() => {
    client = new BaseClient({
      baseUrl: 'http://localhost:9993',
      apiKey: 'test-key',
      timeout: 5000,
      retries: 0,
    })
  })

  describe('constructor', () => {
    it('requires baseUrl', () => {
      expect(() => new BaseClient({ apiKey: 'x' })).toThrow('baseUrl is required')
    })

    it('requires apiKey', () => {
      expect(() => new BaseClient({ baseUrl: 'http://localhost' })).toThrow('apiKey is required')
    })

    it('sets defaults for timeout and retries', () => {
      const c = new BaseClient({ baseUrl: 'http://localhost', apiKey: 'x' })
      expect(c.timeout).toBe(10000)
      expect(c.retries).toBe(2)
    })
  })

  describe('request', () => {
    it('sends GET with auth header', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({ success: true, data: [1, 2, 3] }),
      })
      client.fetch = mockFetch

      const result = await client.get('/api/terminals')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:9993/api/terminals',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({ 'X-API-Key': 'test-key' }),
        })
      )
      expect(result).toEqual([1, 2, 3])
    })

    it('sends POST with JSON body', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Headers(),
        json: () => Promise.resolve({ success: true, data: { name: 'test' } }),
      })
      client.fetch = mockFetch

      const result = await client.post('/api/terminals', { name: 'test' })

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:9993/api/terminals',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-API-Key': 'test-key',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ name: 'test' }),
        })
      )
      expect(result).toEqual({ name: 'test' })
    })

    it('unwraps success envelope — returns data directly', async () => {
      client.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({ success: true, data: { content: 'hello' } }),
      })

      const result = await client.get('/api/test')
      expect(result).toEqual({ content: 'hello' })
    })
  })

  describe('error mapping', () => {
    const errorCases = [
      [400, 'bad request', ValidationError],
      [401, 'unauthorized', AuthenticationError],
      [404, 'not found', NotFoundError],
      [409, 'conflict', ConflictError],
      [429, 'rate limited', RateLimitError],
      [500, 'server error', ServerError],
    ]

    it.each(errorCases)('status %i throws %s', async (status, message, ErrorClass) => {
      client.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status,
        headers: new Headers(),
        json: () => Promise.resolve({ success: false, error: message }),
      })

      await expect(client.get('/api/test')).rejects.toThrow(ErrorClass)
    })

    it('RateLimitError includes retryAfter from header', async () => {
      expect.assertions(2)
      client.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers({ 'Retry-After': '30' }),
        json: () => Promise.resolve({ success: false, error: 'slow down' }),
      })

      try {
        await client.get('/api/test')
      } catch (err) {
        expect(err).toBeInstanceOf(RateLimitError)
        expect(err.retryAfter).toBe(30)
      }
    })

    it('unmapped 5xx returns ServerError', async () => {
      client.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        headers: new Headers(),
        json: () => Promise.resolve({ success: false, error: 'unavailable' }),
      })

      await expect(client.get('/api/test')).rejects.toThrow(ServerError)
    })

    it('unmapped 4xx returns generic ApiError', async () => {
      client.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        headers: new Headers(),
        json: () => Promise.resolve({ success: false, error: 'unprocessable' }),
      })

      await expect(client.get('/api/test')).rejects.toThrow(ApiError)
    })
  })

  describe('retries', () => {
    it('retries GET on 500', async () => {
      const retryClient = new BaseClient({
        baseUrl: 'http://localhost:9993',
        apiKey: 'test-key',
        retries: 2,
        timeout: 5000,
      })

      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: false, status: 500, headers: new Headers(),
          json: () => Promise.resolve({ success: false, error: 'fail' }),
        })
        .mockResolvedValueOnce({
          ok: true, status: 200, headers: new Headers(),
          json: () => Promise.resolve({ success: true, data: 'ok' }),
        })
      retryClient.fetch = mockFetch

      const result = await retryClient.get('/api/test')
      expect(result).toBe('ok')
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('does NOT retry POST', async () => {
      const retryClient = new BaseClient({
        baseUrl: 'http://localhost:9993',
        apiKey: 'test-key',
        retries: 2,
        timeout: 5000,
      })

      retryClient.fetch = vi.fn().mockResolvedValue({
        ok: false, status: 500, headers: new Headers(),
        json: () => Promise.resolve({ success: false, error: 'fail' }),
      })

      await expect(retryClient.post('/api/test', {})).rejects.toThrow(ServerError)
      expect(retryClient.fetch).toHaveBeenCalledTimes(1)
    })

    it('does NOT retry 4xx (except 429)', async () => {
      const retryClient = new BaseClient({
        baseUrl: 'http://localhost:9993',
        apiKey: 'test-key',
        retries: 2,
        timeout: 5000,
      })

      retryClient.fetch = vi.fn().mockResolvedValue({
        ok: false, status: 404, headers: new Headers(),
        json: () => Promise.resolve({ success: false, error: 'not found' }),
      })

      await expect(retryClient.get('/api/test')).rejects.toThrow(NotFoundError)
      expect(retryClient.fetch).toHaveBeenCalledTimes(1)
    })
  })
})
