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
        {
          name: 'L1 — Terminal (Low-level)',
          description: 'Direct tmux terminal, window, and pane management.',
        },
        {
          name: 'L2 — Session',
          description: 'Stateless convenience wrapper over L1 terminals.',
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

  await fastify.register(scalarUi, {
    routePrefix: '/docs',
  })
}

export const swaggerSetup = fp(swaggerPlugin, { name: 'swagger' })
