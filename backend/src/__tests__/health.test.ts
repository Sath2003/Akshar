import { describe, it, expect, afterAll } from 'vitest'
import { buildApp } from '../app.js'
import { parseEnv } from '../env.js'

const testEnv = parseEnv({
  NODE_ENV: 'test',
  PORT: '4001',
  LOG_LEVEL: 'silent',
  CORS_ORIGIN: 'http://localhost:5173',
})

describe('GET /api/v1/health', () => {
  const app = buildApp(testEnv)

  afterAll(async () => {
    await app.close()
  })

  it('returns HTTP 200', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok', phase: 1 })
  })
})
