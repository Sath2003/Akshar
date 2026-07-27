import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildApp } from '../../app.js'

function makeApp(envOverrides = {}) {
  const env = {
    NODE_ENV: 'test',
    PORT: 4002,
    LOG_LEVEL: 'silent',
    CORS_ORIGIN: 'http://localhost:5173',
    AI_ENABLED: false,
    AI_PROVIDER: 'gemini',
    AI_MODEL: 'gemini-1.5-flash',
    GEMINI_API_KEY: undefined,
    AI_TIMEOUT_MS: 10000,
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

// Mock the AWS SDK — never call real AWS in tests
vi.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: vi.fn().mockImplementation(function() {
      return {}
    }),
    GetObjectCommand: vi.fn().mockImplementation(function(params) {
      return params
    }),
  }
})

vi.mock('@aws-sdk/s3-request-presigner', () => {
  return {
    getSignedUrl: vi.fn(),
  }
})

describe('GET /api/v1/audio/:assetId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 200 with signed URL for an approved asset', async () => {
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')
    vi.mocked(getSignedUrl).mockResolvedValue('https://s3.example.com/signed-url')

    const app = makeApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/audio/feedback-great-job-en',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.url).toBe('https://s3.example.com/signed-url')
    expect(body.expiresIn).toBe(900)
  })

  it('returns 404 for unknown asset ID', async () => {
    const app = makeApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/audio/does-not-exist',
    })
    expect(response.statusCode).toBe(404)
    expect(response.json().error).toContain('does-not-exist')
  })

  it('returns 400 for invalid asset ID format (path traversal attempt)', async () => {
    const app = makeApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/audio/../../etc/passwd',
    })
    // Fastify routing should not match or should reject
    expect([400, 404]).toContain(response.statusCode)
  })

  it('returns 400 for asset ID with uppercase letters', async () => {
    const app = makeApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/audio/GREAT-JOB',
    })
    expect(response.statusCode).toBe(400)
  })

  it('returns 503 when S3 signing fails', async () => {
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')
    vi.mocked(getSignedUrl).mockRejectedValue(new Error('S3 error'))

    const app = makeApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/audio/feedback-great-job-en',
    })
    expect(response.statusCode).toBe(503)
  })

  it('returns 503 when S3 bucket is not configured', async () => {
    const app = makeApp({ S3_ASSETS_BUCKET: undefined })
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/audio/feedback-great-job-en',
    })
    expect(response.statusCode).toBe(503)
  })

  it('does not expose S3 keys or bucket names in response', async () => {
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')
    vi.mocked(getSignedUrl).mockResolvedValue('https://s3.example.com/signed-url')

    const app = makeApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/audio/feedback-great-job-en',
    })

    const bodyStr = response.body
    expect(bodyStr).not.toContain('audio/feedback/en/great-job.mp3')
    expect(bodyStr).not.toContain('test-bucket')
  })
})
