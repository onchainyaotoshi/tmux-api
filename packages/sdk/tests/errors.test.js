import { describe, it, expect } from 'vitest'
import {
  ApiError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServerError,
} from '../src/errors.js'

describe('ApiError', () => {
  it('stores status and message', () => {
    const err = new ApiError(500, 'boom')
    expect(err).toBeInstanceOf(Error)
    expect(err.status).toBe(500)
    expect(err.message).toBe('boom')
    expect(err.name).toBe('ApiError')
  })
})

describe('typed errors', () => {
  const cases = [
    [ValidationError, 400, 'ValidationError'],
    [AuthenticationError, 401, 'AuthenticationError'],
    [NotFoundError, 404, 'NotFoundError'],
    [ConflictError, 409, 'ConflictError'],
    [RateLimitError, 429, 'RateLimitError'],
    [ServerError, 500, 'ServerError'],
  ]

  it.each(cases)('%s has status %i and name %s', (ErrorClass, status, name) => {
    const err = new ErrorClass('test message')
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toBeInstanceOf(Error)
    expect(err.status).toBe(status)
    expect(err.message).toBe('test message')
    expect(err.name).toBe(name)
  })
})

describe('RateLimitError', () => {
  it('exposes retryAfter', () => {
    const err = new RateLimitError('slow down', 30)
    expect(err.retryAfter).toBe(30)
  })

  it('defaults retryAfter to null', () => {
    const err = new RateLimitError('slow down')
    expect(err.retryAfter).toBeNull()
  })
})
