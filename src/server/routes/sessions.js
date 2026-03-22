const namePattern = '^[a-zA-Z0-9_-]+$'

const sessionSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    command: { type: 'string' },
    cwd: { type: ['string', 'null'] },
    event_token: { type: ['string', 'null'] },
    status: { type: 'string' },
    current_task: { type: ['string', 'null'] },
    created_at: { type: 'string' },
    updated_at: { type: 'string' },
  },
}

export async function sessionRoutes(fastify) {
  const { sessionService } = fastify

  // POST /api/sessions — spawn session
  fastify.post('/sessions', {
    schema: {
      tags: ['L2 — Session'],
      summary: 'Spawn a new session',
      body: {
        type: 'object',
        required: ['name', 'command'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 128, pattern: namePattern },
          command: { type: 'string', minLength: 1, maxLength: 4096 },
          cwd: { type: 'string', pattern: '^/', maxLength: 4096 },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: sessionSchema,
          },
        },
      },
    },
  }, async (request, reply) => {
    const { name, command, cwd } = request.body
    const data = await sessionService.spawn(name, command, cwd)
    reply.code(201)
    return { success: true, data }
  })

  // GET /api/sessions — list sessions
  fastify.get('/sessions', {
    schema: {
      tags: ['L2 — Session'],
      summary: 'List all sessions',
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['spawning', 'idle', 'running', 'waiting_input', 'error', 'failed', 'stopped'] },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array', items: sessionSchema },
          },
        },
      },
    },
  }, async (request) => {
    const data = sessionService.list(request.query.status)
    return { success: true, data }
  })

  // GET /api/sessions/:id — session detail
  fastify.get('/sessions/:id', {
    schema: {
      tags: ['L2 — Session'],
      summary: 'Get session detail with output',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                ...sessionSchema.properties,
                output: { type: 'string' },
                last_event: {
                  type: ['object', 'null'],
                  properties: {
                    id: { type: 'string' },
                    type: { type: 'string' },
                    data: {},
                    created_at: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const data = await sessionService.get(request.params.id)
      return { success: true, data }
    } catch (err) {
      reply.code(404)
      return { success: false, error: err.message }
    }
  })

  // POST /api/sessions/:id/task — send task
  fastify.post('/sessions/:id/task', {
    schema: {
      tags: ['L2 — Session'],
      summary: 'Send task to session',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      body: {
        type: 'object',
        required: ['input'],
        properties: {
          input: { type: 'string', minLength: 1, maxLength: 4096 },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const data = await sessionService.sendTask(request.params.id, request.body.input)
      return { success: true, data }
    } catch (err) {
      if (err.message.includes('not found')) {
        reply.code(404)
      } else if (err.message.includes('stopped') || err.message.includes('failed')) {
        reply.code(409)
      }
      return { success: false, error: err.message }
    }
  })

  // DELETE /api/sessions/:id — kill session
  fastify.delete('/sessions/:id', {
    schema: {
      tags: ['L2 — Session'],
      summary: 'Kill a session',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    try {
      const data = await sessionService.kill(request.params.id)
      return { success: true, data }
    } catch (err) {
      if (err.message.includes('not found')) {
        reply.code(404)
      } else if (err.message.includes('already stopped')) {
        reply.code(409)
      }
      return { success: false, error: err.message }
    }
  })

  // GET /api/sessions/:id/health — single session health
  fastify.get('/sessions/:id/health', {
    schema: {
      tags: ['L2 — Session'],
      summary: 'Health check single session',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    try {
      const data = await sessionService.checkHealth(request.params.id)
      return { success: true, data }
    } catch (err) {
      reply.code(404)
      return { success: false, error: err.message }
    }
  })
}
