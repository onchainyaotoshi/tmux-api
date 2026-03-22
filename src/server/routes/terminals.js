export async function terminalRoutes(fastify) {
  const { terminal } = fastify

  fastify.get('/terminals', {
    schema: {
      tags: ['L1 — Terminal (Low-level)'],
      summary: 'List all terminals',
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
    const data = await terminal.listSessions()
    return { success: true, data }
  })

  fastify.post('/terminals', {
    schema: {
      tags: ['L1 — Terminal (Low-level)'],
      summary: 'Create a new terminal',
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
    const data = await terminal.createSession(request.body.name)
    reply.code(201)
    return { success: true, data }
  })

  fastify.put('/terminals/:terminal', {
    schema: {
      tags: ['L1 — Terminal (Low-level)'],
      summary: 'Rename a terminal',
      params: {
        type: 'object',
        properties: { terminal: { type: 'string' } },
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
    await terminal.renameSession(request.params.terminal, request.body.newName)
    return { success: true, data: { name: request.body.newName } }
  })

  fastify.delete('/terminals/:terminal', {
    schema: {
      tags: ['L1 — Terminal (Low-level)'],
      summary: 'Kill a terminal',
      params: {
        type: 'object',
        properties: { terminal: { type: 'string' } },
      },
    },
  }, async (request) => {
    await terminal.killSession(request.params.terminal)
    return { success: true, data: null }
  })
}
