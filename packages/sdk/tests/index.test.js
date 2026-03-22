import { describe, it, expect } from 'vitest'
import TmuxApi, {
  ApiError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServerError,
} from '../src/index.js'
import { Terminals } from '../src/resources/terminals.js'
import { Sessions } from '../src/resources/sessions.js'

describe('TmuxApi', () => {
  it('creates client with terminals and sessions', () => {
    const api = new TmuxApi({
      baseUrl: 'http://localhost:9993',
      apiKey: 'test-key',
    })

    expect(api.terminals).toBeInstanceOf(Terminals)
    expect(api.sessions).toBeInstanceOf(Sessions)
  })

  it('throws if baseUrl missing', () => {
    expect(() => new TmuxApi({ apiKey: 'x' })).toThrow('baseUrl is required')
  })

  it('throws if apiKey missing', () => {
    expect(() => new TmuxApi({ baseUrl: 'http://localhost' })).toThrow('apiKey is required')
  })

  it('re-exports all error classes', () => {
    expect(ApiError).toBeDefined()
    expect(ValidationError).toBeDefined()
    expect(AuthenticationError).toBeDefined()
    expect(NotFoundError).toBeDefined()
    expect(ConflictError).toBeDefined()
    expect(RateLimitError).toBeDefined()
    expect(ServerError).toBeDefined()
  })
})
