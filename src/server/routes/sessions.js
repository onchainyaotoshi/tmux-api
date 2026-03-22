export async function sessionRoutes(fastify) {
  const { tmux } = fastify

  fastify.get('/sessions', {
    schema: {
      tags: ['Sessions'],
      summary: 'List all tmux sessions',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  windows: { type: 'integer' },
                  created: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
  }, async () => {
    const data = await tmux.listSessions()
    return { success: true, data }
  })

  fastify.post('/sessions', {
    schema: {
      tags: ['Sessions'],
      summary: 'Create a new session',
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 128, pattern: '^[a-zA-Z0-9_-]+$' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: { name: { type: 'string' } },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const data = await tmux.createSession(request.body.name)
    reply.code(201)
    return { success: true, data }
  })

  fastify.put('/sessions/:name', {
    schema: {
      tags: ['Sessions'],
      summary: 'Rename a session',
      params: {
        type: 'object',
        properties: { name: { type: 'string' } },
      },
      body: {
        type: 'object',
        required: ['newName'],
        properties: {
          newName: { type: 'string', minLength: 1, maxLength: 128, pattern: '^[a-zA-Z0-9_-]+$' },
        },
      },
    },
  }, async (request) => {
    await tmux.renameSession(request.params.name, request.body.newName)
    return { success: true, data: { name: request.body.newName } }
  })

  fastify.delete('/sessions/:name', {
    schema: {
      tags: ['Sessions'],
      summary: 'Kill a session',
      params: {
        type: 'object',
        properties: { name: { type: 'string' } },
      },
    },
  }, async (request) => {
    await tmux.killSession(request.params.name)
    return { success: true, data: null }
  })
}
