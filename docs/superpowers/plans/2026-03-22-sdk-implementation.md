# @yaotoshi/tmux-api SDK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish `@yaotoshi/tmux-api`, a Node.js SDK wrapping the tmux-api REST server.

**Architecture:** Stripe-style resource classes. Single `TmuxApi` entry point with `.terminals`, `.sessions`, `.terminals.windows`, `.terminals.panes` resource namespaces. BaseClient handles fetch, auth, retries, error mapping. Zero dependencies (native fetch, Node 18+).

**Tech Stack:** Node.js ESM, native fetch, Vitest, GitHub Actions for npm publish.

**Spec:** `docs/superpowers/specs/2026-03-22-sdk-design.md`

---

## File Map

| File | Responsibility |
|------|---------------|
| `packages/sdk/package.json` | Package metadata, npm config |
| `packages/sdk/src/index.js` | TmuxApi class, default export + named error exports |
| `packages/sdk/src/errors.js` | ApiError base + typed subclasses (400, 401, 404, 409, 429, 500) |
| `packages/sdk/src/client.js` | BaseClient: fetch wrapper, auth headers, retries, timeout, envelope unwrap |
| `packages/sdk/src/resources/terminals.js` | Terminals, Windows, Panes resource classes |
| `packages/sdk/src/resources/sessions.js` | Sessions resource class |
| `packages/sdk/tests/errors.test.js` | Error class tests |
| `packages/sdk/tests/client.test.js` | BaseClient tests (auth, retries, timeout, error mapping) |
| `packages/sdk/tests/terminals.test.js` | Terminals + Windows + Panes resource tests |
| `packages/sdk/tests/sessions.test.js` | Sessions resource tests |
| `packages/sdk/README.md` | SDK usage docs with badge |
| `.github/workflows/publish-sdk.yml` | GitHub Actions: auto-publish on `sdk/v*` tag |

---

### Task 1: Package Scaffold

**Files:**
- Create: `packages/sdk/package.json`
- Create: `packages/sdk/src/index.js` (stub)

- [ ] **Step 1: Create packages/sdk directory and package.json**

```json
{
  "name": "@yaotoshi/tmux-api",
  "version": "0.1.0",
  "description": "Node.js SDK for tmux-api — control tmux sessions via REST",
  "type": "module",
  "main": "src/index.js",
  "exports": {
    ".": "./src/index.js"
  },
  "engines": { "node": ">=18" },
  "files": ["src/"],
  "keywords": ["tmux", "api", "sdk", "terminal", "session"],
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/onchainyaotoshi/tmux-api",
    "directory": "packages/sdk"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^4.1.0"
  }
}
```

- [ ] **Step 2: Create stub src/index.js**

```js
export default class TmuxApi {}
```

- [ ] **Step 3: Install dev deps**

Run: `cd packages/sdk && npm install`

- [ ] **Step 4: Verify import works**

Run: `cd packages/sdk && node -e "import TmuxApi from './src/index.js'; console.log('ok')"`
Expected: `ok`

- [ ] **Step 5: Commit**

```bash
git add packages/sdk/package.json packages/sdk/package-lock.json packages/sdk/src/index.js
git commit -m "chore: scaffold @yaotoshi/tmux-api SDK package"
```

---

### Task 2: Error Classes

**Files:**
- Create: `packages/sdk/src/errors.js`
- Create: `packages/sdk/tests/errors.test.js`

- [ ] **Step 1: Write failing test for error classes**

```js
// packages/sdk/tests/errors.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/sdk && npx vitest run tests/errors.test.js`
Expected: FAIL — cannot find module `../src/errors.js`

- [ ] **Step 3: Implement errors.js**

