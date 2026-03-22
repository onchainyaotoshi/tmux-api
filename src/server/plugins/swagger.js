import fp from 'fastify-plugin'
import swagger from '@fastify/swagger'
import scalarUi from '@scalar/fastify-api-reference'

async function swaggerPlugin(fastify, opts) {
  if (opts.enabled === false) return

  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'tmux-api',
        description: 'Stateless REST API for controlling tmux remotely',
        version: '0.12.0',
      },
      tags: [
        { name: 'Terminals', description: 'Tmux session management' },
        { name: 'Windows', description: 'Window management within terminals' },
        { name: 'Panes', description: 'Pane management, send-keys, and capture' },
        { name: 'Sessions', description: 'Convenience wrapper for common session operations' },
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

  await fastify.register(scalarUi, {
    routePrefix: '/docs',
  })
}

export const swaggerSetup = fp(swaggerPlugin, { name: 'swagger' })
