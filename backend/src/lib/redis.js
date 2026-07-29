import Redis from 'ioredis'
import { parseEnv } from '../env.js'

const env = parseEnv()

let redisClient = null

if (env.REDIS_URL) {
  redisClient = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000)
      return delay
    },
  })

  redisClient.on('error', (err) => {
    console.error('Redis connection error:', err)
  })
} else {
  console.warn('REDIS_URL is not defined. Redis features (Leaderboard) will be disabled.')
}

export { redisClient }
