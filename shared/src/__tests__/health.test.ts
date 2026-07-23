import { describe, it, expect } from 'vitest'
import { healthResponseSchema } from '../../schemas/health.js'

describe('healthResponseSchema', () => {
  it('validates a correct health response', () => {
    const result = healthResponseSchema.safeParse({ status: 'ok', phase: 1 })
    expect(result.success).toBe(true)
  })

  it('rejects a response where status is not "ok"', () => {
    expect(healthResponseSchema.safeParse({ status: 'error', phase: 1 }).success).toBe(false)
  })
})
