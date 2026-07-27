import { healthRoutes } from './health.js'
import { practiceRoutes } from './practice.js'
import { audioRoutes } from './audio.js'
import { authRoutes } from './auth.js'
import { adminRoutes } from './admin.js'
import { questionRoutes } from './questions.js'
import { examRoutes } from './exams.js'
import { studentRoutes } from './student.js'
import { teacherRoutes } from './teacher.js'

/**
 * @param {import('fastify').FastifyInstance} app
 */
export const registerRoutes = async (app) => {
  void app.register(healthRoutes)
  void app.register(practiceRoutes)
  void app.register(audioRoutes)
  void app.register(authRoutes)
  void app.register(adminRoutes)
  void app.register(questionRoutes)
  void app.register(examRoutes)
  void app.register(studentRoutes)
  void app.register(teacherRoutes)
}
