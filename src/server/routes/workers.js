const namePattern = '^[a-zA-Z0-9_-]+$'

const workerSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    command: { type: 'string' },
    status: { type: 'string' },
    current_task: { type: ['string', 'null'] },
    created_at: { type: 'string' },
    updated_at: { type: 'string' },
  },
}

export async function workerRoutes(fastify) {
  const { workerService } = fastify

  // POST /api/workers — spawn worker
  fastify.post('/workers', {
    schema: {
      tags: ['Workers'],
      summary: 'Spawn a new worker',
      body: {
        type: 'object',
        required: ['name', 'command'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 128, pattern: namePattern },
          command: { type: 'string', minLength: 1, maxLength: 4096 },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: workerSchema,
          },
        },
      },
    },
  }, async (request, reply) => {
    const { name, command } = request.body
    const data = await workerService.spawn(name, command)
    reply.code(201)
    return { success: true, data }
  })

  // GET /api/workers — list workers
  fastify.get('/workers', {
    schema: {
      tags: ['Workers'],
      summary: 'List all workers',
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['spawning', 'idle', 'running', 'failed', 'stopped'] },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array', items: workerSchema },
          },
        },
      },
    },
  }, async (request) => {
    const data = workerService.list(request.query.status)
    return { success: true, data }
  })

  // GET /api/workers/:id — worker detail
  fastify.get('/workers/:id', {
    schema: {
      tags: ['Workers'],
      summary: 'Get worker detail with output',
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
                ...workerSchema.properties,
                output: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const data = await workerService.get(request.params.id)
      return { success: true, data }
    } catch (err) {
      reply.code(404)
      return { success: false, error: err.message }
    }
  })

  // POST /api/workers/:id/task — send task
  fastify.post('/workers/:id/task', {
    schema: {
      tags: ['Workers'],
      summary: 'Send task to worker',
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
      const data = await workerService.sendTask(request.params.id, request.body.input)
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

  // DELETE /api/workers/:id — kill worker
  fastify.delete('/workers/:id', {
    schema: {
      tags: ['Workers'],
      summary: 'Kill a worker',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    try {
      const data = await workerService.kill(request.params.id)
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

  // GET /api/workers/:id/health — single worker health
  fastify.get('/workers/:id/health', {
    schema: {
      tags: ['Workers'],
      summary: 'Health check single worker',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    try {
      const data = await workerService.checkHealth(request.params.id)
      return { success: true, data }
    } catch (err) {
      reply.code(404)
      return { success: false, error: err.message }
    }
  })
}
