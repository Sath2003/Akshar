import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'

import { registerRoutes } from './routes/index.js'

export function buildApp(env) {
  const app = Fastify({
    logger:
      env.NODE_ENV !== 'test'
        ? {
            level: env.LOG_LEVEL,
            transport:
              env.NODE_ENV === 'development'
                ? { target: 'pino-pretty', options: { colorize: true } }
                : undefined,
          }
        : false,
  })

  void app.register(helmet, {
    contentSecurityPolicy: false,
  })

  void app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  })

  void app.register(registerRoutes, { prefix: '/api/v1' })

  return app
}
