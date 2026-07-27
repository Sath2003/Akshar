/**
 * Question repository for assessment grading.
 *
 * Each question has:
 *   - id: unique question ID
 *   - language: 'en' | 'hi' | 'kn'
 *   - gradeLevel: 'nursery' | 'lkg' | 'ukg'
 *   - type: 'exact' | 'open-ended' | 'tap' | 'choice'
 *   - correctAnswer: authoritative answer (never exposed to client)
 *   - acceptedAnswers: normalized alternatives (for deterministic grading)
 *   - subject: 'alphabet' | 'numbers' | 'vocabulary'
 */

/** @type {Map<string, import('./schemas.js').Question>} */
const questions = new Map([
  // ── English Alphabet ──────────────────────────────────────────────────────
  [
    'alpha-en-a-01',
    {
      id: 'alpha-en-a-01',
      language: 'en',
      gradeLevel: 'lkg',
      type: 'exact',
      subject: 'alphabet',
      correctAnswer: 'apple',
      acceptedAnswers: ['apple'],
    },
  ],
  [
    'alpha-en-b-01',
    {
      id: 'alpha-en-b-01',
      language: 'en',
      gradeLevel: 'lkg',
      type: 'exact',
      subject: 'alphabet',
      correctAnswer: 'ball',
      acceptedAnswers: ['ball'],
    },
  ],
  // ── Numbers English ───────────────────────────────────────────────────────
  [
    'numbers-en-05',
    {
      id: 'numbers-en-05',
      language: 'en',
      gradeLevel: 'lkg',
      type: 'exact',
      subject: 'numbers',
      correctAnswer: 'five',
      acceptedAnswers: ['five', '5'],
    },
  ],
  [
    'numbers-en-01',
    {
      id: 'numbers-en-01',
      language: 'en',
      gradeLevel: 'nursery',
      type: 'tap',
      subject: 'numbers',
      correctAnswer: 'one',
      acceptedAnswers: ['one', '1'],
    },
  ],
  // ── Hindi Varnamala ───────────────────────────────────────────────────────
  [
    'alpha-hi-a-01',
    {
      id: 'alpha-hi-a-01',
      language: 'hi',
      gradeLevel: 'lkg',
      type: 'exact',
      subject: 'alphabet',
      correctAnswer: 'अनार',
      acceptedAnswers: ['अनार'],
    },
  ],
  // ── Kannada Varnamala ─────────────────────────────────────────────────────
  [
    'alpha-kn-a-01',
    {
      id: 'alpha-kn-a-01',
      language: 'kn',
      gradeLevel: 'lkg',
      type: 'exact',
      subject: 'alphabet',
      correctAnswer: 'ಅಮ್ಮ',
      acceptedAnswers: ['ಅಮ್ಮ'],
    },
  ],
  // ── Open-ended (Gemini graded) ────────────────────────────────────────────
  [
    'vocab-en-fruit-01',
    {
      id: 'vocab-en-fruit-01',
      language: 'en',
      gradeLevel: 'ukg',
      type: 'open-ended',
      subject: 'vocabulary',
      correctAnswer: 'apple',
      acceptedAnswers: [],
    },
  ],
])

/**
 * Resolve a question by ID.
 * @param {string} questionId
 * @returns {import('./schemas.js').Question | null}
 */
export function getQuestion(questionId) {
  return questions.get(questionId) ?? null
}
