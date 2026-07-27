import { healthRoutes } from './health.js'
import { practiceRoutes } from './practice.js'
import { audioRoutes } from './audio.js'
import { authRoutes } from './auth.js'

/**
 * @param {import('fastify').FastifyInstance} app
 */
export const registerRoutes = async (app) => {
  void app.register(healthRoutes)
  void app.register(practiceRoutes)
  void app.register(audioRoutes)
  void app.register(authRoutes)
}
