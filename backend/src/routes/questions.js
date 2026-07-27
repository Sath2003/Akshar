import { prisma } from '../lib/prisma.js'

/**
 * Question Bank management routes.
 * Prefixed with /api/v1/questions
 * Secured via TEACHER or ADMIN role checks.
 *
 * @param {import('fastify').FastifyInstance} app
 */
export async function questionRoutes(app) {
  // Apply authentication hook globally to this route file
  app.addHook('preHandler', app.authenticate)
  // Secure via role check: either ADMIN or TEACHER can access the question bank
  app.addHook('preHandler', app.requireRole(['ADMIN', 'TEACHER']))

  // GET /questions (Get questions list with filters & paging)
  app.get(
    '/questions',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            subjectId: { type: 'string', format: 'uuid' },
            gradeLevel: { type: 'string', enum: ['NURSERY', 'LKG', 'UKG'] },
            language: { type: 'string', enum: ['en', 'hi', 'kn'] },
            type: { type: 'string' },
            difficulty: { type: 'string', enum: ['EASY', 'MEDIUM', 'HARD'] },
            status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'] },
            search: { type: 'string' },
            page: { type: 'integer', minimum: 1, default: 1 },
            pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          },
        },
      },
    },
    async (request, reply) => {
      const schoolId = request.user.schoolId
      const { subjectId, gradeLevel, language, type, difficulty, status, search, page, pageSize } = request.query
      const skip = (page - 1) * pageSize

      const where = {
        schoolId,
        ...(subjectId && { subjectId }),
        ...(gradeLevel && { gradeLevel }),
        ...(language && { language }),
        ...(type && { type }),
        ...(difficulty && { difficulty }),
        ...(status ? { status } : { status: { in: ['DRAFT', 'ACTIVE'] } }), // default exclude archived
        ...(search && {
          OR: [
            { prompt: { contains: search, mode: 'insensitive' } },
            { instructions: { contains: search, mode: 'insensitive' } },
          ],
        }),
      }

      const [total, questions] = await prisma.$transaction([
        prisma.question.count({ where }),
        prisma.question.findMany({
          where,
          include: {
            options: { orderBy: { orderIndex: 'asc' } },
            subject: true,
          },
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
        }),
      ])

      return reply.code(200).send({ total, page, pageSize, questions })
    },
  )

  // GET /questions/:questionId
  app.get(
    '/questions/:questionId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['questionId'],
          properties: { questionId: { type: 'string', format: 'uuid' } },
        },
      },
    },
    async (request, reply) => {
      const { questionId } = request.params
      const schoolId = request.user.schoolId

      const question = await prisma.question.findFirst({
        where: { id: questionId, schoolId },
        include: {
          options: { orderBy: { orderIndex: 'asc' } },
          subject: true,
        },
      })

      if (!question) {
        return reply.code(404).send({ error: 'Question not found' })
      }

      return reply.code(200).send({ question })
    },
  )

  // POST /questions
  app.post(
    '/questions',
    {
      schema: {
        body: {
          type: 'object',
          required: ['subjectId', 'gradeLevel', 'language', 'type', 'prompt', 'defaultMarks', 'difficulty', 'answerKeyJson'],
          properties: {
            subjectId: { type: 'string', format: 'uuid' },
            gradeLevel: { type: 'string', enum: ['NURSERY', 'LKG', 'UKG'] },
            language: { type: 'string', enum: ['en', 'hi', 'kn'] },
            type: {
              type: 'string',
              enum: [
                'MULTIPLE_CHOICE',
                'TRUE_FALSE',
                'FILL_IN_THE_BLANK',
                'ONE_WORD',
                'SHORT_ANSWER',
                'LONG_ANSWER',
                'MATCHING',
                'IMAGE_BASED',
                'TRACING',
              ],
            },
            prompt: { type: 'string', minLength: 1 },
            instructions: { type: 'string', nullable: true },
            defaultMarks: { type: 'number', minimum: 0.1 },
            difficulty: { type: 'string', enum: ['EASY', 'MEDIUM', 'HARD'] },
            answerKeyJson: { type: 'string', minLength: 1 },
            mediaAssetId: { type: 'string', format: 'uuid', nullable: true },
            options: {
              type: 'array',
              items: {
                type: 'object',
                required: ['label', 'value', 'orderIndex'],
                properties: {
                  label: { type: 'string', minLength: 1 },
                  value: { type: 'string', minLength: 1 },
                  orderIndex: { type: 'integer' },
                },
              },
            },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const schoolId = request.user.schoolId
      const body = request.body

      // Validate subject is in the school
      const subject = await prisma.subject.findFirst({
        where: { id: body.subjectId, schoolId },
      })
      if (!subject) {
        return reply.code(400).send({ error: 'Invalid subject selection' })
      }

      // Validate MCQs must have options
      if (body.type === 'MULTIPLE_CHOICE' && (!body.options || body.options.length < 2)) {
        return reply.code(400).send({ error: 'Multiple choice questions require at least two options' })
      }

      // Check correctness rules via transaction
      const question = await prisma.$transaction(async (tx) => {
        const created = await tx.question.create({
          data: {
            schoolId,
            subjectId: body.subjectId,
            createdById: request.user.id,
            gradeLevel: body.gradeLevel,
            language: body.language,
            type: body.type,
            prompt: body.prompt,
            instructions: body.instructions,
            defaultMarks: body.defaultMarks,
            difficulty: body.difficulty,
            answerKeyJson: body.answerKeyJson,
            mediaAssetId: body.mediaAssetId,
            status: 'ACTIVE',
          },
        })

        if (body.options && body.options.length > 0) {
          await tx.questionOption.createMany({
            data: body.options.map((opt) => ({
              questionId: created.id,
              label: opt.label,
              value: opt.value,
              orderIndex: opt.orderIndex,
            })),
          })
        }

        return tx.question.findUnique({
          where: { id: created.id },
          include: { options: { orderBy: { orderIndex: 'asc' } } },
        })
      })

      return reply.code(201).send({ question })
    },
  )

  // PATCH /questions/:questionId
  app.patch(
    '/questions/:questionId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['questionId'],
          properties: { questionId: { type: 'string', format: 'uuid' } },
        },
        body: {
          type: 'object',
          properties: {
            prompt: { type: 'string', minLength: 1 },
            instructions: { type: 'string', nullable: true },
            defaultMarks: { type: 'number', minimum: 0.1 },
            difficulty: { type: 'string', enum: ['EASY', 'MEDIUM', 'HARD'] },
            answerKeyJson: { type: 'string', minLength: 1 },
            mediaAssetId: { type: 'string', format: 'uuid', nullable: true },
            status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'] },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const { questionId } = request.params
      const schoolId = request.user.schoolId

      const existing = await prisma.question.findFirst({
        where: { id: questionId, schoolId },
      })

      if (!existing) {
        return reply.code(404).send({ error: 'Question not found' })
      }

      const updated = await prisma.question.update({
        where: { id: questionId },
        data: request.body,
      })

      return reply.code(200).send({ question: updated })
    },
  )

  // DELETE /questions/:questionId
  app.delete(
    '/questions/:questionId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['questionId'],
          properties: { questionId: { type: 'string', format: 'uuid' } },
        },
      },
    },
    async (request, reply) => {
      const { questionId } = request.params
      const schoolId = request.user.schoolId

      const question = await prisma.question.findFirst({
        where: { id: questionId, schoolId },
      })

      if (!question) {
        return reply.code(404).send({ error: 'Question not found' })
      }

      // Check if question is used in any exams
      const usedInExams = await prisma.examQuestion.findFirst({
        where: { questionId },
      })

      if (usedInExams) {
        // If used, archive instead of deleting
        const archived = await prisma.question.update({
          where: { id: questionId },
          data: { status: 'ARCHIVED' },
        })
        return reply.code(200).send({ message: 'Question is used in exams. Archived successfully.', question: archived })
      }

      // Delete question options & question
      await prisma.question.delete({
        where: { id: questionId },
      })

      return reply.code(200).send({ message: 'Question deleted successfully' })
    },
  )

  // POST /questions/:questionId/duplicate
  app.post(
    '/questions/:questionId/duplicate',
    {
      schema: {
        params: {
          type: 'object',
          required: ['questionId'],
          properties: { questionId: { type: 'string', format: 'uuid' } },
        },
      },
    },
    async (request, reply) => {
      const { questionId } = request.params
      const schoolId = request.user.schoolId

      const question = await prisma.question.findFirst({
        where: { id: questionId, schoolId },
        include: { options: true },
      })

      if (!question) {
        return reply.code(404).send({ error: 'Question not found' })
      }

      const duplicated = await prisma.$transaction(async (tx) => {
        const created = await tx.question.create({
          data: {
            schoolId,
            subjectId: question.subjectId,
            createdById: request.user.id,
            gradeLevel: question.gradeLevel,
            language: question.language,
            type: question.type,
            prompt: `${question.prompt} (Copy)`,
            instructions: question.instructions,
            defaultMarks: question.defaultMarks,
            difficulty: question.difficulty,
            answerKeyJson: question.answerKeyJson,
            mediaAssetId: question.mediaAssetId,
            status: 'DRAFT',
          },
        })

        if (question.options && question.options.length > 0) {
          await tx.questionOption.createMany({
            data: question.options.map((opt) => ({
              questionId: created.id,
              label: opt.label,
              value: opt.value,
              orderIndex: opt.orderIndex,
            })),
          })
        }

        return created
      })

      return reply.code(201).send({ question: duplicated })
    },
  )
}
export default questionRoutes
