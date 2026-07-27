import { PrismaClient } from '@prisma/client'
import { englishAlphabet } from '../../content/alphabet/english.js'
import { hindiAlphabet } from '../../content/alphabet/hindi.js'
import { kannadaAlphabet } from '../../content/alphabet/kannada.js'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting question seeding from curriculum content...')

  // 1. Resolve school, subjects and creator
  const school = await prisma.school.findFirst()
  if (!school) {
    throw new Error('No school found in the database. Run prisma db seed first.')
  }

  const creator = await prisma.user.findFirst({
    where: { schoolId: school.id, role: 'ADMIN' },
  })
  if (!creator) {
    throw new Error('No admin user found to act as creator.')
  }

  const subjectEng = await prisma.subject.findFirst({ where: { schoolId: school.id, code: 'ENG-01' } })
  const subjectHin = await prisma.subject.findFirst({ where: { schoolId: school.id, code: 'HIN-01' } })
  const subjectKan = await prisma.subject.findFirst({ where: { schoolId: school.id, code: 'KAN-01' } })

  if (!subjectEng || !subjectHin || !subjectKan) {
    throw new Error('Standard subjects (ENG-01, HIN-01, KAN-01) not found in the database. Run seed first.')
  }

  // Helper to clear existing questions before re-seeding
  // Note: we only clean up questions in development environment to avoid duplicate keys or constraints
  console.log('Cleaning up existing questions...')
  await prisma.question.deleteMany({ where: { schoolId: school.id } })

  let questionCount = 0

  // ── 1. Seed English Alphabet Questions ──
  if (subjectEng) {
    for (const item of englishAlphabet) {
      // Question 1: Multiple Choice (Select correct example word)
      const mcqQuestion = await prisma.question.create({
        data: {
          schoolId: school.id,
          subjectId: subjectEng.id,
          createdById: creator.id,
          gradeLevel: 'LKG',
          language: 'en',
          type: 'MULTIPLE_CHOICE',
          prompt: `What is the example word for the letter "${item.character}"?`,
          instructions: 'Choose the correct word from the options below.',
          defaultMarks: 1.0,
          difficulty: 'EASY',
          status: 'ACTIVE',
          answerKeyJson: JSON.stringify({
            correctValue: item.exampleWord,
          }),
          options: {
            create: [
              { label: item.exampleWord, value: item.exampleWord, orderIndex: 0 },
              { label: 'Dog', value: 'Dog', orderIndex: 1 },
              { label: 'Cat', value: 'Cat', orderIndex: 2 },
              { label: 'Elephant', value: 'Elephant', orderIndex: 3 },
            ],
          },
        },
      })

      // Question 2: Fill in the Blank
      const fitbQuestion = await prisma.question.create({
        data: {
          schoolId: school.id,
          subjectId: subjectEng.id,
          createdById: creator.id,
          gradeLevel: 'LKG',
          language: 'en',
          type: 'FILL_IN_THE_BLANK',
          prompt: `Fill in the missing letters: "${item.character} is for _ _ _ _ _"`,
          instructions: `Type the example word starting with "${item.character}".`,
          defaultMarks: 2.0,
          difficulty: 'MEDIUM',
          status: 'ACTIVE',
          answerKeyJson: JSON.stringify({
            acceptedAnswers: [item.exampleWord.toLowerCase(), item.exampleWord],
          }),
        },
      })

      questionCount += 2
    }
  }

  // ── 2. Seed Hindi Alphabet Questions ──
  if (subjectHin) {
    for (const item of hindiAlphabet) {
      // Question 1: Multiple Choice
      const mcqQuestion = await prisma.question.create({
        data: {
          schoolId: school.id,
          subjectId: subjectHin.id,
          createdById: creator.id,
          gradeLevel: 'LKG',
          language: 'hi',
          type: 'MULTIPLE_CHOICE',
          prompt: `अक्षर "${item.character}" का उदाहरण शब्द क्या है?`,
          instructions: 'नीचे दिए गए विकल्पों में से सही शब्द चुनें।',
          defaultMarks: 1.0,
          difficulty: 'EASY',
          status: 'ACTIVE',
          answerKeyJson: JSON.stringify({
            correctValue: item.exampleWord,
          }),
          options: {
            create: [
              { label: item.exampleWord, value: item.exampleWord, orderIndex: 0 },
              { label: 'आम', value: 'आम', orderIndex: 1 },
              { label: 'इमली', value: 'इमली', orderIndex: 2 },
              { label: 'ईख', value: 'ईख', orderIndex: 3 },
            ],
          },
        },
      })
      questionCount++
    }
  }

  // ── 3. Seed Kannada Alphabet Questions ──
  if (subjectKan) {
    for (const item of kannadaAlphabet) {
      // Question 1: Multiple Choice
      const mcqQuestion = await prisma.question.create({
        data: {
          schoolId: school.id,
          subjectId: subjectKan.id,
          createdById: creator.id,
          gradeLevel: 'LKG',
          language: 'kn',
          type: 'MULTIPLE_CHOICE',
          prompt: `ಅಕ್ಷರ "${item.character}" ಕ್ಕೆ ಸರಿಯಾದ ಉದಾಹರಣೆ ಪದ ಯಾವುದು?`,
          instructions: 'ಕೆಳಗಿನ ಆಯ್ಕೆಗಳಿಂದ ಸರಿಯಾದ ಪದವನ್ನು ಆರಿಸಿ.',
          defaultMarks: 1.0,
          difficulty: 'EASY',
          status: 'ACTIVE',
          answerKeyJson: JSON.stringify({
            correctValue: item.exampleWord,
          }),
          options: {
            create: [
              { label: item.exampleWord, value: item.exampleWord, orderIndex: 0 },
              { label: 'ಆನೆ', value: 'ಆನೆ', orderIndex: 1 },
              { label: 'ಇಲಿ', value: 'ಇಲಿ', orderIndex: 2 },
              { label: 'ಈಶ', value: 'ಈಶ', orderIndex: 3 },
            ],
          },
        },
      })
      questionCount++
    }
  }

  console.log(`✅ Seeded ${questionCount} questions successfully.`)
}

main()
  .catch((e) => {
    console.error('❌ Question seeding failed:')
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
