const namePattern = '^[a-zA-Z0-9_-]+$'

const agentSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    command: { type: 'string' },
    cwd: { type: ['string', 'null'] },
    description: { type: ['string', 'null'] },
    env: { type: ['object', 'null'], additionalProperties: { type: 'string' } },
    active_sessions: { type: 'number' },
    created_at: { type: 'string' },
    updated_at: { type: 'string' },
  },
}

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

export async function agentRoutes(fastify) {
  const { agentService } = fastify

  // GET /api/agents — list all agents
  fastify.get('/agents', {
    schema: {
      tags: ['L3 — Agent'],
      summary: 'List all agents',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array', items: agentSchema },
          },
        },
      },
    },
  }, async () => {
    const data = agentService.list()
    return { success: true, data }
  })

  // POST /api/agents — create agent
  fastify.post('/agents', {
    schema: {
      tags: ['L3 — Agent'],
      summary: 'Create an agent',
      body: {
        type: 'object',
        required: ['name', 'command'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 128, pattern: namePattern },
          command: { type: 'string', minLength: 1, maxLength: 4096 },
          cwd: { type: 'string', pattern: '^/', maxLength: 4096 },
          description: { type: 'string', maxLength: 1024 },
          env: { type: 'object', additionalProperties: { type: 'string' } },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: agentSchema,
          },
        },
      },
    },
  }, async (request, reply) => {
    const { name, command, cwd, description, env } = request.body
    const data = agentService.create(name, command, cwd, description, env)
    reply.code(201)
    return { success: true, data }
  })

  // GET /api/agents/:id — get agent detail
  fastify.get('/agents/:id', {
    schema: {
      tags: ['L3 — Agent'],
      summary: 'Get agent detail',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: agentSchema,
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const data = agentService.get(request.params.id)
      return { success: true, data }
    } catch (err) {
      reply.code(404)
      return { success: false, error: err.message }
    }
  })

  // PUT /api/agents/:id — update agent
  fastify.put('/agents/:id', {
    schema: {
      tags: ['L3 — Agent'],
      summary: 'Update an agent',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 128, pattern: namePattern },
          command: { type: 'string', minLength: 1, maxLength: 4096 },
          cwd: { type: 'string', pattern: '^/', maxLength: 4096 },
          description: { type: 'string', maxLength: 1024 },
          env: { type: 'object', additionalProperties: { type: 'string' } },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: agentSchema,
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const data = agentService.update(request.params.id, request.body)
      return { success: true, data }
    } catch (err) {
      reply.code(404)
      return { success: false, error: err.message }
    }
  })

  // DELETE /api/agents/:id — delete agent
  fastify.delete('/agents/:id', {
    schema: {
      tags: ['L3 — Agent'],
      summary: 'Delete an agent',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    try {
      const data = agentService.delete(request.params.id)
      return { success: true, data }
    } catch (err) {
      if (err.message.includes('not found')) {
        reply.code(404)
      } else if (err.message.includes('active sessions')) {
        reply.code(409)
      }
      return { success: false, error: err.message }
    }
  })

  // POST /api/agents/:id/launch — launch session from agent
  fastify.post('/agents/:id/launch', {
    schema: {
      tags: ['L3 — Agent'],
      summary: 'Launch a session from agent',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 128, pattern: namePattern },
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
    try {
      const { name } = request.body || {}
      const data = await agentService.launch(request.params.id, name)
      reply.code(201)
      return { success: true, data }
    } catch (err) {
      if (err.message.includes('not found')) {
        reply.code(404)
      }
      return { success: false, error: err.message }
    }
  })

  // GET /api/agents/:id/sessions — list sessions for agent
  fastify.get('/agents/:id/sessions', {
    schema: {
      tags: ['L3 — Agent'],
      summary: 'List sessions for an agent',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
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
  }, async (request, reply) => {
    try {
      const data = agentService.listSessions(request.params.id)
      return { success: true, data }
    } catch (err) {
      reply.code(404)
      return { success: false, error: err.message }
    }
  })
}
