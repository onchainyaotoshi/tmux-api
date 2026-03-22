export async function healthRoutes(fastify) {
  const { sessionService } = fastify

  fastify.get('/health/sessions', {
    schema: {
      tags: ['L2 — Session'],
      summary: 'Health check all sessions',
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
                  id: { type: 'string' },
                  name: { type: 'string' },
                  status: { type: 'string' },
                  alive: { type: 'boolean' },
                  last_activity_at: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  }, async () => {
    const data = await sessionService.checkAllHealth()
    return { success: true, data }
  })
}
