import { z } from 'zod'

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    LOG_LEVEL: z
      .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'])
      .default('info'),
    CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
    DATABASE_URL: z.string().url(),

    // ── Session & Authentication ─────────────────────────────────────────────
    SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
    SESSION_COOKIE_NAME: z.string().default('akshar_session'),
    SESSION_TTL_HOURS: z.coerce.number().int().min(1).default(12),
    LOGIN_MAX_ATTEMPTS: z.coerce.number().int().min(1).default(5),
    LOGIN_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().min(1).default(15),
    COOKIE_DOMAIN: z.string().optional(),

    // ── AWS / S3 Audio Assets ────────────────────────────────────────────────
    AWS_REGION: z.string().default('ap-south-1'),
    S3_ASSETS_BUCKET: z.string().optional(),
    S3_AUDIO_PREFIX: z.string().default('audio/'),
    S3_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),

    // ── AI Assessment ────────────────────────────────────────────────────────
    AI_ENABLED: z.string().transform((v) => v === 'true').default('false'),
    AI_PROVIDER: z.string().default('gemini'),
    AI_MODEL: z.string().default('gemini-1.5-flash'),
    GEMINI_API_KEY: z.string().optional(),
    AI_TIMEOUT_MS: z.coerce.number().default(10000),

    // ── Redis ────────────────────────────────────────────────────────────────
    REDIS_URL: z.string().optional(),

    // ── Notifications (Email/SMS) ────────────────────────────────────────────
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM_EMAIL: z.string().email().optional(),
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_PHONE_NUMBER: z.string().optional(),
    // ── CORS hardening ───────────────────────────────────────────────────────
    COOKIE_SECURE: z
      .string()
      .transform((v) => v === 'true')
      .default('false'),
    COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('lax'),
  })
  .superRefine((data, ctx) => {
    // Reject default database password in production
    if (
      data.NODE_ENV === 'production' &&
      data.DATABASE_URL.includes('change-me')
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DATABASE_URL'],
        message: 'DATABASE_URL must not use the default "change-me" password in production',
      })
    }

    // Require HTTPS CORS origin in production (temporarily disabled for HTTP testing)
    // if (data.NODE_ENV === 'production' && !data.CORS_ORIGIN.startsWith('https://')) {
    //   ctx.addIssue({
    //     code: z.ZodIssueCode.custom,
    //     path: ['CORS_ORIGIN'],
    //     message: 'CORS_ORIGIN must use https:// in production',
    //   })
    // }
  })

export function parseEnv(raw = process.env) {
  const result = envSchema.safeParse(raw)
  if (!result.success) {
    const messages = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(`Invalid environment configuration:\n${messages}`)
  }
  return result.data
}
