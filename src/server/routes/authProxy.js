export async function authProxyRoutes(fastify) {
  async function proxyRequest(accountsPath, request, reply) {
    const accountsUrl = process.env.AUTH_ACCOUNTS_URL
    if (!accountsUrl) {
      return reply.code(503).send({ success: false, error: 'Auth not configured' })
    }

    try {
      const headers = {}
      if (request.headers['content-type']) headers['Content-Type'] = request.headers['content-type']
      if (request.headers.authorization) headers['Authorization'] = request.headers.authorization

      const options = { method: request.method, headers }
      if (request.method === 'POST' && request.body) {
        options.body = JSON.stringify(request.body)
      }

      const res = await fetch(`${accountsUrl}${accountsPath}`, options)
      const body = await res.text()

      reply.header('Content-Type', 'application/json').code(res.status).send(body)
    } catch {
      reply.code(502).send({ success: false, error: 'Authentication service unavailable' })
    }
  }

  fastify.post('/token', async (request, reply) => proxyRequest('/api/proxy/token', request, reply))
  fastify.get('/me', async (request, reply) => proxyRequest('/api/proxy/me', request, reply))
  fastify.post('/logout', async (request, reply) => proxyRequest('/api/proxy/logout', request, reply))
}
