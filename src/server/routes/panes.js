export async function paneRoutes(fastify) {
  const { tmux } = fastify

  const paneParams = {
    type: 'object',
    properties: {
      session: { type: 'string' },
      window: { type: 'string' },
    },
  }

  const paneIndexParams = {
    type: 'object',
    properties: {
      session: { type: 'string' },
      window: { type: 'string' },
      index: { type: 'string' },
    },
  }

  fastify.get('/sessions/:session/windows/:window/panes', {
    schema: {
      tags: ['Panes'],
      summary: 'List panes in a window',
      params: paneParams,
    },
  }, async (request) => {
    const { session, window } = request.params
    const data = await tmux.listPanes(session, parseInt(window, 10))
    return { success: true, data }
  })

  fastify.post('/sessions/:session/windows/:window/panes', {
    schema: {
      tags: ['Panes'],
      summary: 'Split pane',
      params: paneParams,
      body: {
        type: 'object',
        required: ['direction'],
        properties: {
          direction: { type: 'string', enum: ['h', 'v'] },
        },
      },
    },
  }, async (request, reply) => {
    const { session, window } = request.params
    await tmux.splitPane(session, parseInt(window, 10), request.body.direction)
    reply.code(201)
    return { success: true, data: null }
  })

  fastify.put('/sessions/:session/windows/:window/panes/:index/resize', {
    schema: {
      tags: ['Panes'],
      summary: 'Resize a pane',
      params: paneIndexParams,
      body: {
        type: 'object',
        required: ['direction', 'amount'],
        properties: {
          direction: { type: 'string', enum: ['U', 'D', 'L', 'R'] },
          amount: { type: 'integer', minimum: 1 },
        },
      },
    },
  }, async (request) => {
    const { session, window, index } = request.params
    const { direction, amount } = request.body
    await tmux.resizePane(session, parseInt(window, 10), parseInt(index, 10), direction, amount)
    return { success: true, data: null }
  })

  fastify.delete('/sessions/:session/windows/:window/panes/:index', {
    schema: {
      tags: ['Panes'],
      summary: 'Kill a pane',
      params: paneIndexParams,
    },
  }, async (request) => {
    const { session, window, index } = request.params
    await tmux.killPane(session, parseInt(window, 10), parseInt(index, 10))
    return { success: true, data: null }
  })

  fastify.post('/sessions/:session/windows/:window/panes/:index/send-keys', {
    schema: {
      tags: ['Panes'],
      summary: 'Send keys to a pane',
      params: paneIndexParams,
      body: {
        type: 'object',
        required: ['keys'],
        properties: {
          keys: { type: 'string', maxLength: 4096 },
        },
      },
    },
  }, async (request) => {
    const { session, window, index } = request.params
    await tmux.sendKeys(session, parseInt(window, 10), parseInt(index, 10), request.body.keys)
    return { success: true, data: null }
  })

  fastify.get('/sessions/:session/windows/:window/panes/:index/capture', {
    schema: {
      tags: ['Panes'],
      summary: 'Capture pane output',
      params: paneIndexParams,
    },
  }, async (request) => {
    const { session, window, index } = request.params
    const content = await tmux.capturePane(session, parseInt(window, 10), parseInt(index, 10))
    return { success: true, data: { content } }
  })
}
