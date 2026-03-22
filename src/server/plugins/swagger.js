import fp from 'fastify-plugin'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

async function swaggerPlugin(fastify, opts) {
  if (opts.enabled === false) return

  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Tmux Management API',
        description: 'REST API for controlling tmux sessions, windows, and panes',
        version: '1.0.0',
      },
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
