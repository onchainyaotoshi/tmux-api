export async function windowRoutes(fastify) {
  const { tmux } = fastify

  const sessionParam = {
    type: 'object',
    properties: { session: { type: 'string' } },
  }

  const sessionWindowParams = {
    type: 'object',
    properties: {
      session: { type: 'string' },
      index: { type: 'string' },
    },
  }

  fastify.get('/sessions/:session/windows', {
    schema: {
      tags: ['Windows'],
      summary: 'List windows in a session',
      params: sessionParam,
    },
  }, async (request) => {
    const data = await tmux.listWindows(request.params.session)
    return { success: true, data }
  })

  fastify.post('/sessions/:session/windows', {
    schema: {
      tags: ['Windows'],
      summary: 'Create a new window',
      params: sessionParam,
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', maxLength: 128, pattern: '^[a-zA-Z0-9_-]+$' },
        },
      },
    },
  }, async (request, reply) => {
    await tmux.createWindow(request.params.session, request.body?.name)
    reply.code(201)
    return { success: true, data: null }
  })

  fastify.put('/sessions/:session/windows/:index', {
    schema: {
      tags: ['Windows'],
      summary: 'Rename a window',
      params: sessionWindowParams,
      body: {
        type: 'object',
        required: ['newName'],
        properties: {
          newName: { type: 'string', minLength: 1, maxLength: 128, pattern: '^[a-zA-Z0-9_-]+$' },
        },
      },
    },
  }, async (request) => {
    const { session, index } = request.params
    await tmux.renameWindow(session, parseInt(index, 10), request.body.newName)
    return { success: true, data: null }
  })

  fastify.delete('/sessions/:session/windows/:index', {
    schema: {
      tags: ['Windows'],
      summary: 'Kill a window',
      params: sessionWindowParams,
    },
  }, async (request) => {
    const { session, index } = request.params
    await tmux.killWindow(session, parseInt(index, 10))
    return { success: true, data: null }
  })
}
