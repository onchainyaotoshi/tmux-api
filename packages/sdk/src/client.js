import {
  ApiError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServerError,
} from './errors.js'

const ERROR_MAP = {
  400: (msg) => new ValidationError(msg),
  401: (msg) => new AuthenticationError(msg),
  404: (msg) => new NotFoundError(msg),
  409: (msg) => new ConflictError(msg),
  429: (msg, headers) => new RateLimitError(msg, parseRetryAfter(headers)),
  500: (msg) => new ServerError(msg),
}

function parseRetryAfter(headers) {
  const value = headers.get('Retry-After')
  if (!value) return null
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? null : parsed
}

const IDEMPOTENT_METHODS = new Set(['GET', 'PUT', 'DELETE'])
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504])

export class BaseClient {
  constructor({ baseUrl, apiKey, timeout = 10000, retries = 2 } = {}) {
    if (!baseUrl) throw new Error('baseUrl is required')
    if (!apiKey) throw new Error('apiKey is required')
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.apiKey = apiKey
    this.timeout = timeout
    this.retries = retries
    this.fetch = globalThis.fetch
  }

  async request(method, path, body) {
    const url = `${this.baseUrl}${path}`
    const headers = { 'X-API-Key': this.apiKey }
    const opts = { method, headers }

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
      opts.body = JSON.stringify(body)
    }

    const canRetry = IDEMPOTENT_METHODS.has(method)
    const maxAttempts = canRetry ? 1 + this.retries : 1
    let lastError

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        const delay = 500 * Math.pow(2, attempt - 1)
        await new Promise(r => setTimeout(r, delay))
      }

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), this.timeout)

      try {
        const response = await this.fetch(url, { ...opts, signal: controller.signal })
        clearTimeout(timer)

        if (response.ok) {
          const json = await response.json()
          return json.data
        }

        const json = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
        const message = json.error || `HTTP ${response.status}`

        if (RETRYABLE_STATUSES.has(response.status) && attempt < maxAttempts - 1) {
          lastError = this.createError(response.status, message, response.headers)
          continue
        }

        throw this.createError(response.status, message, response.headers)
      } catch (err) {
        clearTimeout(timer)
        if (err instanceof ApiError) throw err
        if (err.name === 'AbortError') {
          lastError = new ApiError(0, 'Request timed out')
          if (attempt < maxAttempts - 1) continue
          throw lastError
        }
        throw new ApiError(0, err.message)
      }
    }

    throw lastError
  }

  createError(status, message, headers) {
    const factory = ERROR_MAP[status]
    if (factory) return factory(message, headers)
    if (status >= 500) return new ServerError(message)
    return new ApiError(status, message)
  }

  get(path) { return this.request('GET', path) }
  post(path, body) { return this.request('POST', path, body) }
  put(path, body) { return this.request('PUT', path, body) }
  delete(path) { return this.request('DELETE', path) }
}
