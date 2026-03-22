import fp from 'fastify-plugin'

async function auth(fastify, opts) {
  const apiKey = opts.apiKey

  fastify.addHook('onRequest', async (request, reply) => {
    if (!request.url.startsWith('/api/')) return

    const provided = request.headers['x-api-key']
    if (!provided || provided !== apiKey) {
      reply.code(401).send({ success: false, error: 'Missing or invalid API key' })
    }
  })
}

export const authPlugin = fp(auth, { name: 'auth' })
