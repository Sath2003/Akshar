import { isValidLanguage } from '@education/shared'
import { englishAlphabet } from './alphabet/english.js'
import { hindiAlphabet } from './alphabet/hindi.js'
import { kannadaAlphabet } from './alphabet/kannada.js'
import { learningWorlds } from './worlds.js'

export function validateContent() {
  const errors = []

  const allIds = new Set()
  const checkDuplicateId = (id, file) => {
    if (id && allIds.has(id)) {
      errors.push({ file, message: `Duplicate content ID: ${id}` })
    } else if (id) {
      allIds.add(id)
    }
  }

  const checkAlphabet = (alphabet, file, lang) => {
    if (!['en', 'hi', 'kn'].includes(lang)) {
      errors.push({ file, message: `Invalid language: ${lang}` })
    }
    const displayOrders = new Set()

    for (const entry of alphabet) {
      if (entry.id) checkDuplicateId(entry.id, file)

      if (!entry.character) {
        errors.push({ file, message: `Missing character in ${entry.id || 'unknown'}` })
      }
      if (!entry.exampleWord) {
        errors.push({ file, message: `Missing example word for ${entry.character}` })
      }
      if (!entry.exampleSentence) {
        errors.push({ file, message: `Missing example sentence for ${entry.character}` })
      }
      if (typeof entry.displayOrder !== 'number' || entry.displayOrder < 0) {
        errors.push({ file, message: `Invalid display order for ${entry.character}` })
      } else {
        if (displayOrders.has(entry.displayOrder)) {
          errors.push({
            file,
            message: `Duplicate display order ${entry.displayOrder} for ${entry.character}`,
          })
        }
        displayOrders.add(entry.displayOrder)
      }
      if (entry.imageData && !entry.imageAlt) {
        errors.push({ file, message: `Missing image alt text for ${entry.character}` })
      }
    }
  }

  checkAlphabet(englishAlphabet, 'alphabet/english', 'en')
  checkAlphabet(hindiAlphabet, 'alphabet/hindi', 'hi')
  checkAlphabet(kannadaAlphabet, 'alphabet/kannada', 'kn')

  // Check learning worlds
  for (const world of learningWorlds) {
    if (!world.slug) {
      errors.push({ file: 'worlds', message: 'Missing world slug' })
    }
    if (world.id) checkDuplicateId(world.id, 'worlds')
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
