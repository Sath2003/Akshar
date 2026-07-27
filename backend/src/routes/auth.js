import { hashPassword, verifyPassword } from '../lib/password.js'
import { createSession, revokeSession, revokeAllUserSessions } from '../services/auth/session-service.js'
import { prisma } from '../lib/prisma.js'

/**
 * Register auth routes.
 *
 * @param {import('fastify').FastifyInstance} app
 */
export async function authRoutes(app) {
  const cookieName = app.env.SESSION_COOKIE_NAME || 'akshar_session'

  // POST /api/v1/auth/login
  app.post(
    '/auth/login',
    {
      config: {
        rateLimit: {
          max: app.env.LOGIN_MAX_ATTEMPTS || 5,
          timeWindow: `${app.env.LOGIN_RATE_LIMIT_WINDOW_MINUTES || 15} minutes`,
          errorResponseBuilder: () => ({
            error: 'Too many login attempts. Please try again later.',
          }),
        },
      },
      schema: {
        body: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', minLength: 1 },
            password: { type: 'string', minLength: 1 },
          },
          additionalProperties: false,
        },
        response: {
          200: {
            type: 'object',
            required: ['user'],
            properties: {
              user: {
                type: 'object',
                required: ['id', 'username', 'displayName', 'role', 'schoolId'],
                properties: {
                  id: { type: 'string' },
                  username: { type: 'string' },
                  displayName: { type: 'string' },
                  role: { type: 'string' },
                  schoolId: { type: 'string' },
                },
              },
            },
          },
          400: {
            type: 'object',
            required: ['error'],
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (request, reply) => {
      const { username, password } = request.body
      const normalizedUsername = username.toLowerCase()

      // Find user by normalized username case-insensitively
      const user = await prisma.user.findFirst({
        where: { usernameNormalized: normalizedUsername },
      })

      if (!user) {
        // Log login failure
        await prisma.auditLog.create({
          data: {
            schoolId: schoolPlaceholderId(), // use a system default or stub since no school resolved
            action: 'LOGIN_FAILURE',
            entityType: 'User',
            metadataJson: JSON.stringify({ username }),
          },
        }).catch(() => {})

        return reply.code(400).send({ error: 'Invalid username or password' })
      }

      // Verify status
      if (user.status !== 'ACTIVE') {
        return reply.code(400).send({ error: 'User account is inactive or locked' })
      }

      // Verify password
      const isMatch = await verifyPassword(password, user.passwordHash)
      if (!isMatch) {
        // Log login failure with matched user
        await prisma.auditLog.create({
          data: {
            schoolId: user.schoolId,
            actorUserId: user.id,
            action: 'LOGIN_FAILURE',
            entityType: 'User',
            metadataJson: JSON.stringify({ username }),
          },
        }).catch(() => {})

        return reply.code(400).send({ error: 'Invalid username or password' })
      }

      // Create session record
      const { rawToken, session } = await createSession(
        user.id,
        request.headers['user-agent'],
        request.ip,
        app.env.SESSION_TTL_HOURS,
      )

      // Set cookie options
      const cookieOptions = {
        signed: true,
        httpOnly: true,
        secure: app.env.COOKIE_SECURE === true || app.env.NODE_ENV === 'production',
        sameSite: app.env.COOKIE_SAME_SITE || 'lax',
        path: '/',
      }

      if (app.env.COOKIE_DOMAIN) {
        cookieOptions.domain = app.env.COOKIE_DOMAIN
      }

      // Write signed cookie to response
      void reply.setCookie(cookieName, rawToken, cookieOptions)

      // Update lastLoginAt
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }).catch(() => {})

      // Write successful login audit log
      await prisma.auditLog.create({
        data: {
          schoolId: user.schoolId,
          actorUserId: user.id,
          action: 'LOGIN_SUCCESS',
          entityType: 'User',
          entityId: user.id,
        },
      }).catch(() => {})

      return reply.code(200).send({
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          schoolId: user.schoolId,
        },
      })
    },
  )

  // POST /api/v1/auth/logout
  app.post(
    '/auth/logout',
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const cookieVal = request.cookies[cookieName]
      if (cookieVal) {
        const unsigned = request.unsignCookie(cookieVal)
        if (unsigned.valid && unsigned.value) {
          await revokeSession(unsigned.value)
        }
      }

      // Clear cookie
      void reply.clearCookie(cookieName, {
        path: '/',
        domain: app.env.COOKIE_DOMAIN,
      })

      // Write audit
      if (request.user) {
        await prisma.auditLog.create({
          data: {
            schoolId: request.user.schoolId,
            actorUserId: request.user.id,
            action: 'LOGOUT',
            entityType: 'User',
            entityId: request.user.id,
          },
        }).catch(() => {})
      }

      return reply.code(200).send({ success: true })
    },
  )

  // GET /api/v1/auth/me
  app.get(
    '/auth/me',
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      return reply.code(200).send({
        user: {
          id: request.user.id,
          username: request.user.username,
          displayName: request.user.displayName,
          role: request.user.role,
          schoolId: request.user.schoolId,
        },
      })
    },
  )

  // POST /api/v1/auth/change-password
  app.post(
    '/auth/change-password',
    {
      preHandler: app.authenticate,
      schema: {
        body: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: { type: 'string', minLength: 1 },
            newPassword: { type: 'string', minLength: 6 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const { currentPassword, newPassword } = request.body
      const userId = request.user.id

      // Load full user with password hash
      const user = await prisma.user.findUnique({
        where: { id: userId },
      })

      if (!user) {
        return reply.code(400).send({ error: 'User not found' })
      }

      const isMatch = await verifyPassword(currentPassword, user.passwordHash)
      if (!isMatch) {
        return reply.code(400).send({ error: 'Invalid current password' })
      }

      // Hash new password
      const newHash = await hashPassword(newPassword)

      // Update password and revoke all sessions (including current) in a transaction
      await prisma.$transaction(async (tx) => {
        // Update hash
        await tx.user.update({
          where: { id: userId },
          data: { passwordHash: newHash },
        })

        // Revoke all existing sessions
        await tx.session.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        })
      })

      // Create a fresh session for the user so they stay logged in on the current client
      const { rawToken } = await createSession(
        user.id,
        request.headers['user-agent'],
        request.ip,
        app.env.SESSION_TTL_HOURS,
      )

      // Set cookie options
      const cookieOptions = {
        signed: true,
        httpOnly: true,
        secure: app.env.COOKIE_SECURE === true || app.env.NODE_ENV === 'production',
        sameSite: app.env.COOKIE_SAME_SITE || 'lax',
        path: '/',
      }

      if (app.env.COOKIE_DOMAIN) {
        cookieOptions.domain = app.env.COOKIE_DOMAIN
      }

      // Write signed cookie to response
      void reply.setCookie(cookieName, rawToken, cookieOptions)

      // Log audit
      await prisma.auditLog.create({
        data: {
          schoolId: user.schoolId,
          actorUserId: user.id,
          action: 'PASSWORD_CHANGE',
          entityType: 'User',
          entityId: user.id,
        },
      }).catch(() => {})

      return reply.code(200).send({ success: true })
    },
  )
}

function schoolPlaceholderId() {
  // Return a static placeholder UUID format to satisfy schema foreign keys on login failure when school cannot be determined
  return '00000000-0000-0000-0000-000000000000'
}
