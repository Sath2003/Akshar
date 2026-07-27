import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { buildApp } from '../../app.js'
import { prisma } from '../../lib/prisma.js'
import { hashPassword, verifyPassword } from '../../lib/password.js'

function makeApp(envOverrides = {}) {
  const env = {
    NODE_ENV: 'test',
    PORT: 4003,
    LOG_LEVEL: 'silent',
    CORS_ORIGIN: 'http://localhost:5173',
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://education:change-me@localhost:5432/education',
    SESSION_SECRET: 'this-is-a-long-random-secret-for-testing-purposes-only-32-chars',
    SESSION_COOKIE_NAME: 'akshar_session',
    SESSION_TTL_HOURS: 12,
    COOKIE_SECURE: false,
    COOKIE_SAME_SITE: 'lax',
    LOGIN_MAX_ATTEMPTS: 5,
    LOGIN_RATE_LIMIT_WINDOW_MINUTES: 15,
    ...envOverrides,
  }
  return buildApp(env)
}

describe('Auth Routes (Login, Logout, Profile, Change Password)', () => {
  let school
  let user
  let app

  beforeEach(async () => {
    app = makeApp()
    // Clean up DB
    await prisma.session.deleteMany()
    await prisma.user.deleteMany()
    await prisma.school.deleteMany()

    // Seed a school
    school = await prisma.school.create({
      data: {
        name: 'Test School',
        code: 'TESTSCH',
      },
    })

    // Seed a test active user
    const pwdHash = await hashPassword('correct-password')
    user = await prisma.user.create({
      data: {
        schoolId: school.id,
        username: 'student01',
        usernameNormalized: 'student01',
        displayName: 'Student One',
        passwordHash: pwdHash,
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    })
  })

  afterEach(async () => {
    await prisma.session.deleteMany()
    await prisma.user.deleteMany()
    await prisma.school.deleteMany()
    await app.close()
  })

  it('successful login sets secure signed cookie and returns user profile', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        username: 'student01',
        password: 'correct-password',
      },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.user.username).toBe('student01')
    expect(body.user.role).toBe('STUDENT')

    // Verify cookie exists and is signed (contains '.' separator characteristic of fastify-cookie signed values)
    const cookies = response.cookies
    const sessionCookie = cookies.find((c) => c.name === 'akshar_session')
    expect(sessionCookie).toBeDefined()
    expect(sessionCookie.value).toContain('.') // signed cookies contain signature suffix separated by '.'
    expect(sessionCookie.httpOnly).toBe(true)
  })

  it('failed login returns generic 400 error', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        username: 'student01',
        password: 'wrong-password',
      },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().error).toBe('Invalid username or password')
  })

  it('inactive user is rejected even with correct password', async () => {
    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'INACTIVE' },
    })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        username: 'student01',
        password: 'correct-password',
      },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().error).toBe('User account is inactive or locked')
  })

  it('GET /auth/me returns user details when authenticated', async () => {
    // Perform login to get cookie
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        username: 'student01',
        password: 'correct-password',
      },
    })

    const cookie = loginRes.headers['set-cookie']

    // Request profile
    const profileRes = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        cookie: Array.isArray(cookie) ? cookie.join('; ') : cookie,
      },
    })

    expect(profileRes.statusCode).toBe(200)
    expect(profileRes.json().user.username).toBe('student01')
  })

  it('GET /auth/me rejects unauthenticated request with 401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
    })
    expect(response.statusCode).toBe(401)
  })

  it('POST /auth/logout revokes session and clears cookie', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        username: 'student01',
        password: 'correct-password',
      },
    })

    const cookie = loginRes.headers['set-cookie']

    const logoutRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: {
        cookie: Array.isArray(cookie) ? cookie.join('; ') : cookie,
        origin: 'http://localhost:5173', // state changing needs CSRF Origin validation
      },
    })

    expect(logoutRes.statusCode).toBe(200)
    expect(logoutRes.json().success).toBe(true)

    // Check that cookie was cleared (expires in past)
    const logoutCookie = logoutRes.cookies.find((c) => c.name === 'akshar_session')
    expect(logoutCookie.expires.getTime()).toBeLessThan(Date.now())

    // Verify session is revoked in database
    const dbSessions = await prisma.session.findMany({
      where: { userId: user.id },
    })
    expect(dbSessions.every((s) => s.revokedAt !== null)).toBe(true)
  })

  it('state-changing cookie-authenticated request fails CSRF check if Origin is missing or mismatch', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        username: 'student01',
        password: 'correct-password',
      },
    })

    const cookie = loginRes.headers['set-cookie']

    // Try state changing POST request WITHOUT Origin header
    const postRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: {
        cookie: Array.isArray(cookie) ? cookie.join('; ') : cookie,
      },
    })

    expect(postRes.statusCode).toBe(400)
    expect(postRes.json().error).toContain('Origin or Referer header required')
  })

  it('change password updates hash, revokes other sessions, and creates new one', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        username: 'student01',
        password: 'correct-password',
      },
    })

    const cookie = loginRes.headers['set-cookie']

    // Change password
    const changeRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/change-password',
      headers: {
        cookie: Array.isArray(cookie) ? cookie.join('; ') : cookie,
        origin: 'http://localhost:5173',
      },
      payload: {
        currentPassword: 'correct-password',
        newPassword: 'new-secure-password',
      },
    })

    expect(changeRes.statusCode).toBe(200)
    expect(changeRes.json().success).toBe(true)

    // Verify database hash is updated
    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } })
    const oldPasswordVerify = await verifyPassword('correct-password', updatedUser.passwordHash)
    const newPasswordVerify = await verifyPassword('new-secure-password', updatedUser.passwordHash)
    expect(oldPasswordVerify).toBe(false)
    expect(newPasswordVerify).toBe(true)

    // Verify first session is revoked
    const loginCookieVal = loginRes.cookies.find((c) => c.name === 'akshar_session').value
    const appTemp = makeApp()
    const loginUnsigned = appTemp.unsignCookie(loginCookieVal)
    const oldSession = await prisma.session.findFirst({
      where: { tokenHash: oldSessionTokenHash(loginUnsigned.value) },
    })
    expect(oldSession.revokedAt).not.toBeNull()
  })
})

function oldSessionTokenHash(token) {
  const crypto = require('node:crypto')
  return crypto.createHash('sha256').update(token).digest('hex')
}
