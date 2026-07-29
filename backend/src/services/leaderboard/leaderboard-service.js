import { redisClient } from '../../lib/redis.js'
import { prisma } from '../../lib/prisma.js'

/**
 * Updates the leaderboard for a specific exam attempt.
 * Pushes the student's score into an exam-specific leaderboard
 * and an overall classroom leaderboard.
 *
 * @param {string} examId
 * @param {string} studentId
 * @param {string} classroomId
 * @param {number} totalAwarded
 */
export async function updateLeaderboard(examId, studentId, classroomId, totalAwarded) {
  if (!redisClient) return // Silent fail if Redis isn't configured

  try {
    // 1. Exam-specific Leaderboard
    const examKey = `leaderboard:exam:${examId}`
    await redisClient.zadd(examKey, totalAwarded, studentId)

    // 2. Overall Classroom Leaderboard (cumulative)
    const classroomKey = `leaderboard:classroom:${classroomId}`
    await redisClient.zadd(classroomKey, 'INCR', totalAwarded, studentId)
    
  } catch (error) {
    console.error('Failed to update leaderboard in Redis:', error)
  }
}

/**
 * Retrieves the top N students for a given leaderboard key
 */
export async function getLeaderboard(key, limit = 10) {
  if (!redisClient) return []

  try {
    // ZREVRANGE to get highest scores first
    const results = await redisClient.zrevrange(key, 0, limit - 1, 'WITHSCORES')
    
    // Parse the results [studentId1, score1, studentId2, score2, ...]
    const leaderboard = []
    for (let i = 0; i < results.length; i += 2) {
      leaderboard.push({
        studentId: results[i],
        score: parseFloat(results[i + 1]),
      })
    }

    // Optionally attach student details
    if (leaderboard.length > 0) {
      const studentIds = leaderboard.map(l => l.studentId)
      const students = await prisma.user.findMany({
        where: { id: { in: studentIds } },
        select: { id: true, displayName: true, username: true }
      })
      
      const studentMap = students.reduce((acc, s) => {
        acc[s.id] = s
        return acc
      }, {})

      return leaderboard.map(l => ({
        ...l,
        student: studentMap[l.studentId] || { displayName: 'Unknown' }
      }))
    }

    return leaderboard
  } catch (error) {
    console.error('Failed to fetch leaderboard from Redis:', error)
    return []
  }
}
