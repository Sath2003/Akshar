import { parseEnv } from './env.js'
import { buildApp } from './app.js'

async function main(): Promise<void> {
  let env
  try {
    env = parseEnv(process.env)
  } catch (err) {
    console.error('[startup] Fatal: invalid environment configuration')
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }

  const app = buildApp(env)

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

void main()
