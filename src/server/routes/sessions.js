const namePattern = '^[a-zA-Z0-9_-]+$'

export async function sessionRoutes(fastify) {
  const { sessionService } = fastify

  // POST /api/sessions — spawn session
  fastify.post('/sessions', {
    schema: {
      tags: ['Sessions'],
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
    },
  }, async (request, reply) => {
    try {
      const { name, command, cwd } = request.body
      const data = await sessionService.spawn(name, command, cwd)
      reply.code(201)
      return { success: true, data }
    } catch (err) {
      if (err.message.includes('already exists')) {
        reply.code(409)
      } else {
        reply.code(500)
      }
      return { success: false, error: err.message }
    }
  })

  // GET /api/sessions — list sessions
  fastify.get('/sessions', {
    schema: {
      tags: ['Sessions'],
      summary: 'List all managed sessions',
    },
  }, async () => {
    const data = await sessionService.list()
    return { success: true, data }
  })

  // GET /api/sessions/:name — session detail
  fastify.get('/sessions/:name', {
    schema: {
      tags: ['Sessions'],
      summary: 'Get session detail with output',
      params: {
        type: 'object',
        properties: { name: { type: 'string', pattern: namePattern } },
      },
    },
  }, async (request, reply) => {
    try {
      const { name } = request.params
      const health = await sessionService.health(name)
      if (!health.alive) {
        reply.code(404)
        return { success: false, error: `Session not found: ${name}` }
      }
      const output = await sessionService.getOutput(name)
      return { success: true, data: { ...health, output } }
    } catch (err) {
      reply.code(404)
      return { success: false, error: err.message }
    }
  })

  // POST /api/sessions/:name/task — send task
  fastify.post('/sessions/:name/task', {
    schema: {
      tags: ['Sessions'],
      summary: 'Send task to session',
      params: {
        type: 'object',
        properties: { name: { type: 'string', pattern: namePattern } },
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
      const { name } = request.params
      await sessionService.sendTask(name, request.body.input)
      return { success: true, data: { name, task_sent: true } }
    } catch (err) {
      if (err.message.includes('not found')) {
        reply.code(404)
      } else {
        reply.code(500)
      }
      return { success: false, error: err.message }
    }
  })

  // DELETE /api/sessions/:name — kill session
  fastify.delete('/sessions/:name', {
    schema: {
      tags: ['Sessions'],
      summary: 'Kill a session',
      params: {
        type: 'object',
        properties: { name: { type: 'string', pattern: namePattern } },
      },
    },
  }, async (request, reply) => {
    try {
      await sessionService.kill(request.params.name)
      return { success: true, data: { name: request.params.name, killed: true } }
    } catch (err) {
      if (err.message.includes('not found')) {
        reply.code(404)
      } else {
        reply.code(500)
      }
      return { success: false, error: err.message }
    }
  })

  // GET /api/sessions/:name/health — health check
  fastify.get('/sessions/:name/health', {
    schema: {
      tags: ['Sessions'],
      summary: 'Health check single session',
      params: {
        type: 'object',
        properties: { name: { type: 'string', pattern: namePattern } },
      },
    },
  }, async (request, reply) => {
    try {
      const data = await sessionService.health(request.params.name)
      return { success: true, data }
    } catch (err) {
      reply.code(404)
      return { success: false, error: err.message }
    }
  })
}
