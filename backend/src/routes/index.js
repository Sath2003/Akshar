import { healthRoutes } from './health.js'

export const registerRoutes = async (app) => {
  void app.register(healthRoutes)
}
