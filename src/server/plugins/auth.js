import fp from 'fastify-plugin'

async function auth(fastify, opts) {
  const apiKey = opts.apiKey
  const authAccountsUrl = opts.authAccountsUrl

  fastify.addHook('onRequest', async (request, reply) => {
    if (!request.url.startsWith('/api/')) return

    // Events endpoint uses per-session token auth, not API key
    if (request.method === 'POST' && /^\/api\/sessions\/[^/]+\/events(\?|$)/.test(request.url)) return

    // Try API key first
    const providedKey = request.headers['x-api-key']
    if (providedKey && providedKey === apiKey) return

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
