import { prisma } from '../lib/prisma.js'
import { gradeAnswer } from '../services/assessment/deterministic-grader.js'

/**
 * Student portal endpoints.
 * Prefixed with /api/v1/student
 * Secured via STUDENT checks.
 *
 * @param {import('fastify').FastifyInstance} app
 */
export async function studentRoutes(app) {
  // Apply STUDENT check
  app.addHook('preHandler', app.authenticate)
  app.addHook('preHandler', app.requireRole(['STUDENT']))

  // Helpers

  /**
   * Helper to perform lazy expiry verification on an attempt.
   * Auto-submits and grades the attempt if time has run out.
   */
  async function checkAttemptExpiry(attemptId) {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: { exam: true },
    })

    if (!attempt || attempt.status !== 'IN_PROGRESS') {
      return attempt
    }

    const now = new Date()
    const expiresAt = new Date(attempt.startedAt.getTime() + attempt.exam.durationMinutes * 60 * 1000)

    const isExpired = now > expiresAt || now > attempt.exam.endAt

    if (isExpired) {
      // Lazy Auto-submit attempt inside transaction
      return await prisma.$transaction(async (tx) => {
        const updated = await tx.examAttempt.update({
          where: { id: attemptId },
          data: {
            status: 'SUBMITTED',
            submittedAt: now,
          },
        })

        // Auto grade objective questions
        await autoGradeAttempt(attemptId, tx)

        // Write log
        await tx.auditLog.create({
          data: {
            schoolId: attempt.exam.schoolId,
            actorUserId: attempt.studentId,
            action: 'EXAM_SUBMISSION_TIMEOUT',
            entityType: 'ExamAttempt',
            entityId: attemptId,
          },
        }).catch(() => {})

        return tx.examAttempt.findUnique({
          where: { id: attemptId },
          include: { exam: true },
        })
      })
    }

    return attempt
  }

  /**
   * Run deterministic auto-grading for objective questions.
   */
  async function autoGradeAttempt(attemptId, tx) {
    const answers = await tx.studentAnswer.findMany({
      where: { attemptId },
      include: {
        examQuestion: true,
      },
    })

    let totalObjMarks = 0.0

    for (const ans of answers) {
      const eq = ans.examQuestion
      const snapshot = JSON.parse(eq.questionSnapshotJson)
      const answerKey = JSON.parse(eq.answerKeySnapshotJson)

      const autoEvaluable = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'MATCHING', 'FILL_IN_THE_BLANK'].includes(snapshot.type)

      if (autoEvaluable && answerKey.answerKeyJson) {
        const keyConfig = JSON.parse(answerKey.answerKeyJson)
        const childAns = JSON.parse(ans.answerJson).value || ''

        const gradingResult = gradeAnswer(
          childAns,
          keyConfig.correctValue || '',
          keyConfig.acceptedAnswers || [],
          snapshot.language,
          { allowSpellingTolerance: false }, // NO spelling tolerance/fuzzy matching for exams
        )

        const awarded = gradingResult.correct ? eq.marks : 0.0
        totalObjMarks += Number(awarded)

        // Update answer evaluation status
        await tx.studentAnswer.update({
          where: { id: ans.id },
          data: {
            autoEvaluationStatus: gradingResult.reasonCode,
            autoMarksAwarded: awarded,
          },
        })

        // Upsert AnswerEvaluation
        await tx.answerEvaluation.upsert({
          where: { studentAnswerId: ans.id },
          update: {
            marksAwarded: awarded,
            evaluationSource: 'AUTOMATIC',
          },
          create: {
            studentAnswerId: ans.id,
            evaluatedById: eq.examId, // use exam ID as placeholder system identifier
            marksAwarded: awarded,
            feedback: 'Automatically graded',
            evaluationSource: 'AUTOMATIC',
          },
        })
      } else {
        // Subjective question
        await tx.studentAnswer.update({
          where: { id: ans.id },
          data: {
            autoEvaluationStatus: 'REQUIRES_TEACHER_REVIEW',
            autoMarksAwarded: null,
          },
        })
      }
    }

    // Update attempt marks
    await tx.examAttempt.update({
      where: { id: attemptId },
      data: {
        objectiveMarks: totalObjMarks,
        totalAwarded: totalObjMarks,
      },
    })
  }

  // ── ROUTE IMPLEMENTATIONS ──────────────────────────────────────────────────

  // GET /student/exams (List assigned exams)
  app.get('/student/exams', async (request, reply) => {
    const studentId = request.user.id
    const schoolId = request.user.schoolId

    const assignments = await prisma.examAssignment.findMany({
      where: { studentId },
      include: {
        exam: {
          include: { subject: true },
        },
      },
    })

    const examsList = []
    const now = new Date()

    for (const assign of assignments) {
      const exam = assign.exam

      // Fetch student attempts
      const attempts = await prisma.examAttempt.findMany({
        where: { examId: exam.id, studentId },
        orderBy: { attemptNumber: 'desc' },
      })

      // Lazy check active attempt expiry if applicable
      const latestAttempt = attempts[0]
      let currentAttempt = latestAttempt

      if (latestAttempt && latestAttempt.status === 'IN_PROGRESS') {
        currentAttempt = await checkAttemptExpiry(latestAttempt.id)
      }

      // Check server time activation criteria
      // Active = SCHEDULED status, start <= now < end
      const isWindowActive = exam.status === 'SCHEDULED' && now >= exam.startAt && now < exam.endAt

      examsList.push({
        id: exam.id,
        title: exam.title,
        description: exam.description,
        instructions: exam.instructions,
        durationMinutes: exam.durationMinutes,
        startAt: exam.startAt,
        endAt: exam.endAt,
        subject: exam.subject.name,
        language: exam.subject.language,
        isWindowActive,
        attemptsCount: attempts.length,
        latestAttempt: currentAttempt
          ? {
              id: currentAttempt.id,
              attemptNumber: currentAttempt.attemptNumber,
              status: currentAttempt.status,
              startedAt: currentAttempt.startedAt,
            }
          : null,
      })
    }

    return reply.code(200).send({ exams: examsList })
  })

  // GET /student/exams/:examId
  app.get('/student/exams/:examId', async (request, reply) => {
    const { examId } = request.params
    const studentId = request.user.id

    const assignment = await prisma.examAssignment.findFirst({
      where: { examId, studentId },
    })

    if (!assignment) {
      return reply.code(403).send({ error: 'You are not assigned to this exam' })
    }

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { subject: true },
    })

    return reply.code(200).send({ exam })
  })

  // POST /student/exams/:examId/start
  // Creates or returns active attempt inside transaction
  app.post(
    '/student/exams/:examId/start',
    async (request, reply) => {
      const { examId } = request.params
      const studentId = request.user.id
      const schoolId = request.user.schoolId

      const assignment = await prisma.examAssignment.findFirst({
        where: { examId, studentId },
        include: { exam: true },
      })

      if (!assignment) {
        return reply.code(403).send({ error: 'You are not assigned to this exam' })
      }

      const exam = assignment.exam
      const now = new Date()

      // Server-side timing activation enforcement
      if (exam.status !== 'SCHEDULED' || now < exam.startAt || now >= exam.endAt) {
        return reply.code(400).send({ error: 'This exam is not active for submissions at this time' })
      }

      // Check current attempts inside a transaction
      const attempt = await prisma.$transaction(async (tx) => {
        const attempts = await tx.examAttempt.findMany({
          where: { examId, studentId },
          orderBy: { attemptNumber: 'desc' },
        })

        const activeAttempt = attempts.find((a) => ['NOT_STARTED', 'IN_PROGRESS'].includes(a.status))
        if (activeAttempt) {
          return activeAttempt
        }

        // If all attempts submitted, check if we can start a new one (permitted if admin reset attemptNumber)
        const nextAttemptNum = attempts.length > 0 ? attempts[0].attemptNumber + 1 : 1

        const created = await tx.examAttempt.create({
          data: {
            examId,
            studentId,
            attemptNumber: nextAttemptNum,
            status: 'IN_PROGRESS',
            startedAt: now,
            lastSavedAt: now,
          },
        })

        // Log audit
        await tx.auditLog.create({
          data: {
            schoolId,
            actorUserId: studentId,
            action: 'EXAM_ATTEMPT_START',
            entityType: 'ExamAttempt',
            entityId: created.id,
          },
        }).catch(() => {})

        return created
      })

      return reply.code(201).send({ attempt })
    },
  )

  // GET /student/attempts/:attemptId (Get attempt layout without answer keys)
  app.get('/student/attempts/:attemptId', async (request, reply) => {
    const { attemptId } = request.params
    const studentId = request.user.id

    // Check lazy expiration
    const attempt = await checkAttemptExpiry(attemptId)

    if (!attempt || attempt.studentId !== studentId) {
      return reply.code(404).send({ error: 'Attempt not found or unauthorized' })
    }

    const examQuestions = await prisma.examQuestion.findMany({
      where: { examId: attempt.examId },
      orderBy: { orderIndex: 'asc' },
      select: {
        id: true,
        orderIndex: true,
        marks: true,
        questionSnapshotJson: true, // safe student layouts
        // NO answerKeySnapshotJson selected!
      },
    })

    const questions = examQuestions.map((eq) => {
      const snapshot = JSON.parse(eq.questionSnapshotJson)
      return {
        examQuestionId: eq.id,
        orderIndex: eq.orderIndex,
        marks: eq.marks,
        prompt: snapshot.prompt,
        instructions: snapshot.instructions,
        type: snapshot.type,
        options: snapshot.options || [],
      }
    })

    const savedAnswers = await prisma.studentAnswer.findMany({
      where: { attemptId },
      select: {
        examQuestionId: true,
        answerJson: true,
      },
    })

    return reply.code(200).send({
      attempt: {
        id: attempt.id,
        examId: attempt.examId,
        status: attempt.status,
        startedAt: attempt.startedAt,
        durationMinutes: attempt.exam.durationMinutes,
        endAt: attempt.exam.endAt,
      },
      questions,
      answers: savedAnswers.map((a) => ({
        examQuestionId: a.examQuestionId,
        value: JSON.parse(a.answerJson).value || '',
      })),
    })
  })

  // PATCH /student/attempts/:attemptId/answers/:examQuestionId (Autosave answers)
  app.patch(
    '/student/attempts/:attemptId/answers/:examQuestionId',
    {
      schema: {
        body: {
          type: 'object',
          required: ['value'],
          properties: {
            value: { type: 'string', maxLength: 2000 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const { attemptId, examQuestionId } = request.params
      const { value } = request.body
      const studentId = request.user.id

      // Check lazy expiration
      const attempt = await checkAttemptExpiry(attemptId)

      if (!attempt || attempt.studentId !== studentId) {
        return reply.code(404).send({ error: 'Attempt not found' })
      }

      if (attempt.status !== 'IN_PROGRESS') {
        return reply.code(400).send({ error: 'Cannot save answers: this exam attempt is locked or submitted' })
      }

      // Upsert answer
      const answer = await prisma.studentAnswer.upsert({
        where: {
          attemptId_examQuestionId: { attemptId, examQuestionId },
        },
        update: {
          answerJson: JSON.stringify({ value }),
          updatedAt: new Date(),
        },
        create: {
          attemptId,
          examQuestionId,
          answerJson: JSON.stringify({ value }),
        },
      })

      // Update attempt lastSavedAt
      await prisma.examAttempt.update({
        where: { id: attemptId },
        data: { lastSavedAt: new Date() },
      })

      return reply.code(200).send({ success: true })
    },
  )

  // POST /student/attempts/:attemptId/submit
  app.post(
    '/student/attempts/:attemptId/submit',
    async (request, reply) => {
      const { attemptId } = request.params
      const studentId = request.user.id

      // Lazy check first
      let attempt = await checkAttemptExpiry(attemptId)

      if (!attempt || attempt.studentId !== studentId) {
        return reply.code(404).send({ error: 'Attempt not found' })
      }

      if (attempt.status === 'IN_PROGRESS') {
        // Perform submission lock & auto-grading in transaction
        attempt = await prisma.$transaction(async (tx) => {
          const updated = await tx.examAttempt.update({
            where: { id: attemptId },
            data: {
              status: 'SUBMITTED',
              submittedAt: new Date(),
            },
          })

          // Run deterministic auto-grading
          await autoGradeAttempt(attemptId, tx)

          // Log audit
          await tx.auditLog.create({
            data: {
              schoolId: attempt.exam.schoolId,
              actorUserId: studentId,
              action: 'EXAM_SUBMISSION',
              entityType: 'ExamAttempt',
              entityId: attemptId,
            },
          }).catch(() => {})

          return tx.examAttempt.findUnique({
            where: { id: attemptId },
            include: { exam: true },
          })
        })
      }

      return reply.code(200).send({
        success: true,
        message: 'Exam submitted successfully',
        status: attempt.status,
      })
    },
  )
}
export default studentRoutes
