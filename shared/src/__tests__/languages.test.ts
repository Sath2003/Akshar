import { describe, it, expect } from 'vitest'
import { languageSchema, isValidLanguage } from '../../types/languages.js'

describe('language validation', () => {
  it('accepts valid supported languages', () => {
    expect(languageSchema.safeParse('en').success).toBe(true)
    expect(languageSchema.safeParse('hi').success).toBe(true)
  })

  it('rejects unsupported language codes', () => {
    expect(languageSchema.safeParse('fr').success).toBe(false)
  })

  it('isValidLanguage narrows type correctly', () => {
    expect(isValidLanguage('en')).toBe(true)
    expect(isValidLanguage('fr')).toBe(false)
  })
})
