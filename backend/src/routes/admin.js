import { prisma } from '../lib/prisma.js'
import { hashPassword } from '../lib/password.js'
import { revokeAllUserSessions } from '../services/auth/session-service.js'

/**
 * Admin management routes.
 * Prefixed with /api/v1/admin
 * Secured via ADMIN role checks.
 *
 * @param {import('fastify').FastifyInstance} app
 */
export async function adminRoutes(app) {
  // Apply authentication and admin role check globally to this router block
  app.addHook('preHandler', app.authenticate)
  app.addHook('preHandler', app.requireRole(['ADMIN']))

  // ── USER MANAGEMENT ────────────────────────────────────────────────────────

  // GET /admin/users
  app.get(
    '/admin/users',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            role: { type: 'string', enum: ['ADMIN', 'TEACHER', 'STUDENT'] },
            status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'LOCKED'] },
            search: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { role, status, search } = request.query
      const schoolId = request.user.schoolId

      const users = await prisma.user.findMany({
        where: {
          schoolId,
          ...(role && { role }),
          ...(status && { status }),
          ...(search && {
            OR: [
              { username: { contains: search, mode: 'insensitive' } },
              { displayName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }),
        },
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          role: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
        },
        orderBy: { username: 'asc' },
      })

      return reply.code(200).send({ users })
    },
  )

  // POST /admin/users (Create User)
  app.post(
    '/admin/users',
    {
      schema: {
        body: {
          type: 'object',
          required: ['username', 'displayName', 'password', 'role'],
          properties: {
            username: { type: 'string', minLength: 1, maxLength: 50 },
            displayName: { type: 'string', minLength: 1, maxLength: 100 },
            password: { type: 'string', minLength: 6 },
            email: { type: 'string', format: 'email', nullable: true },
            role: { type: 'string', enum: ['ADMIN', 'TEACHER', 'STUDENT'] },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const { username, displayName, password, email, role } = request.body
      const schoolId = request.user.schoolId
      const normalized = username.toLowerCase()

      // Check username duplicate within school
      const duplicate = await prisma.user.findUnique({
        where: {
          schoolId_usernameNormalized: {
            schoolId,
            usernameNormalized: normalized,
          },
        },
      })

      if (duplicate) {
        return reply.code(400).send({ error: `Username "${username}" is already taken in this school` })
      }

      const passwordHash = await hashPassword(password)

      const user = await prisma.user.create({
        data: {
          schoolId,
          username,
          usernameNormalized: normalized,
          displayName,
          email,
          passwordHash,
          role,
          status: 'ACTIVE',
        },
      })

      // Log audit
      await prisma.auditLog.create({
        data: {
          schoolId,
          actorUserId: request.user.id,
          action: 'USER_CREATION',
          entityType: 'User',
          entityId: user.id,
        },
      }).catch(() => {})

      return reply.code(201).send({
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          status: user.status,
          schoolId: user.schoolId,
        },
      })
    },
  )

  // PATCH /admin/users/:userId (Edit / Status Change / Password Reset)
  app.patch(
    '/admin/users/:userId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['userId'],
          properties: { userId: { type: 'string', format: 'uuid' } },
        },
        body: {
          type: 'object',
          properties: {
            displayName: { type: 'string', minLength: 1 },
            email: { type: 'string', format: 'email', nullable: true },
            status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'LOCKED'] },
            password: { type: 'string', minLength: 6 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const { userId } = request.params
      const { displayName, email, status, password } = request.body
      const schoolId = request.user.schoolId

      const user = await prisma.user.findFirst({
        where: { id: userId, schoolId },
      })

      if (!user) {
        return reply.code(404).send({ error: 'User not found in this school' })
      }

      const updateData = {}
      if (displayName !== undefined) updateData.displayName = displayName
      if (email !== undefined) updateData.email = email

      let sessionRevocationRequired = false

      if (status !== undefined) {
        updateData.status = status
        if (status !== 'ACTIVE') {
          sessionRevocationRequired = true
        }
      }

      if (password !== undefined) {
        updateData.passwordHash = await hashPassword(password)
        sessionRevocationRequired = true
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: updateData,
      })

      // If user status deactivated or password reset, revoke all sessions
      if (sessionRevocationRequired) {
        await revokeAllUserSessions(userId)
      }

      // Log audit
      await prisma.auditLog.create({
        data: {
          schoolId,
          actorUserId: request.user.id,
          action: status !== undefined ? 'USER_DEACTIVATION' : 'USER_UPDATE',
          entityType: 'User',
          entityId: userId,
        },
      }).catch(() => {})

      return reply.code(200).send({
        user: {
          id: updated.id,
          username: updated.username,
          displayName: updated.displayName,
          role: updated.role,
          status: updated.status,
        },
      })
    },
  )

  // ── CLASSROOM MANAGEMENT ───────────────────────────────────────────────────

  // GET /admin/classrooms
  app.get('/admin/classrooms', async (request, reply) => {
    const classrooms = await prisma.classroom.findMany({
      where: { schoolId: request.user.schoolId },
      orderBy: [{ gradeLevel: 'asc' }, { name: 'asc' }],
    })
    return reply.code(200).send({ classrooms })
  })

  // POST /admin/classrooms
  app.post(
    '/admin/classrooms',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'gradeLevel', 'section', 'academicYear'],
          properties: {
            name: { type: 'string', minLength: 1 },
            gradeLevel: { type: 'string', enum: ['NURSERY', 'LKG', 'UKG'] },
            section: { type: 'string', minLength: 1 },
            academicYear: { type: 'string', minLength: 4 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const { name, gradeLevel, section, academicYear } = request.body
      const schoolId = request.user.schoolId

      // Prevent duplicate classrooms (same grade, section, academic year)
      const existing = await prisma.classroom.findFirst({
        where: { schoolId, gradeLevel, section, academicYear },
      })

      if (existing) {
        return reply.code(400).send({ error: 'Classroom with this grade, section, and academic year already exists' })
      }

      const classroom = await prisma.classroom.create({
        data: {
          schoolId,
          name,
          gradeLevel,
          section,
          academicYear,
        },
      })

      return reply.code(201).send({ classroom })
    },
  )

  // ── SUBJECT MANAGEMENT ─────────────────────────────────────────────────────

  // GET /admin/subjects
  app.get('/admin/subjects', async (request, reply) => {
    const subjects = await prisma.subject.findMany({
      where: { schoolId: request.user.schoolId },
      orderBy: { name: 'asc' },
    })
    return reply.code(200).send({ subjects })
  })

  // POST /admin/subjects
  app.post(
    '/admin/subjects',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'code', 'language'],
          properties: {
            name: { type: 'string', minLength: 1 },
            code: { type: 'string', minLength: 1 },
            language: { type: 'string', enum: ['en', 'hi', 'kn'] },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const { name, code, language } = request.body
      const schoolId = request.user.schoolId

      const existing = await prisma.subject.findFirst({
        where: { schoolId, code },
      })

      if (existing) {
        return reply.code(400).send({ error: `Subject code "${code}" already exists` })
      }

      const subject = await prisma.subject.create({
        data: {
          schoolId,
          name,
          code,
          language,
        },
      })

      return reply.code(201).send({ subject })
    },
  )

  // ── ENROLLMENTS & ASSIGNMENTS ──────────────────────────────────────────────

  // POST /admin/enrollments (Enroll student in class)
  app.post(
    '/admin/enrollments',
    {
      schema: {
        body: {
          type: 'object',
          required: ['studentId', 'classroomId'],
          properties: {
            studentId: { type: 'string', format: 'uuid' },
            classroomId: { type: 'string', format: 'uuid' },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const { studentId, classroomId } = request.body
      const schoolId = request.user.schoolId

      // Validate student exists and is STUDENT
      const student = await prisma.user.findFirst({
        where: { id: studentId, schoolId, role: 'STUDENT' },
      })
      if (!student) {
        return reply.code(400).send({ error: 'Student not found in this school' })
      }

      // Validate classroom
      const classroom = await prisma.classroom.findFirst({
        where: { id: classroomId, schoolId },
      })
      if (!classroom) {
        return reply.code(400).send({ error: 'Classroom not found in this school' })
      }

      const enrollment = await prisma.studentEnrollment.upsert({
        where: {
          studentId_classroomId: { studentId, classroomId },
        },
        update: { active: true },
        create: { studentId, classroomId, active: true },
      })

      return reply.code(200).send({ enrollment })
    },
  )

  // POST /admin/assignments (Assign teacher to class/subject)
  app.post(
    '/admin/assignments',
    {
      schema: {
        body: {
          type: 'object',
          required: ['teacherId', 'classroomId', 'subjectId'],
          properties: {
            teacherId: { type: 'string', format: 'uuid' },
            classroomId: { type: 'string', format: 'uuid' },
            subjectId: { type: 'string', format: 'uuid' },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const { teacherId, classroomId, subjectId } = request.body
      const schoolId = request.user.schoolId

      // Validate teacher
      const teacher = await prisma.user.findFirst({
        where: { id: teacherId, schoolId, role: 'TEACHER' },
      })
      if (!teacher) {
        return reply.code(400).send({ error: 'Teacher not found in this school' })
      }

      // Validate classroom
      const classroom = await prisma.classroom.findFirst({
        where: { id: classroomId, schoolId },
      })
      if (!classroom) {
        return reply.code(400).send({ error: 'Classroom not found in this school' })
      }

      // Validate subject
      const subject = await prisma.subject.findFirst({
        where: { id: subjectId, schoolId },
      })
      if (!subject) {
        return reply.code(400).send({ error: 'Subject not found in this school' })
      }

      const assignment = await prisma.teacherAssignment.upsert({
        where: {
          teacherId_classroomId_subjectId: { teacherId, classroomId, subjectId },
        },
        update: { active: true },
        create: { teacherId, classroomId, subjectId, active: true },
      })

      return reply.code(200).send({ assignment })
    },
  )

  // POST /admin/resets (Reset Exam Attempt)
  // Preserves answer history, increments attemptNumber, transactional audit logging.
  app.post(
    '/admin/resets',
    {
      schema: {
        body: {
          type: 'object',
          required: ['attemptId', 'reason'],
          properties: {
            attemptId: { type: 'string', format: 'uuid' },
            reason: { type: 'string', minLength: 5 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const { attemptId, reason } = request.body
      const schoolId = request.user.schoolId

      // Find the attempt
      const attempt = await prisma.examAttempt.findUnique({
        where: { id: attemptId },
        include: {
          exam: true,
          student: true,
        },
      })

      if (!attempt || attempt.exam.schoolId !== schoolId) {
        return reply.code(404).send({ error: 'Exam attempt not found in this school' })
      }

      // Transition attempt status inside a transaction to prevent active attempt conflict
      await prisma.$transaction(async (tx) => {
        // Mark current attempt as EVALUATED / RESET (archived status)
        // Set finalizedAt and status to FINALIZED so it is locked
        await tx.examAttempt.update({
          where: { id: attempt.id },
          data: {
            status: 'FINALIZED',
            finalizedAt: new Date(),
          },
        })

        // Log audit log event
        await tx.auditLog.create({
          data: {
            schoolId,
            actorUserId: request.user.id,
            action: 'ATTEMPT_RESET',
            entityType: 'ExamAttempt',
            entityId: attempt.id,
            metadataJson: JSON.stringify({
              attemptNumber: attempt.attemptNumber,
              studentId: attempt.studentId,
              examId: attempt.examId,
              reason,
              resetAt: new Date(),
            }),
          },
        })
      })

      return reply.code(200).send({ success: true, message: 'Attempt has been reset and archived. A new attempt can now be started.' })
    },
  )
}
export default adminRoutes
