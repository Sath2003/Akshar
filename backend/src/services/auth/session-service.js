import crypto from 'node:crypto'
import { prisma } from '../../lib/prisma.js'

/**
 * Hash a raw token with SHA-256.
 *
 * @param {string} token
 * @returns {string} hex hash
 */
export function hashToken(token) {
  if (typeof token !== 'string') {
    throw new Error('Token must be a string')
  }
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Create a new user session.
 *
 * @param {string} userId - UUID of the user
 * @param {string|null} [userAgent=null]
 * @param {string|null} [ipAddress=null]
 * @param {number} [ttlHours=12] - session duration in hours
 * @returns {Promise<{ rawToken: string, session: any }>} raw token and session record
 */
export async function createSession(userId, userAgent = null, ipAddress = null, ttlHours = 12) {
  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000)

  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      userAgent,
      ipAddress,
    },
  })

  return { rawToken, session }
}

/**
 * Validate a session token.
 *
 * @param {string} rawToken
 * @returns {Promise<any|null>} session with user profile or null if invalid
 */
export async function validateSession(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') {
    return null
  }
  const tokenHash = hashToken(rawToken)

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          schoolId: true,
          username: true,
          email: true,
          displayName: true,
          role: true,
          status: true,
        },
      },
    },
  })

  if (!session) {
    return null
  }

  // Check validity, expiration, and user status
  if (session.revokedAt) {
    return null
  }
  if (new Date() > session.expiresAt) {
    return null
  }
  if (session.user.status !== 'ACTIVE') {
    return null
  }

  // Update lastUsedAt in database
  await prisma.session
    .update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {}) // non-blocking, ignore failures

  return session
}

/**
 * Revoke a single session token.
 *
 * @param {string} rawToken
 * @returns {Promise<boolean>} true if session was revoked, false otherwise
 */
export async function revokeSession(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') {
    return false
  }
  const tokenHash = hashToken(rawToken)

  try {
    await prisma.session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    return true
  } catch (err) {
    return false
  }
}

/**
 * Revoke all active sessions for a user.
 * Called upon password change or admin reset.
 *
 * @param {string} userId - user UUID
 * @returns {Promise<boolean>} true if sessions were revoked, false otherwise
 */
export async function revokeAllUserSessions(userId) {
  try {
    await prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    return true
  } catch (err) {
    return false
  }
}