```js
// packages/sdk/src/errors.js
export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export class ValidationError extends ApiError {
  constructor(message) {
    super(400, message)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends ApiError {
  constructor(message) {
    super(401, message)
    this.name = 'AuthenticationError'
  }
}

export class NotFoundError extends ApiError {
  constructor(message) {
    super(404, message)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends ApiError {
  constructor(message) {
    super(409, message)
    this.name = 'ConflictError'
  }
}

export class RateLimitError extends ApiError {
  constructor(message, retryAfter = null) {
    super(429, message)
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

export class ServerError extends ApiError {
  constructor(message) {
    super(500, message)
    this.name = 'ServerError'
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/sdk && npx vitest run tests/errors.test.js`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add packages/sdk/src/errors.js packages/sdk/tests/errors.test.js
git commit -m "feat: add SDK error class hierarchy"
```

---

### Task 3: BaseClient

**Files:**
- Create: `packages/sdk/src/client.js`
- Create: `packages/sdk/tests/client.test.js`

- [ ] **Step 1: Write failing tests for BaseClient**

```js
// packages/sdk/tests/client.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BaseClient } from '../src/client.js'
import { AuthenticationError, NotFoundError, ConflictError, ValidationError, RateLimitError, ServerError } from '../src/errors.js'

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
      await expect(client.get('/api/test')).rejects.toThrow(message)
    })

    it('RateLimitError includes retryAfter from header', async () => {
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

  describe('timeout', () => {
    it('aborts request after timeout', async () => {
      const timeoutClient = new BaseClient({
        baseUrl: 'http://localhost:9993',
        apiKey: 'test-key',
        timeout: 50,
        retries: 0,
      })

      timeoutClient.fetch = vi.fn().mockImplementation(() =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new DOMException('aborted', 'AbortError')), 100)
        })
      )

      await expect(timeoutClient.get('/api/test')).rejects.toThrow()
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/sdk && npx vitest run tests/client.test.js`
Expected: FAIL — cannot find module `../src/client.js`

- [ ] **Step 3: Implement client.js**

```js
// packages/sdk/src/client.js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/sdk && npx vitest run tests/client.test.js`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add packages/sdk/src/client.js packages/sdk/tests/client.test.js
git commit -m "feat: add BaseClient with auth, retries, timeout, error mapping"
```

---

### Task 4: Terminals, Windows, Panes Resources

**Files:**
- Create: `packages/sdk/src/resources/terminals.js`
- Create: `packages/sdk/tests/terminals.test.js`

- [ ] **Step 1: Write failing tests**

```js
// packages/sdk/tests/terminals.test.js
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

  it('list(terminal) calls GET /api/terminals/:t/windows', async () => {
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

  it('coerces number params to strings in URL', async () => {
    await panes.capture('s1', 2, 3)
    expect(client.get).toHaveBeenCalledWith('/api/terminals/s1/windows/2/panes/3/capture')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/sdk && npx vitest run tests/terminals.test.js`
Expected: FAIL — cannot find module

- [ ] **Step 3: Implement terminals.js**

```js
// packages/sdk/src/resources/terminals.js

export class Terminals {
  constructor(client) {
    this.client = client
    this.windows = new Windows(client)
    this.panes = new Panes(client)
  }

  list() {
    return this.client.get('/api/terminals')
  }

  create(body) {
    return this.client.post('/api/terminals', body)
  }

  update(name, body) {
    return this.client.put(`/api/terminals/${name}`, body)
  }

  delete(name) {
    return this.client.delete(`/api/terminals/${name}`)
  }
}

export class Windows {
  constructor(client) {
    this.client = client
  }

  list(terminal) {
    return this.client.get(`/api/terminals/${terminal}/windows`)
  }

  create(terminal, body) {
    return this.client.post(`/api/terminals/${terminal}/windows`, body)
  }

  update(terminal, index, body) {
    return this.client.put(`/api/terminals/${terminal}/windows/${index}`, body)
  }

  delete(terminal, index) {
    return this.client.delete(`/api/terminals/${terminal}/windows/${index}`)
  }
}

export class Panes {
  constructor(client) {
    this.client = client
  }

  list(terminal, window) {
    return this.client.get(`/api/terminals/${terminal}/windows/${window}/panes`)
  }

  split(terminal, window, body) {
    return this.client.post(`/api/terminals/${terminal}/windows/${window}/panes`, body)
  }

  resize(terminal, window, pane, body) {
    return this.client.put(`/api/terminals/${terminal}/windows/${window}/panes/${pane}/resize`, body)
  }

  delete(terminal, window, pane) {
    return this.client.delete(`/api/terminals/${terminal}/windows/${window}/panes/${pane}`)
  }

  sendKeys(terminal, window, pane, body) {
    return this.client.post(`/api/terminals/${terminal}/windows/${window}/panes/${pane}/send-keys`, body)
  }

  capture(terminal, window, pane) {
    return this.client.get(`/api/terminals/${terminal}/windows/${window}/panes/${pane}/capture`)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/sdk && npx vitest run tests/terminals.test.js`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add packages/sdk/src/resources/terminals.js packages/sdk/tests/terminals.test.js
git commit -m "feat: add Terminals, Windows, Panes resource classes"
```

---

### Task 5: Sessions Resource

**Files:**
- Create: `packages/sdk/src/resources/sessions.js`
- Create: `packages/sdk/tests/sessions.test.js`

- [ ] **Step 1: Write failing tests**

```js
// packages/sdk/tests/sessions.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/sdk && npx vitest run tests/sessions.test.js`
Expected: FAIL

- [ ] **Step 3: Implement sessions.js**

```js
// packages/sdk/src/resources/sessions.js

export class Sessions {
  constructor(client) {
    this.client = client
  }

  list() {
    return this.client.get('/api/sessions')
  }

  create(body) {
    return this.client.post('/api/sessions', body)
  }

  get(name) {
    return this.client.get(`/api/sessions/${name}`)
  }

  health(name) {
    return this.client.get(`/api/sessions/${name}/health`)
  }

  task(name, body) {
    return this.client.post(`/api/sessions/${name}/task`, body)
  }

  delete(name) {
    return this.client.delete(`/api/sessions/${name}`)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/sdk && npx vitest run tests/sessions.test.js`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add packages/sdk/src/resources/sessions.js packages/sdk/tests/sessions.test.js
git commit -m "feat: add Sessions resource class"
```

---

### Task 6: TmuxApi Entry Point

**Files:**
- Modify: `packages/sdk/src/index.js`

- [ ] **Step 1: Write failing test**

Add to a new test file or extend existing. Create `packages/sdk/tests/index.test.js`:

```js
// packages/sdk/tests/index.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/sdk && npx vitest run tests/index.test.js`
Expected: FAIL — TmuxApi is an empty class

- [ ] **Step 3: Implement index.js**

```js
// packages/sdk/src/index.js
import { BaseClient } from './client.js'
import { Terminals } from './resources/terminals.js'
import { Sessions } from './resources/sessions.js'

export {
  ApiError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServerError,
} from './errors.js'

export default class TmuxApi {
  constructor(opts) {
    const client = new BaseClient(opts)
    this.terminals = new Terminals(client)
    this.sessions = new Sessions(client)
  }
}
```

- [ ] **Step 4: Run ALL SDK tests**

Run: `cd packages/sdk && npx vitest run`
Expected: all test files PASS

- [ ] **Step 5: Commit**

```bash
git add packages/sdk/src/index.js packages/sdk/tests/index.test.js
git commit -m "feat: wire TmuxApi entry point with resource classes"
```

---

### Task 7: SDK README with Badge

**Files:**
- Create: `packages/sdk/README.md`
- Modify: `README.md` (root)

- [ ] **Step 1: Create SDK README**

```markdown
# @yaotoshi/tmux-api

[![npm](https://img.shields.io/npm/v/@yaotoshi/tmux-api)](https://www.npmjs.com/package/@yaotoshi/tmux-api)

Node.js SDK for [tmux-api](https://github.com/onchainyaotoshi/tmux-api) — control tmux sessions via REST.

## Install

```bash
npm install @yaotoshi/tmux-api
```

## Quick Start

```js
import TmuxApi from '@yaotoshi/tmux-api'

const client = new TmuxApi({
  baseUrl: 'http://localhost:9993',
  apiKey: 'your-api-key',
})

// Create a terminal session
await client.terminals.create({ name: 'worker-1' })

// Send a command
await client.terminals.panes.sendKeys('worker-1', '0', '0', {
  keys: 'echo hello world',
})

// Capture output
const output = await client.terminals.panes.capture('worker-1', '0', '0')
console.log(output.content)

// Use convenience sessions API
await client.sessions.create({
  name: 'agent-1',
  command: 'claude --chat',
})
```

## API Reference

### `new TmuxApi(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseUrl` | string | *required* | tmux-api server URL |
| `apiKey` | string | *required* | API key for authentication |
| `timeout` | number | `10000` | Request timeout (ms) |
| `retries` | number | `2` | Max retries for idempotent requests |

### Terminals — `client.terminals`

| Method | Description |
|--------|-------------|
| `.list()` | List all terminals |
| `.create({ name })` | Create a terminal |
| `.update(name, { newName })` | Rename a terminal |
| `.delete(name)` | Kill a terminal |

### Windows — `client.terminals.windows`

| Method | Description |
|--------|-------------|
| `.list(terminal)` | List windows |
| `.create(terminal, { name? })` | Create a window |
| `.update(terminal, index, { newName })` | Rename a window |
| `.delete(terminal, index)` | Kill a window |

### Panes — `client.terminals.panes`

| Method | Description |
|--------|-------------|
| `.list(terminal, window)` | List panes |
| `.split(terminal, window, { direction })` | Split pane (`"h"` or `"v"`) |
| `.resize(terminal, window, pane, { direction, amount })` | Resize pane |
| `.delete(terminal, window, pane)` | Kill a pane |
| `.sendKeys(terminal, window, pane, { keys })` | Send keys to pane |
| `.capture(terminal, window, pane)` | Capture pane output |

### Sessions — `client.sessions`

| Method | Description |
|--------|-------------|
| `.list()` | List all sessions |
| `.create({ name, command, cwd? })` | Spawn a session |
| `.get(name)` | Get session detail with output |
| `.health(name)` | Health check |
| `.task(name, { input })` | Send task to session |
| `.delete(name)` | Kill a session |

## Error Handling

```js
import TmuxApi, { ConflictError, NotFoundError } from '@yaotoshi/tmux-api'

try {
  await client.terminals.create({ name: 'worker-1' })
} catch (err) {
  if (err instanceof ConflictError) {
    console.log('Terminal already exists')
  }
  console.error(err.status, err.message)
}
```

| Error Class | Status | When |
|-------------|--------|------|
| `ValidationError` | 400 | Invalid request body |
| `AuthenticationError` | 401 | Bad API key |
| `NotFoundError` | 404 | Resource not found |
| `ConflictError` | 409 | Already exists |
| `RateLimitError` | 429 | Too many requests |
| `ServerError` | 500 | Server error |

## License

MIT
```

- [ ] **Step 2: Add badge to root README.md**

Add after the `# tmux-api` heading on line 1:

```markdown
[![npm](https://img.shields.io/npm/v/@yaotoshi/tmux-api)](https://www.npmjs.com/package/@yaotoshi/tmux-api)
```

- [ ] **Step 3: Commit**

```bash
git add packages/sdk/README.md README.md
git commit -m "docs: add SDK README with usage docs and npm badge"
```

---

### Task 8: GitHub Actions Publish Workflow

**Files:**
- Create: `.github/workflows/publish-sdk.yml`

- [ ] **Step 1: Create workflow file**

```yaml
# .github/workflows/publish-sdk.yml
name: Publish SDK to npm

on:
  push:
    tags:
      - 'sdk/v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: packages/sdk
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'

      - run: npm ci

      - run: npx vitest run

      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/publish-sdk.yml
git commit -m "ci: add GitHub Actions workflow for SDK npm publish"
```

---

### Task 9: Final Integration Test & Release

- [ ] **Step 1: Run all SDK tests from packages/sdk**

Run: `cd packages/sdk && npx vitest run`
Expected: all tests PASS (errors, client, terminals, sessions, index)

- [ ] **Step 2: Run root project tests to ensure nothing broken**

Run: `npm test`
Expected: all 74 tests PASS

- [ ] **Step 3: Test npm pack (dry run)**

Run: `cd packages/sdk && npm pack --dry-run`
Expected: shows only `src/` files + package.json + README.md. No test files.

- [ ] **Step 4: Merge to develop, release, and tag**

Follow git flow:
1. Merge feature branch to develop
2. Create `release/v0.13.0` (or appropriate version) for server changes
3. Merge to main, tag server release
4. Tag SDK: `git tag sdk/v0.1.0 && git push --tags`
5. GitHub Actions publishes to npm automatically

- [ ] **Step 5: Verify on npm**

Check: `https://www.npmjs.com/package/@yaotoshi/tmux-api`
Expected: package visible with README rendered
