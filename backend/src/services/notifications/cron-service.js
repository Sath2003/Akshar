import cron from 'node-cron'
import { prisma } from '../../lib/prisma.js'
import { sendEmail } from './notification-service.js'

export function initCronJobs(app) {
  // Run every day at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    app.log.info('Running daily low activity check cron job')
    try {
      // Find students who haven't logged in for 3 days
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

      const inactiveStudents = await prisma.user.findMany({
        where: {
          role: 'STUDENT',
          status: 'ACTIVE',
          email: { not: null },
          OR: [
            { lastLoginAt: null },
            { lastLoginAt: { lt: threeDaysAgo } }
          ]
        },
        select: { displayName: true, email: true, username: true }
      })

      for (const student of inactiveStudents) {
        await sendEmail({
          to: student.email,
          subject: 'We miss you at Akshar!',
          text: `Hi ${student.displayName}, you haven't logged in for a few days. Come back and keep learning!`,
          html: `<p>Hi ${student.displayName},</p><p>You haven't logged in for a few days. Come back and keep learning!</p>`
        })
      }

      app.log.info(`Low activity emails sent to ${inactiveStudents.length} students`)
    } catch (error) {
      app.log.error('Cron job error: ' + error.message)
    }
  })
}
