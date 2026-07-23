import { z } from 'zod'

export const LANGUAGES = ['en', 'hi', 'kn'] as const
export type Language = (typeof LANGUAGES)[number]

export const languageSchema = z.enum(LANGUAGES)

export function isValidLanguage(val: unknown): val is Language {
  return languageSchema.safeParse(val).success
}
