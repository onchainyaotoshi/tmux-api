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
| `.setEnvironment(terminal, { key, value })` | Set environment variable (not visible in pane) |

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
