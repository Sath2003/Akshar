import { AudioService } from '../services/audio/audio-service.js'

let audioService = null

/**
 * @param {import('fastify').FastifyInstance} app
 */
export const audioRoutes = async (app) => {
  // Only initialize if S3 bucket is configured
  const bucket = app.env.S3_ASSETS_BUCKET
  if (!bucket) {
    app.log.warn('S3_ASSETS_BUCKET is not set — audio route will return 503 for all requests')
  }

  if (bucket && !audioService) {
    audioService = new AudioService({
      region: app.env.AWS_REGION,
      bucket,
      audioPrefix: app.env.S3_AUDIO_PREFIX,
      ttlSeconds: app.env.S3_SIGNED_URL_TTL_SECONDS,
      logger: app.log,
    })
  }

  app.get(
    '/audio/:assetId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['assetId'],
          properties: {
            assetId: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              pattern: '^[a-z0-9-]+$',
            },
          },
          additionalProperties: false,
        },
        response: {
          200: {
            type: 'object',
            required: ['url', 'expiresIn'],
            properties: {
              url: { type: 'string' },
              expiresIn: { type: 'integer', minimum: 1 },
            },
            additionalProperties: false,
          },
          404: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          503: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (request, reply) => {
      if (!audioService) {
        return reply.code(503).send({ error: 'Audio service is not configured' })
      }

      const { assetId } = request.params

      let result
      try {
        result = await audioService.getSignedAudioUrl(assetId)
      } catch {
        // Detailed error already logged by AudioService
        return reply.code(503).send({ error: 'Audio service temporarily unavailable' })
      }

      if (result === null) {
        return reply.code(404).send({ error: `Audio asset not found: ${assetId}` })
      }

      return reply.code(200).send(result)
    },
  )
}
