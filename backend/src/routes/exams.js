import { prisma } from '../lib/prisma.js'

/**
 * Exam management routes.
 * Prefixed with /api/v1/exams
 * Secured via TEACHER or ADMIN checks.
 *
 * @param {import('fastify').FastifyInstance} app
 */
export async function examRoutes(app) {
  // Apply auth preHandler
  app.addHook('preHandler', app.authenticate)
  app.addHook('preHandler', app.requireRole(['ADMIN', 'TEACHER']))

  // GET /exams
  app.get(
    '/exams',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            classroomId: { type: 'string', format: 'uuid' },
            subjectId: { type: 'string', format: 'uuid' },
            status: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const schoolId = request.user.schoolId
      const { classroomId, subjectId, status } = request.query

      const exams = await prisma.exam.findMany({
        where: {
          schoolId,
          ...(classroomId && { classroomId }),
          ...(subjectId && { subjectId }),
          ...(status && { status }),
        },
        include: {
          classroom: true,
          subject: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      return reply.code(200).send({ exams })
    },
  )

  // GET /exams/:examId
  app.get(
    '/exams/:examId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['examId'],
          properties: { examId: { type: 'string', format: 'uuid' } },
        },
      },
    },
    async (request, reply) => {
      const { examId } = request.params
      const schoolId = request.user.schoolId

      const exam = await prisma.exam.findFirst({
        where: { id: examId, schoolId },
        include: {
          classroom: true,
          subject: true,
          questions: {
            orderBy: { orderIndex: 'asc' },
            include: { question: { include: { options: true } } },
          },
        },
      })

      if (!exam) {
        return reply.code(404).send({ error: 'Exam not found' })
      }

      return reply.code(200).send({ exam })
    },
  )

  // POST /exams
  app.post(
    '/exams',
    {
      schema: {
        body: {
          type: 'object',
          required: ['classroomId', 'subjectId', 'title', 'durationMinutes', 'startAt', 'endAt'],
          properties: {
            classroomId: { type: 'string', format: 'uuid' },
            subjectId: { type: 'string', format: 'uuid' },
            title: { type: 'string', minLength: 1 },
            description: { type: 'string', nullable: true },
            instructions: { type: 'string', nullable: true },
            durationMinutes: { type: 'integer', minimum: 1 },
            startAt: { type: 'string', format: 'date-time' },
            endAt: { type: 'string', format: 'date-time' },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const schoolId = request.user.schoolId
      const body = request.body

      const start = new Date(body.startAt)
      const end = new Date(body.endAt)

      if (end <= start) {
        return reply.code(400).send({ error: 'End time must be after start time' })
      }

      // If duration is longer than the time window, reject
      const windowMinutes = (end.getTime() - start.getTime()) / (60 * 1000)
      if (body.durationMinutes > windowMinutes) {
        return reply.code(400).send({ error: 'Exam duration must fit within the start/end time window' })
      }

      // If user is a TEACHER, verify they are assigned to this classroom + subject
      if (request.user.role === 'TEACHER') {
        const assignment = await prisma.teacherAssignment.findFirst({
          where: {
            teacherId: request.user.id,
            classroomId: body.classroomId,
            subjectId: body.subjectId,
            active: true,
          },
        })
        if (!assignment) {
          return reply.code(403).send({ error: 'Forbidden: You are not assigned to teach this classroom and subject' })
        }
      }

      const exam = await prisma.exam.create({
        data: {
          schoolId,
          classroomId: body.classroomId,
          subjectId: body.subjectId,
          createdById: request.user.id,
          title: body.title,
          description: body.description,
          instructions: body.instructions,
          durationMinutes: body.durationMinutes,
          totalMarks: 0.0,
          startAt: start,
          endAt: end,
          status: 'DRAFT',
        },
      })

      return reply.code(201).send({ exam })
    },
  )

  // PATCH /exams/:examId
  app.patch(
    '/exams/:examId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['examId'],
          properties: { examId: { type: 'string', format: 'uuid' } },
        },
        body: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 1 },
            description: { type: 'string', nullable: true },
            instructions: { type: 'string', nullable: true },
            durationMinutes: { type: 'integer', minimum: 1 },
            startAt: { type: 'string', format: 'date-time' },
            endAt: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['DRAFT', 'SCHEDULED', 'CLOSED', 'ARCHIVED'] },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const { examId } = request.params
      const schoolId = request.user.schoolId

      const exam = await prisma.exam.findFirst({
        where: { id: examId, schoolId },
      })

      if (!exam) {
        return reply.code(404).send({ error: 'Exam not found' })
      }

      // Check if attempt exists
      const attemptsCount = await prisma.examAttempt.count({ where: { examId } })
      if (attemptsCount > 0) {
        return reply.code(400).send({ error: 'Cannot modify exam: students have already started or submitted attempts' })
      }

      const updateData = { ...request.body }
      if (updateData.startAt) updateData.startAt = new Date(updateData.startAt)
      if (updateData.endAt) updateData.endAt = new Date(updateData.endAt)

      if (updateData.startAt || updateData.endAt) {
        const start = updateData.startAt || exam.startAt
        const end = updateData.endAt || exam.endAt
        if (end <= start) {
          return reply.code(400).send({ error: 'End time must be after start time' })
        }
      }

      const updated = await prisma.exam.update({
        where: { id: examId },
        data: updateData,
      })

      return reply.code(200).send({ exam: updated })
    },
  )

  // POST /exams/:examId/questions (Add question)
  app.post(
    '/exams/:examId/questions',
    {
      schema: {
        params: {
          type: 'object',
          required: ['examId'],
          properties: { examId: { type: 'string', format: 'uuid' } },
        },
        body: {
          type: 'object',
          required: ['questionId', 'marks'],
          properties: {
            questionId: { type: 'string', format: 'uuid' },
            marks: { type: 'number', minimum: 0.1 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const { examId } = request.params
      const { questionId, marks } = request.body
      const schoolId = request.user.schoolId

      const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId } })
      if (!exam) return reply.code(404).send({ error: 'Exam not found' })
      if (exam.status !== 'DRAFT') {
        return reply.code(400).send({ error: 'Cannot add questions: exam is not in DRAFT mode' })
      }

      const question = await prisma.question.findFirst({ where: { id: questionId, schoolId } })
      if (!question) return reply.code(400).send({ error: 'Question not found' })

      // Get current max orderIndex
      const maxQuestion = await prisma.examQuestion.findFirst({
        where: { examId },
        orderBy: { orderIndex: 'desc' },
      })
      const nextIndex = maxQuestion ? maxQuestion.orderIndex + 1 : 0

      // Add inside transaction and update total marks on the exam
      const result = await prisma.$transaction(async (tx) => {
        const eq = await tx.examQuestion.create({
          data: {
            examId,
            questionId,
            orderIndex: nextIndex,
            marks,
            questionSnapshotJson: '{}', // placeholders until schedule snapshotting occurs
            answerKeySnapshotJson: '{}',
          },
        })

        // Recalculate exam total marks
        const sum = await tx.examQuestion.aggregate({
          where: { examId },
          _sum: { marks: true },
        })
        const totalMarks = sum._sum.marks || 0.0

        await tx.exam.update({
          where: { id: examId },
          data: { totalMarks },
        })

        return eq
      })

      return reply.code(200).send({ examQuestion: result })
    },
  )

  // DELETE /exams/:examId/questions/:examQuestionId
  app.delete(
    '/exams/:examId/questions/:examQuestionId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['examId', 'examQuestionId'],
          properties: {
            examId: { type: 'string', format: 'uuid' },
            examQuestionId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      const { examId, examQuestionId } = request.params
      const schoolId = request.user.schoolId

      const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId } })
      if (!exam) return reply.code(404).send({ error: 'Exam not found' })
      if (exam.status !== 'DRAFT') {
        return reply.code(400).send({ error: 'Cannot delete questions: exam is not in DRAFT mode' })
      }

      await prisma.$transaction(async (tx) => {
        await tx.examQuestion.delete({
          where: { id: examQuestionId, examId },
        })

        // Recalculate exam total marks
        const sum = await tx.examQuestion.aggregate({
          where: { examId },
          _sum: { marks: true },
        })
        const totalMarks = sum._sum.marks || 0.0

        await tx.exam.update({
          where: { id: examId },
          data: { totalMarks },
        })
      })

      return reply.code(200).send({ success: true, message: 'Question removed from exam' })
    },
  )

  // PATCH /exams/:examId/questions/reorder
  app.patch(
    '/exams/:examId/questions/reorder',
    {
      schema: {
        params: {
          type: 'object',
          required: ['examId'],
          properties: { examId: { type: 'string', format: 'uuid' } },
        },
        body: {
          type: 'object',
          required: ['orderMap'],
          properties: {
            orderMap: {
              type: 'array',
              items: {
                type: 'object',
                required: ['examQuestionId', 'orderIndex'],
                properties: {
                  examQuestionId: { type: 'string', format: 'uuid' },
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
      const { examId } = request.params
      const { orderMap } = request.body
      const schoolId = request.user.schoolId

      const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId } })
      if (!exam) return reply.code(404).send({ error: 'Exam not found' })
      if (exam.status !== 'DRAFT') {
        return reply.code(400).send({ error: 'Cannot reorder questions: exam is not in DRAFT mode' })
      }

      // Reorder inside a transaction
      await prisma.$transaction(
        orderMap.map((item) =>
          prisma.examQuestion.update({
            where: { id: item.examQuestionId, examId },
            data: { orderIndex: item.orderIndex },
          }),
        ),
      )

      return reply.code(200).send({ success: true, message: 'Questions reordered successfully' })
    },
  )

  // POST /exams/:examId/schedule
  // Performs question snapshots and locks the exam layout
  app.post(
    '/exams/:examId/schedule',
    {
      schema: {
        params: {
          type: 'object',
          required: ['examId'],
          properties: { examId: { type: 'string', format: 'uuid' } },
        },
      },
    },
    async (request, reply) => {
      const { examId } = request.params
      const schoolId = request.user.schoolId

      const exam = await prisma.exam.findFirst({
        where: { id: examId, schoolId },
        include: {
          questions: {
            include: { question: { include: { options: true } } },
          },
        },
      })

      if (!exam) return reply.code(404).send({ error: 'Exam not found' })
      if (exam.questions.length === 0) {
        return reply.code(400).send({ error: 'Cannot schedule exam: it has no questions' })
      }

      // Transaction to snapshot and transition status to SCHEDULED
      const scheduledExam = await prisma.$transaction(async (tx) => {
        for (const eq of exam.questions) {
          const q = eq.question

          // Segment question properties for student viewing
          const questionSnapshot = {
            id: q.id,
            prompt: q.prompt,
            instructions: q.instructions,
            type: q.type,
            difficulty: q.difficulty,
            language: q.language,
            mediaAssetId: q.mediaAssetId,
            options: q.options.map((opt) => ({
              id: opt.id,
              label: opt.label,
              value: opt.value,
              orderIndex: opt.orderIndex,
            })),
          }

          // Lock correctness fields separately in answerKeySnapshotJson (NEVER exposed to students)
          const answerKeySnapshot = {
            answerKeyJson: q.answerKeyJson,
          }

          // Save snapshots on ExamQuestion
          await tx.examQuestion.update({
            where: { id: eq.id },
            data: {
              questionSnapshotJson: JSON.stringify(questionSnapshot),
              answerKeySnapshotJson: JSON.stringify(answerKeySnapshot),
            },
          })
        }

        // Change exam status
        const updated = await tx.exam.update({
          where: { id: examId },
          data: { status: 'SCHEDULED' },
        })

        // Automatically assign to all students enrolled in the classroom
        const students = await tx.studentEnrollment.findMany({
          where: { classroomId: exam.classroomId, active: true },
          select: { studentId: true },
        })

        if (students.length > 0) {
          await tx.examAssignment.createMany({
            data: students.map((s) => ({
              examId,
              studentId: s.studentId,
            })),
            skipDuplicates: true,
          })
        }

        // Write log
        await tx.auditLog.create({
          data: {
            schoolId,
            actorUserId: request.user.id,
            action: 'EXAM_SCHEDULING',
            entityType: 'Exam',
            entityId: examId,
          },
        }).catch(() => {})

        return updated
      })

      return reply.code(200).send({ exam: scheduledExam })
    },
  )

  // POST /exams/:examId/close
  app.post(
    '/exams/:examId/close',
    async (request, reply) => {
      const { examId } = request.params
      const schoolId = request.user.schoolId

      const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId } })
      if (!exam) return reply.code(404).send({ error: 'Exam not found' })

      const closed = await prisma.exam.update({
        where: { id: examId },
        data: { status: 'CLOSED' },
      })

      return reply.code(200).send({ exam: closed })
    },
  )
}
export default examRoutes
