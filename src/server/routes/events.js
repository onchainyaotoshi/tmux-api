const HOOK_NAME_MAP = {
  Notification: 'notification',
  Stop: 'stop',
  StopFailure: 'stop_failure',
  PreToolUse: 'tool_use',
}

export async function eventRoutes(fastify) {
  const { sessionService } = fastify

  // POST /api/sessions/:id/events — receive event (token auth, no API key)
  fastify.post('/sessions/:id/events', {
    schema: {
      tags: ['L2 — Session'],
      summary: 'Report session event (token auth)',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      querystring: {
        type: 'object',
        properties: { token: { type: 'string' } },
      },
      body: {
        type: 'object',
        properties: {
          type: { type: 'string', minLength: 1, maxLength: 256 },
          hook_event_name: { type: 'string' },
          data: { type: 'object' },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params
    const token = request.query.token

    if (!token) {
      reply.code(403)
      return { success: false, error: 'Missing event token' }
    }

    // Normalize hook_event_name from Claude Code hooks
    let type = request.body.type
    if (!type && request.body.hook_event_name) {
      type = HOOK_NAME_MAP[request.body.hook_event_name] || request.body.hook_event_name.toLowerCase()
    }
    if (!type) {
      reply.code(400)
      return { success: false, error: 'Missing type or hook_event_name' }
    }

    // Extract data — for hook payloads, the entire body IS the data (minus type fields)
    let data = request.body.data || null
    if (!data && request.body.hook_event_name) {
      const { type: _t, hook_event_name: _h, ...rest } = request.body
      data = Object.keys(rest).length > 0 ? rest : null
    }

    // Check data size (8KB max)
    if (data && JSON.stringify(data).length > 8192) {
      reply.code(400)
      return { success: false, error: 'Event data exceeds 8KB limit' }
    }

    try {
      const event = await sessionService.processEvent(id, type, data, token)
      reply.code(201)
      return { success: true, data: event }
    } catch (err) {
      if (err.message.includes('not found')) {
        reply.code(404)
      } else if (err.message.includes('Invalid event token')) {
        reply.code(403)
      }
      return { success: false, error: err.message }
    }
  })

  // GET /api/sessions/:id/events — list events (API key auth)
  fastify.get('/sessions/:id/events', {
    schema: {
      tags: ['L2 — Session'],
      summary: 'List session events',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
        },
      },
    },
  }, async (request) => {
    const data = sessionService.getEvents(request.params.id, request.query.limit)
    return { success: true, data }
  })
}
