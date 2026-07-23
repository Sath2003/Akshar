import { isValidLanguage } from '@education/shared'
import { englishAlphabet } from './alphabet/english.js'
import { hindiAlphabet } from './alphabet/hindi.js'
import { kannadaAlphabet } from './alphabet/kannada.js'
import { learningWorlds } from './worlds.js'

export interface ValidationError {
  file: string
  message: string
}

export function validateContent(): ValidationError[] {
  const errors: ValidationError[] = []

  // Check English alphabet
  for (const entry of englishAlphabet) {
    if (!entry.character) {
      errors.push({ file: 'alphabet/english', message: 'Missing character' })
    }
  }

  // Check Hindi alphabet
  for (const entry of hindiAlphabet) {
    if (!entry.character) {
      errors.push({ file: 'alphabet/hindi', message: 'Missing character' })
    }
  }

  // Check Kannada alphabet
  for (const entry of kannadaAlphabet) {
    if (!entry.character) {
      errors.push({ file: 'alphabet/kannada', message: 'Missing character' })
    }
  }

  // Check learning worlds
  for (const world of learningWorlds) {
    if (!world.slug) {
      errors.push({ file: 'worlds', message: 'Missing slug' })
    }
  }

  return errors
}

// CLI runner
const errors = validateContent()
if (errors.length === 0) {
  console.log('✅ Content validation passed.')
  process.exit(0)
} else {
  console.error('❌ Content validation failed:')
  for (const err of errors) {
    console.error(`  [${err.file}] ${err.message}`)
  }
  process.exit(1)
}
