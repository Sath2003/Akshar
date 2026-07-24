import { z } from 'zod'

export const LANGUAGES = ['en', 'hi', 'kn']

export const languageSchema = z.enum(LANGUAGES)

export function isValidLanguage(val) {
  return languageSchema.safeParse(val).success
}
