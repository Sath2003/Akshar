/**
 * Audio asset repository.
 *
 * Maps approved asset IDs to S3 object keys.
 * The client NEVER sends an S3 key directly — only an approved asset ID.
 * This prevents arbitrary object access and directory traversal.
 *
 * In a future phase this will be replaced by a database query.
 */

/**
 * @type {Map<string, { s3Key: string, description: string }>}
 */
const approvedAssets = new Map([
  // ── Positive feedback phrases ──────────────────────────────────────────────
  ['feedback-great-job-en',       { s3Key: 'audio/feedback/en/great-job.mp3',      description: 'Great job!' }],
  ['feedback-well-done-en',       { s3Key: 'audio/feedback/en/well-done.mp3',       description: 'Well done!' }],
  ['feedback-excellent-en',       { s3Key: 'audio/feedback/en/excellent.mp3',       description: 'Excellent!' }],
  ['feedback-try-again-en',       { s3Key: 'audio/feedback/en/try-again.mp3',       description: 'Try once more!' }],
  ['feedback-great-job-hi',       { s3Key: 'audio/feedback/hi/great-job.mp3',       description: 'बहुत अच्छा!' }],
  ['feedback-great-job-kn',       { s3Key: 'audio/feedback/kn/great-job.mp3',       description: 'ತುಂಬಾ ಚೆನ್ನಾಗಿದೆ!' }],

  // ── English Alphabet ───────────────────────────────────────────────────────
  ['alpha-en-a-char',             { s3Key: 'audio/alphabet/en/a-character.mp3',     description: 'A' }],
  ['alpha-en-a-example',          { s3Key: 'audio/alphabet/en/a-example.mp3',       description: 'A for Apple' }],
  ['alpha-en-b-char',             { s3Key: 'audio/alphabet/en/b-character.mp3',     description: 'B' }],
  ['alpha-en-b-example',          { s3Key: 'audio/alphabet/en/b-example.mp3',       description: 'B for Ball' }],

  // ── Hindi Varnamala ────────────────────────────────────────────────────────
  ['alpha-hi-a-char',             { s3Key: 'audio/alphabet/hi/a-character.mp3',     description: 'अ' }],
  ['alpha-hi-a-example',          { s3Key: 'audio/alphabet/hi/a-example.mp3',       description: 'अ for अनार' }],

  // ── Kannada Varnamala ──────────────────────────────────────────────────────
  ['alpha-kn-a-char',             { s3Key: 'audio/alphabet/kn/a-character.mp3',     description: 'ಅ' }],
  ['alpha-kn-a-example',          { s3Key: 'audio/alphabet/kn/a-example.mp3',       description: 'ಅ for ಅಮ್ಮ' }],
])

/**
 * Resolve an approved asset ID to its S3 object key.
 *
 * @param {string} assetId
 * @returns {{ s3Key: string, description: string } | null}
 */
export function resolveAsset(assetId) {
  // Reject anything that doesn't look like a valid asset ID
  if (!/^[a-z0-9-]+$/.test(assetId)) return null

  return approvedAssets.get(assetId) ?? null
}
