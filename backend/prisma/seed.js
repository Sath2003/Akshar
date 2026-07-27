import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/password.js'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  const schoolName = process.env.SEED_SCHOOL_NAME || 'Akshar International School'
  const schoolCode = process.env.SEED_SCHOOL_CODE || 'AKSHAR01'
  const adminUsername = process.env.SEED_ADMIN_USERNAME || 'admin'
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'adminpassword123'
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@sathvikdevops.online'

  if (!adminPassword || adminPassword === 'replace-with-strong-password') {
    throw new Error('SEED_ADMIN_PASSWORD environment variable is not configured or uses placeholder')
  }

  // 1. Create School
  const school = await prisma.school.upsert({
    where: { code: schoolCode },
    update: { name: schoolName },
    create: {
      name: schoolName,
      code: schoolCode,
      status: 'ACTIVE',
    },
  })
  console.log(`🏫 School created/upserted: ${school.name} (${school.code})`)

  // 2. Create Admin User
  const normalizedUsername = adminUsername.toLowerCase()
  const passwordHash = await hashPassword(adminPassword)

  const admin = await prisma.user.upsert({
    where: {
      schoolId_usernameNormalized: {
        schoolId: school.id,
        usernameNormalized: normalizedUsername,
      },
    },
    update: {
      email: adminEmail,
      displayName: 'Administrator',
      passwordHash: passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
    create: {
      schoolId: school.id,
      username: adminUsername,
      usernameNormalized: normalizedUsername,
      email: adminEmail,
      displayName: 'Administrator',
      passwordHash: passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  })
  console.log(`👤 Admin user created/upserted: ${admin.username}`)

  // 3. Create Classrooms
  const classroomData = [
    { name: 'Nursery Section A', gradeLevel: 'NURSERY', section: 'A', academicYear: '2026-2027' },
    { name: 'LKG Section A', gradeLevel: 'LKG', section: 'A', academicYear: '2026-2027' },
    { name: 'UKG Section A', gradeLevel: 'UKG', section: 'A', academicYear: '2026-2027' },
  ]

  const classrooms = []
  for (const c of classroomData) {
    const existing = await prisma.classroom.findFirst({
      where: {
        schoolId: school.id,
        gradeLevel: c.gradeLevel,
        section: c.section,
        academicYear: c.academicYear,
      },
    })

    if (existing) {
      classrooms.push(existing)
    } else {
      const created = await prisma.classroom.create({
        data: {
          schoolId: school.id,
          name: c.name,
          gradeLevel: c.gradeLevel,
          section: c.section,
          academicYear: c.academicYear,
          status: 'ACTIVE',
        },
      })
      classrooms.push(created)
    }
  }
  console.log(`🏢 ${classrooms.length} Classrooms created or matched.`)

  // 4. Create Subjects
  const subjectData = [
    { name: 'English', code: 'ENG-01', language: 'en' },
    { name: 'Hindi', code: 'HIN-01', language: 'hi' },
    { name: 'Kannada', code: 'KAN-01', language: 'kn' },
  ]

  const subjects = []
  for (const s of subjectData) {
    const existing = await prisma.subject.findFirst({
      where: {
        schoolId: school.id,
        code: s.code,
      },
    })

    if (existing) {
      subjects.push(existing)
    } else {
      const created = await prisma.subject.create({
        data: {
          schoolId: school.id,
          name: s.name,
          code: s.code,
          language: s.language,
          status: 'ACTIVE',
        },
      })
      subjects.push(created)
    }
  }
  console.log(`📚 ${subjects.length} Subjects created or matched.`)

  console.log('✅ Database seed completed successfully.')
}

main()
  .catch((e) => {
    console.error('❌ Database seed failed:')
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
