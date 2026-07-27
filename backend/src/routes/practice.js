import { AssessmentService } from '../services/assessment/assessment-service.js'
import { assessRequestSchema, assessResponseSchema } from '../services/assessment/schemas.js'

let assessmentService = null

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {object} _opts
 */
export const practiceRoutes = async (app, _opts) => {
  if (!assessmentService) {
    assessmentService = new AssessmentService()
  }

  app.post(
    '/practice/assess',
    {
      schema: {
        body: {
          type: 'object',
          required: ['questionId', 'answer', 'language', 'gradeLevel', 'answerMode'],
          properties: {
            questionId: { type: 'string', minLength: 1, maxLength: 100, pattern: '^[a-z0-9-]+$' },
            answer: { type: 'string', minLength: 1, maxLength: 500 },
            language: { type: 'string', enum: ['en', 'hi', 'kn'] },
            gradeLevel: { type: 'string', enum: ['nursery', 'lkg', 'ukg'] },
            answerMode: { type: 'string', enum: ['text', 'tap'] },
          },
          additionalProperties: false,
        },
        response: {
          200: {
            type: 'object',
            required: ['correct', 'score', 'feedback', 'gradingMethod', 'difficultyAdjustment', 'reasonCode'],
            properties: {
              correct: { type: 'boolean' },
              score: { type: 'number', minimum: 0, maximum: 1 },
              feedback: { type: 'string', maxLength: 200 },
              gradingMethod: { type: 'string', enum: ['deterministic'] },
              difficultyAdjustment: { type: 'string', enum: ['decrease', 'same', 'increase'] },
              reasonCode: { type: 'string' },
            },
            additionalProperties: false,
          },
          400: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          404: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (request, reply) => {
      const parsed = assessRequestSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid request body' })
      }

      const { questionId, answer, language, gradeLevel, answerMode } = parsed.data

      const result = await assessmentService.grade({
        questionId,
        answer,
        language,
        gradeLevel,
        answerMode,
      })

      if (result === null) {
        return reply.code(404).send({ error: `Question not found: ${questionId}` })
      }

      const validated = assessResponseSchema.safeParse(result)
      if (!validated.success) {
        request.log.error({ issues: validated.error.issues }, 'Practice assessment response schema violation')
        return reply.code(500).send({ error: 'Internal server error' })
      }

      return reply.code(200).send(validated.data)
    },
  )
}
