import { describe, it, expect } from 'vitest'
import { parseEnv } from '../env.js'

describe('parseEnv', () => {
  const base = {
    NODE_ENV: 'development',
    CORS_ORIGIN: 'http://localhost:5173',
    DATABASE_URL: 'postgresql://education:securepassword@localhost:5432/education',
    SESSION_SECRET: 'this-is-a-long-random-secret-for-testing-purposes-only-32-chars',
  }

  it('parses valid development config', () => {
    const env = parseEnv(base)
    expect(env.NODE_ENV).toBe('development')
    expect(env.PORT).toBe(4000)
    expect(env.SESSION_COOKIE_NAME).toBe('akshar_session')
  })

  it('requires SESSION_SECRET to be at least 32 characters', () => {
    expect(() =>
      parseEnv({ ...base, SESSION_SECRET: 'short-secret' }),
    ).toThrow('SESSION_SECRET')
  })

  it('rejects default database password in production', () => {
    expect(() =>
      parseEnv({
        ...base,
        NODE_ENV: 'production',
        CORS_ORIGIN: 'https://example.com',
        DATABASE_URL: 'postgresql://education:change-me@postgres:5432/education',
      }),
    ).toThrow('change-me')
  })

  it('requires HTTPS CORS origin in production', () => {
    expect(() =>
      parseEnv({
        ...base,
        NODE_ENV: 'production',
        CORS_ORIGIN: 'http://example.com',
      }),
    ).toThrow('https://')
  })

  it('accepts valid production config', () => {
    const env = parseEnv({
      ...base,
      NODE_ENV: 'production',
      CORS_ORIGIN: 'https://akshar.sathvikdevops.site',
      DATABASE_URL: 'postgresql://education:strongpassword@postgres:5432/education',
    })
    expect(env.NODE_ENV).toBe('production')
  })

  it('validates S3 signed URL TTL must be >= 60', () => {
    expect(() =>
      parseEnv({ ...base, S3_SIGNED_URL_TTL_SECONDS: '10' }),
    ).toThrow()
  })

  it('defaults PORT to 4000', () => {
    const env = parseEnv(base)
    expect(env.PORT).toBe(4000)
  })
})
