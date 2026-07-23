import { z } from 'zod'

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  phase: z.number().int().positive(),
})

export type HealthResponse = z.infer<typeof healthResponseSchema>
