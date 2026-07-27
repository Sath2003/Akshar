import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword, needsPasswordRehash } from '../lib/password.js'

describe('Password Utility (scrypt)', () => {
  it('correctly hashes and verifies a password', async () => {
    const pwd = 'MySecretPassword123!'
    const hash = await hashPassword(pwd)

    expect(hash).toContain('$scrypt$v=1$n=32768,r=8,p=3$')
    expect(hash.split('$').length).toBe(6)

    const isMatch = await verifyPassword(pwd, hash)
    expect(isMatch).toBe(true)

    const isNonMatch = await verifyPassword('WrongPassword', hash)
    expect(isNonMatch).toBe(false)
  })

  it('detects when rehash is needed', async () => {
    const pwd = 'AnotherPassword'
    const currentHash = await hashPassword(pwd)
    expect(needsPasswordRehash(currentHash)).toBe(false)

    // Old or modified config parameters should trigger needsPasswordRehash
    const customOldHash = '$scrypt$v=1$n=16384,r=8,p=1$0102030405060708090a0b0c0d0e0f10$aabbcc'
    expect(needsPasswordRehash(customOldHash)).toBe(true)
    expect(needsPasswordRehash('some-plain-text-or-stale-md5')).toBe(true)
  })

  it('handles invalid inputs safely', async () => {
    const matchNull = await verifyPassword(null, 'hash')
    expect(matchNull).toBe(false)

    const matchUndefined = await verifyPassword('pass', undefined)
    expect(matchUndefined).toBe(false)

    await expect(hashPassword(null)).rejects.toThrow()
  })
})
