export const healthRoutes = async (app) => {
  app.get(
    '/health',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['ok'] },
              phase: { type: 'integer', minimum: 1 },
            },
            required: ['status', 'phase'],
          },
        },
      },
    },
    async (_req, reply) => {
      return reply.code(200).send({ status: 'ok', phase: 1 })
    },
  )
}
