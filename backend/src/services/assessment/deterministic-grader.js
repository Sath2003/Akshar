/**
 * Deterministic grader for objective answers.
 * Used for: exact word, number matching, alphabet matching, tap selection, fill-in-the-blanks.
 * Never calls an AI model.
 */

/**
 * Normalize a string for comparison.
 * - Unicode NFC normalization
 * - Trim whitespace
 * - Lowercase (English only — Hindi/Kannada scripts are case-invariant)
 * - Remove common punctuation
 *
 * @param {string} value
 * @param {'en'|'hi'|'kn'} language
 * @returns {string}
 */
export function normalizeAnswer(value, language) {
  if (typeof value !== 'string') return ''
  let s = value
    .normalize('NFC')
    .trim()
    .replace(/[.,!?;:'"()\-]/g, '')
    .replace(/\s+/g, ' ')

  if (language === 'en') {
    s = s.toLowerCase()
  }

  return s
}

/**
 * Compute Levenshtein edit distance between two strings.
 * Used for spelling tolerance on practice routes only.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function editDistance(a, b) {
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }

  return dp[m][n]
}

/**
 * Grade an answer deterministically.
 *
 * @param {string} submittedAnswer - raw answer from the student (untrusted)
 * @param {string} correctAnswer - authoritative correct answer
 * @param {string[]} [acceptedAnswers=[]] - normalized alternatives
 * @param {'en'|'hi'|'kn'} language
 * @param {object} [options]
 * @param {boolean} [options.allowSpellingTolerance=false] - allow spelling tolerance (edit distance of 1)
 * @returns {{ correct: boolean, score: number, reasonCode: string }}
 */
export function gradeAnswer(submittedAnswer, correctAnswer, acceptedAnswers = [], language, options = {}) {
  const allowSpellingTolerance = options.allowSpellingTolerance ?? false
  const normalizedSubmitted = normalizeAnswer(submittedAnswer, language)
  const normalizedCorrect = normalizeAnswer(correctAnswer, language)

  // Exact match after normalization
  if (normalizedSubmitted === normalizedCorrect) {
    return { correct: true, score: 1, reasonCode: 'EXACT_MATCH' }
  }

  // Check accepted alternatives
  for (const alt of acceptedAnswers) {
    if (normalizedSubmitted === normalizeAnswer(alt, language)) {
      return { correct: true, score: 1, reasonCode: 'ACCEPTED_ALTERNATIVE' }
    }
  }

  // Near-miss: single character difference (for spelling tolerance on English practice only)
  if (
    allowSpellingTolerance &&
    language === 'en' &&
    editDistance(normalizedSubmitted, normalizedCorrect) === 1
  ) {
    return { correct: false, score: 0, reasonCode: 'SPELLING_NEAR_MISS' }
  }

  return { correct: false, score: 0, reasonCode: 'INCORRECT' }
}
