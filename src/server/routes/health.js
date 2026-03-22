export async function healthRoutes(fastify) {
  const { workerService } = fastify

  fastify.get('/health/workers', {
    schema: {
      tags: ['Health'],
      summary: 'Health check all workers',
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
    const data = await workerService.checkAllHealth()
    return { success: true, data }
  })
}
