export async function windowRoutes(fastify) {
  const { terminal } = fastify

  const terminalParam = {
    type: 'object',
    properties: { terminal: { type: 'string', pattern: '^[a-zA-Z0-9_-]+$' } },
  }

  const terminalWindowParams = {
    type: 'object',
    properties: {
      terminal: { type: 'string', pattern: '^[a-zA-Z0-9_-]+$' },
      index: { type: 'string', pattern: '^\\d+$' },
    },
  }

  fastify.get('/terminals/:terminal/windows', {
    schema: {
      tags: ['Windows'],
      summary: 'List windows in a terminal',
      params: terminalParam,
    },
  }, async (request) => {
    const data = await terminal.listWindows(request.params.terminal)
    return { success: true, data }
  })

  fastify.post('/terminals/:terminal/windows', {
    schema: {
      tags: ['Windows'],
      summary: 'Create a new window',
      params: terminalParam,
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', maxLength: 128, pattern: '^[a-zA-Z0-9_-]+$' },
        },
      },
    },
  }, async (request, reply) => {
    await terminal.createWindow(request.params.terminal, request.body?.name)
    reply.code(201)
    return { success: true, data: null }
  })

  fastify.put('/terminals/:terminal/windows/:index', {
    schema: {
      tags: ['Windows'],
      summary: 'Rename a window',
      params: terminalWindowParams,
      body: {
        type: 'object',
        required: ['newName'],
        properties: {
          newName: { type: 'string', minLength: 1, maxLength: 128, pattern: '^[a-zA-Z0-9_-]+$' },
        },
      },
    },
  }, async (request) => {
    const { terminal: terminalName, index } = request.params
    await terminal.renameWindow(terminalName, parseInt(index, 10), request.body.newName)
    return { success: true, data: null }
  })

  fastify.delete('/terminals/:terminal/windows/:index', {
    schema: {
      tags: ['Windows'],
      summary: 'Kill a window',
      params: terminalWindowParams,
    },
  }, async (request) => {
    const { terminal: terminalName, index } = request.params
    await terminal.killWindow(terminalName, parseInt(index, 10))
    return { success: true, data: null }
  })
}
