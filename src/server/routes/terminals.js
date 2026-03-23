export async function terminalRoutes(fastify) {
  const { terminal } = fastify

  fastify.get('/terminals', {
    schema: {
      tags: ['Terminals'],
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
      tags: ['Terminals'],
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
      tags: ['Terminals'],
      summary: 'Rename a terminal',
      params: {
        type: 'object',
        properties: { terminal: { type: 'string', pattern: '^[a-zA-Z0-9_-]+$' } },
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

  fastify.post('/terminals/:terminal/set-environment', {
    schema: {
      tags: ['L1 — Terminal'],
      summary: 'Set environment variable on terminal session',
      params: {
        type: 'object',
        properties: {
          terminal: { type: 'string', pattern: '^[a-zA-Z0-9_-]+$' },
        },
      },
      body: {
        type: 'object',
        required: ['key', 'value'],
        properties: {
          key: { type: 'string', minLength: 1, maxLength: 256, pattern: '^[a-zA-Z_][a-zA-Z0-9_]*$' },
          value: { type: 'string', maxLength: 4096 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                terminal: { type: 'string' },
                key: { type: 'string' },
                set: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
  }, async (request) => {
    const { terminal: terminalName } = request.params
    const { key, value } = request.body
    await terminal.setEnvironment(terminalName, key, value)
    return { success: true, data: { terminal: terminalName, key, set: true } }
  })

  fastify.delete('/terminals/:terminal', {
    schema: {
      tags: ['Terminals'],
      summary: 'Kill a terminal',
      params: {
        type: 'object',
        properties: { terminal: { type: 'string', pattern: '^[a-zA-Z0-9_-]+$' } },
      },
    },
  }, async (request) => {
    await terminal.killSession(request.params.terminal)
    return { success: true, data: null }
  })
}
