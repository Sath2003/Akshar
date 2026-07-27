import { prisma } from '../lib/prisma.js'

/**
 * Teacher Evaluation and Grading routes.
 * Prefixed with /api/v1/teacher
 * Secured via TEACHER role checks.
 *
 * @param {import('fastify').FastifyInstance} app
 */
export async function teacherRoutes(app) {
  // Apply TEACHER check
  app.addHook('preHandler', app.authenticate)
  app.addHook('preHandler', app.requireRole(['TEACHER']))

  // GET /teacher/evaluations/exams
  // List all scheduled/closed exams for the teacher's assigned classes
  app.get('/teacher/evaluations/exams', async (request, reply) => {
    const teacherId = request.user.id
    const schoolId = request.user.schoolId

    // Get assignments
    const assignments = await prisma.teacherAssignment.findMany({
      where: { teacherId, active: true },
    })

    if (assignments.length === 0) {
      return reply.code(200).send({ exams: [] })
    }

    const classroomIds = assignments.map((a) => a.classroomId)
    const subjectIds = assignments.map((a) => a.subjectId)

    const exams = await prisma.exam.findMany({
      where: {
        schoolId,
        classroomId: { in: classroomIds },
        subjectId: { in: subjectIds },
        status: { in: ['SCHEDULED', 'CLOSED'] },
      },
      include: {
        classroom: true,
        subject: true,
        _count: {
          select: { attempts: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return reply.code(200).send({ exams })
  })

  // GET /teacher/evaluations/exams/:examId/attempts
  // List all student attempts for a specific exam
  app.get('/teacher/evaluations/exams/:examId/attempts', async (request, reply) => {
    const { examId } = request.params
    const schoolId = request.user.schoolId

    const attempts = await prisma.examAttempt.findMany({
      where: {
        examId,
        exam: { schoolId }, // security check
      },
      include: {
        student: { select: { id: true, username: true, displayName: true } },
      },
      orderBy: [{ student: { displayName: 'asc' } }, { attemptNumber: 'desc' }],
    })

    return reply.code(200).send({ attempts })
  })

  // GET /teacher/evaluations/attempts/:attemptId
  // Get full attempt details with answers and evaluations
  app.get('/teacher/evaluations/attempts/:attemptId', async (request, reply) => {
    const { attemptId } = request.params
    const schoolId = request.user.schoolId

    const attempt = await prisma.examAttempt.findFirst({
      where: {
        id: attemptId,
        exam: { schoolId },
      },
      include: {
        student: { select: { id: true, username: true, displayName: true } },
        exam: true,
        answers: {
          include: {
            examQuestion: true,
            evaluations: {
              orderBy: { createdAt: 'desc' },
              take: 1, // latest evaluation
            },
          },
        },
      },
    })

    if (!attempt) return reply.code(404).send({ error: 'Attempt not found' })

    // Reconstruct student answers with snapshots
    const formattedAnswers = attempt.answers.map((a) => {
      const eq = a.examQuestion
      const snapshot = JSON.parse(eq.questionSnapshotJson)
      const answerKey = JSON.parse(eq.answerKeySnapshotJson)

      return {
        id: a.id,
        examQuestionId: eq.id,
        studentAnswer: JSON.parse(a.answerJson).value,
        question: snapshot,
        answerKey: answerKey.answerKeyJson ? JSON.parse(answerKey.answerKeyJson) : null,
        maxMarks: eq.marks,
        autoEvaluationStatus: a.autoEvaluationStatus,
        autoMarksAwarded: a.autoMarksAwarded,
        evaluation: a.evaluations.length > 0 ? a.evaluations[0] : null,
      }
    })

    return reply.code(200).send({
      attempt: {
        id: attempt.id,
        status: attempt.status,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        totalAwarded: attempt.totalAwarded,
        objectiveMarks: attempt.objectiveMarks,
        subjectiveMarks: attempt.subjectiveMarks,
        student: attempt.student,
        exam: attempt.exam,
      },
      answers: formattedAnswers,
    })
  })

  // POST /teacher/evaluations/answers/:studentAnswerId/grade
  // Allows teacher to grade subjective questions or override auto-marks
  app.post(
    '/teacher/evaluations/answers/:studentAnswerId/grade',
    {
      schema: {
        params: {
          type: 'object',
          required: ['studentAnswerId'],
          properties: { studentAnswerId: { type: 'string', format: 'uuid' } },
        },
        body: {
          type: 'object',
          required: ['marksAwarded'],
          properties: {
            marksAwarded: { type: 'number', minimum: 0 },
            feedback: { type: 'string', nullable: true },
          },
        },
      },
    },
    async (request, reply) => {
      const { studentAnswerId } = request.params
      const { marksAwarded, feedback } = request.body
      const teacherId = request.user.id

      const answer = await prisma.studentAnswer.findUnique({
        where: { id: studentAnswerId },
        include: {
          examQuestion: { include: { exam: true } },
          attempt: true,
          evaluations: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      })

      if (!answer || answer.examQuestion.exam.schoolId !== request.user.schoolId) {
        return reply.code(404).send({ error: 'Answer not found' })
      }

      if (answer.attempt.status !== 'SUBMITTED' && answer.attempt.status !== 'EVALUATED') {
        return reply.code(400).send({ error: 'Cannot grade an attempt that is not submitted' })
      }

      if (marksAwarded > answer.examQuestion.marks) {
        return reply.code(400).send({ error: `Marks awarded cannot exceed max marks of ${answer.examQuestion.marks}` })
      }

      const previousEval = answer.evaluations[0]
      const previousMarks = previousEval ? previousEval.marksAwarded : 0.0

      // Update evaluation inside transaction
      await prisma.$transaction(async (tx) => {
        // Create evaluation record
        const evaluation = await tx.answerEvaluation.create({
          data: {
            studentAnswerId,
            evaluatedById: teacherId,
            marksAwarded,
            feedback,
            evaluationSource: 'MANUAL',
          },
        })

        // Log Marks Audit
        await tx.marksAudit.create({
          data: {
            answerEvaluationId: evaluation.id,
            previousMarks,
            newMarks: marksAwarded,
            reason: feedback || 'Teacher Manual Grading',
            modifiedById: teacherId,
          },
        })

        // Recalculate total subjective marks for the attempt
        // We aggregate all latest manual evaluations for the attempt
        const allAnswers = await tx.studentAnswer.findMany({
          where: { attemptId: answer.attemptId },
          include: {
            evaluations: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        })

        let totalSubjective = 0.0
        let totalObjective = 0.0

        allAnswers.forEach((ans) => {
          const latestEval = ans.evaluations[0]
          if (latestEval) {
            if (latestEval.evaluationSource === 'MANUAL') {
              totalSubjective += Number(latestEval.marksAwarded)
            } else {
              totalObjective += Number(latestEval.marksAwarded)
            }
          }
        })

        await tx.examAttempt.update({
          where: { id: answer.attemptId },
          data: {
            subjectiveMarks: totalSubjective,
            objectiveMarks: totalObjective,
            totalAwarded: totalSubjective + totalObjective,
            status: 'EVALUATED', // Transition to evaluated once grading begins
          },
        })
      })

      return reply.code(200).send({ success: true, message: 'Answer graded successfully' })
    },
  )

  // POST /teacher/evaluations/attempts/:attemptId/publish
  // Finalizes attempt and locks it from further teacher edits
  app.post(
    '/teacher/evaluations/attempts/:attemptId/publish',
    {
      schema: {
        params: {
          type: 'object',
          required: ['attemptId'],
          properties: { attemptId: { type: 'string', format: 'uuid' } },
        },
      },
    },
    async (request, reply) => {
      const { attemptId } = request.params
      const schoolId = request.user.schoolId

      const attempt = await prisma.examAttempt.findFirst({
        where: { id: attemptId, exam: { schoolId } },
      })

      if (!attempt) return reply.code(404).send({ error: 'Attempt not found' })

      if (attempt.status !== 'EVALUATED' && attempt.status !== 'SUBMITTED') {
        return reply.code(400).send({ error: 'Attempt must be submitted or evaluated before publishing' })
      }

      await prisma.examAttempt.update({
        where: { id: attemptId },
        data: {
          status: 'FINALIZED',
          finalizedAt: new Date(),
        },
      })

      return reply.code(200).send({ success: true, message: 'Attempt grades published to student' })
    },
  )
}
export default teacherRoutes
