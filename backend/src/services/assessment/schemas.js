import { z } from 'zod'

export const LANGUAGES = /** @type {const} */ (['en', 'hi', 'kn'])
export const GRADE_LEVELS = /** @type {const} */ (['nursery', 'lkg', 'ukg'])
export const ANSWER_MODES = /** @type {const} */ (['text', 'tap'])
export const QUESTION_TYPES = /** @type {const} */ (['exact', 'open-ended', 'tap', 'choice'])
export const GRADING_METHODS = /** @type {const} */ (['deterministic'])
export const DIFFICULTY_ADJUSTMENTS = /** @type {const} */ (['decrease', 'same', 'increase'])

// ── Request schema ─────────────────────────────────────────────────────────
export const assessRequestSchema = z.object({
  questionId: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'questionId must be lowercase alphanumeric with hyphens'),
  answer: z
    .string()
    .min(1, 'Answer must not be empty')
    .max(500, 'Answer exceeds maximum length'),
  language: z.enum(LANGUAGES),
  gradeLevel: z.enum(GRADE_LEVELS),
  answerMode: z.enum(ANSWER_MODES),
})

// ── Response schema ────────────────────────────────────────────────────────
export const assessResponseSchema = z.object({
  correct: z.boolean(),
  score: z.number().min(0).max(1),
  feedback: z.string().max(200),
  gradingMethod: z.enum(GRADING_METHODS),
  difficultyAdjustment: z.enum(DIFFICULTY_ADJUSTMENTS),
  reasonCode: z.string(),
})

/**
 * @typedef {Object} Question
 * @property {string} id
 * @property {'en'|'hi'|'kn'} language
 * @property {'nursery'|'lkg'|'ukg'} gradeLevel
 * @property {'exact'|'open-ended'|'tap'|'choice'} type
 * @property {string} subject
 * @property {string} correctAnswer
 * @property {string[]} acceptedAnswers
 */
