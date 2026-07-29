import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import cookie from '@fastify/cookie'

import authPlugin from './plugins/auth.js'
import { registerRoutes } from './routes/index.js'
import { initCronJobs } from './services/notifications/cron-service.js'

/**
 * Build and configure the Fastify application.
 * @param {ReturnType<import('./env.js').parseEnv>} env
 */
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
    genReqId: () => crypto.randomUUID(),
  })

  // Expose env on app instance so routes can access config
  app.decorate('env', env)

  void app.register(helmet, {
    contentSecurityPolicy: false,
  })

  void app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  })

  // Register cookie parser EXACTLY ONCE
  void app.register(cookie, {
    secret: env.SESSION_SECRET,
  })

  // Register authorization plugin containing shared decorators
  void app.register(authPlugin)

  // Global rate limit
  void app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
    errorResponseBuilder: (_request, context) => ({
      error: `Rate limit exceeded. Retry after ${context.after}.`,
    }),
  })

  void app.register(registerRoutes, { prefix: '/api/v1' })

  initCronJobs(app)

  return app
}
