import { describe, it, expect } from 'vitest'
import { buildApp } from '../../app.js'

function makeApp(envOverrides = {}) {
  const env = {
    NODE_ENV: 'test',
    PORT: 4002,
    LOG_LEVEL: 'silent',
    CORS_ORIGIN: 'http://localhost:5173',
    DATABASE_URL: 'postgresql://education:securepassword@localhost:5432/education',
    SESSION_SECRET: 'this-is-a-long-random-secret-for-testing-purposes-only-32-chars',
    AWS_REGION: 'ap-south-1',
    S3_ASSETS_BUCKET: 'test-bucket',
    S3_AUDIO_PREFIX: 'audio/',
    S3_SIGNED_URL_TTL_SECONDS: 900,
    COOKIE_SECURE: false,
    COOKIE_SAME_SITE: 'lax',
    ...envOverrides,
  }
  return buildApp(env)
}

describe('POST /api/v1/practice/assess', () => {
  it('correctly grades exact match', async () => {
    const app = makeApp()
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/practice/assess',
      payload: {
        questionId: 'alpha-en-a-01',
        answer: 'apple',
        language: 'en',
        gradeLevel: 'lkg',
        answerMode: 'text',
      },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.correct).toBe(true)
    expect(body.score).toBe(1.0)
    expect(body.reasonCode).toBe('EXACT_MATCH')
    expect(body.gradingMethod).toBe('deterministic')
  })

  it('correctly grades spelling near-miss for practice', async () => {
    const app = makeApp()
    // 'aple' is edit distance 1 from 'apple'
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/practice/assess',
      payload: {
        questionId: 'alpha-en-a-01',
        answer: 'aple',
        language: 'en',
        gradeLevel: 'lkg',
        answerMode: 'text',
      },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.correct).toBe(false)
    expect(body.score).toBe(0.0)
    expect(body.reasonCode).toBe('SPELLING_NEAR_MISS')
  })

  it('rejects invalid inputs with 400', async () => {
    const app = makeApp()
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/practice/assess',
      payload: {
        questionId: 'alpha-en-a-01',
        answer: '', // empty
        language: 'en',
        gradeLevel: 'lkg',
        answerMode: 'text',
      },
    })
    expect(response.statusCode).toBe(400)
  })

  it('returns 404 for unknown question ID', async () => {
    const app = makeApp()
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/practice/assess',
      payload: {
        questionId: 'unknown-question-id',
        answer: 'apple',
        language: 'en',
        gradeLevel: 'lkg',
        answerMode: 'text',
      },
    })
    expect(response.statusCode).toBe(404)
  })
})
