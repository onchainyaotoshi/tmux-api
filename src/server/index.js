import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import rateLimit from '@fastify/rate-limit'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync } from 'node:fs'
import 'dotenv/config'

import { TerminalService } from './services/terminal.js'
import { SessionService } from './services/session.js'
import { authPlugin } from './plugins/auth.js'
import { swaggerSetup } from './plugins/swagger.js'
import { terminalRoutes } from './routes/terminals.js'
import { windowRoutes } from './routes/windows.js'
import { paneRoutes } from './routes/panes.js'
import { sessionRoutes } from './routes/sessions.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = parseInt(process.env.PORT || '9993', 10)
const API_KEY = process.env.API_KEY
const AUTH_ACCOUNTS_URL = process.env.AUTH_ACCOUNTS_URL
const SWAGGER_ENABLED = process.env.SWAGGER_ENABLED !== 'false'
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '100', 10)

if (!API_KEY) {
  console.error('ERROR: API_KEY must be set in .env')
  process.exit(1)
}

const app = Fastify({ logger: true })

// Decorate with services
const terminal = new TerminalService()
app.decorate('terminal', terminal)
app.decorate('sessionService', new SessionService(terminal))

// Global error handler for tmux errors
app.setErrorHandler((error, request, reply) => {
  const statusCode = reply.statusCode >= 400 ? reply.statusCode : 500
  reply.code(statusCode).send({
    success: false,
    error: error.message,
  })
})

// Plugins
await app.register(swaggerSetup, { enabled: SWAGGER_ENABLED })
await app.register(authPlugin, { apiKey: API_KEY, authAccountsUrl: AUTH_ACCOUNTS_URL })
if (RATE_LIMIT_MAX > 0) {
  await app.register(rateLimit, {
    max: RATE_LIMIT_MAX,
    timeWindow: '1 minute',
    keyGenerator: (request) => request.headers['x-api-key'] || request.headers['authorization'] || request.ip,
    hook: 'onRequest',
    allowList: [],
  })
}

// API routes
await app.register(terminalRoutes, { prefix: '/api' })
await app.register(windowRoutes, { prefix: '/api' })
await app.register(paneRoutes, { prefix: '/api' })
await app.register(sessionRoutes, { prefix: '/api' })

// Serve static frontend (only if dist/ exists)
const distPath = join(__dirname, '../../dist')
if (existsSync(distPath)) {
  await app.register(fastifyStatic, {
    root: distPath,
    wildcard: false,
  })

  // SPA fallback
  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith('/api/')) {
      reply.code(404).send({ success: false, error: 'Route not found' })
    } else {
      reply.sendFile('index.html')
    }
  })
}

// Start server
try {
  await app.listen({ port: PORT, host: '0.0.0.0' })
  console.log(`tmux-api running on port ${PORT}`)
  if (SWAGGER_ENABLED) {
    console.log(`Swagger UI: http://localhost:${PORT}/docs`)
  }
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
