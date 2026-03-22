import fp from 'fastify-plugin'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

async function swaggerPlugin(fastify, opts) {
  if (opts.enabled === false) return

  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Foreman API',
        description: 'REST API for managing AI agent sessions via tmux terminals',
        version: '1.0.0',
      },
      tags: [
        {
          name: 'L1 — Terminal (Low-level)',
          description: 'Direct tmux terminal, window, and pane management. Use L2 Session endpoints for most use cases.',
        },
        {
          name: 'L2 — Session',
          description: 'Managed session instances with state tracking, events, and lifecycle management.',
        },
      ],
      components: {
        securitySchemes: {
          apiKey: {
            type: 'apiKey',
            name: 'X-API-Key',
            in: 'header',
          },
        },
      },
      security: [{ apiKey: [] }],
    },
  })

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
  })
}

export const swaggerSetup = fp(swaggerPlugin, { name: 'swagger' })
