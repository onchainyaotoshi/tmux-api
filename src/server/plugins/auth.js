import fp from 'fastify-plugin'
import { timingSafeEqual } from 'node:crypto'

async function auth(fastify, opts) {
  const apiKey = opts.apiKey
  const authAccountsUrl = opts.authAccountsUrl

  fastify.addHook('onRequest', async (request, reply) => {
    if (!request.url.startsWith('/api/')) return

    // Try API key first (timing-safe comparison)
    const providedKey = request.headers['x-api-key']
    if (providedKey && typeof providedKey === 'string' && providedKey.length === apiKey.length) {
      const a = Buffer.from(providedKey)
      const b = Buffer.from(apiKey)
      if (timingSafeEqual(a, b)) return
    }

    // Try Bearer token
    const authHeader = request.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ') && authAccountsUrl) {
      try {
        const res = await fetch(`${authAccountsUrl}/api/proxy/me`, {
          headers: { authorization: authHeader },
        })
        if (res.ok) return
      } catch {
        // Fall through to 401
      }
    }

    reply.code(401).send({ success: false, error: 'Unauthorized' })
  })
}

export const authPlugin = fp(auth, { name: 'auth' })
