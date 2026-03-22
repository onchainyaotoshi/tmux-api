export async function paneRoutes(fastify) {
  const { terminal } = fastify

  const paneParams = {
    type: 'object',
    properties: {
      terminal: { type: 'string' },
      window: { type: 'string' },
    },
  }

  const paneIndexParams = {
    type: 'object',
    properties: {
      terminal: { type: 'string' },
      window: { type: 'string' },
      index: { type: 'string' },
    },
  }

  fastify.get('/terminals/:terminal/windows/:window/panes', {
    schema: {
      tags: ['Panes'],
      summary: 'List panes in a window',
      params: paneParams,
    },
  }, async (request) => {
    const { terminal: terminalName, window } = request.params
    const data = await terminal.listPanes(terminalName, parseInt(window, 10))
    return { success: true, data }
  })

  fastify.post('/terminals/:terminal/windows/:window/panes', {
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
    const { terminal: terminalName, window } = request.params
    await terminal.splitPane(terminalName, parseInt(window, 10), request.body.direction)
    reply.code(201)
    return { success: true, data: null }
  })

  fastify.put('/terminals/:terminal/windows/:window/panes/:index/resize', {
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
    const { terminal: terminalName, window, index } = request.params
    const { direction, amount } = request.body
    await terminal.resizePane(terminalName, parseInt(window, 10), parseInt(index, 10), direction, amount)
    return { success: true, data: null }
  })

  fastify.delete('/terminals/:terminal/windows/:window/panes/:index', {
    schema: {
      tags: ['Panes'],
      summary: 'Kill a pane',
      params: paneIndexParams,
    },
  }, async (request) => {
    const { terminal: terminalName, window, index } = request.params
    await terminal.killPane(terminalName, parseInt(window, 10), parseInt(index, 10))
    return { success: true, data: null }
  })

  fastify.post('/terminals/:terminal/windows/:window/panes/:index/send-keys', {
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
    const { terminal: terminalName, window, index } = request.params
    await terminal.sendKeys(terminalName, parseInt(window, 10), parseInt(index, 10), request.body.keys)
    return { success: true, data: null }
  })

  fastify.get('/terminals/:terminal/windows/:window/panes/:index/capture', {
    schema: {
      tags: ['Panes'],
      summary: 'Capture pane output',
      params: paneIndexParams,
    },
  }, async (request) => {
    const { terminal: terminalName, window, index } = request.params
    const content = await terminal.capturePane(terminalName, parseInt(window, 10), parseInt(index, 10))
    return { success: true, data: { content } }
  })
}
