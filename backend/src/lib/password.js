import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)

const SCRYPT_N = 32768
const SCRYPT_R = 8
const SCRYPT_P = 3
const KEY_LEN = 64
const SALT_LEN = 16
const MAX_MEM = 67108864 // 64 MiB

/**
 * Hash a password using Node.js asynchronous scrypt.
 *
 * @param {string} password - plain text password
 * @returns {Promise<string>} versioned password hash string
 */
export async function hashPassword(password) {
  if (typeof password !== 'string') {
    throw new Error('Password must be a string')
  }
  const salt = randomBytes(SALT_LEN)
  const hash = await scryptAsync(password, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: MAX_MEM,
  })
  return `$scrypt$v=1$n=${SCRYPT_N},r=${SCRYPT_R},p=${SCRYPT_P}$${salt.toString('hex')}$${hash.toString('hex')}`
}

/**
 * Verify a password against a stored scrypt hash in a timing-safe manner.
 *
 * @param {string} password - plain text password
 * @param {string} storedHash - stored versioned password hash
 * @returns {Promise<boolean>} true if verified, false otherwise
 */
export async function verifyPassword(password, storedHash) {
  if (typeof password !== 'string' || typeof storedHash !== 'string') {
    return false
  }
  if (!storedHash.startsWith('$scrypt$v=1$')) {
    return false
  }

  const parts = storedHash.split('$')
  if (parts.length !== 6) {
    return false
  }

  const paramsStr = parts[3] // e.g. "n=32768,r=8,p=3"
  const saltHex = parts[4]
  const hashHex = parts[5]

  // Parse parameters
  const params = {}
  paramsStr.split(',').forEach((p) => {
    const [k, v] = p.split('=')
    params[k] = parseInt(v, 10)
  })

  if (!params.n || !params.r || !params.p) {
    return false
  }

  const salt = Buffer.from(saltHex, 'hex')
  const originalHash = Buffer.from(hashHex, 'hex')

  try {
    const derived = await scryptAsync(password, salt, originalHash.length, {
      N: params.n,
      r: params.r,
      p: params.p,
      maxmem: MAX_MEM,
    })
    return timingSafeEqual(derived, originalHash)
  } catch (err) {
    return false
  }
}

/**
 * Determine if a password hash needs to be rehashed to match the current scrypt config.
 *
 * @param {string} storedHash - stored versioned password hash
 * @returns {boolean} true if rehash is required, false otherwise
 */
export function needsPasswordRehash(storedHash) {
  if (typeof storedHash !== 'string' || !storedHash.startsWith('$scrypt$v=1$')) {
    return true
  }

  const parts = storedHash.split('$')
  if (parts.length !== 6) {
    return true
  }

  const paramsStr = parts[3]
  const expectedParams = `n=${SCRYPT_N},r=${SCRYPT_R},p=${SCRYPT_P}`
  return paramsStr !== expectedParams
}
