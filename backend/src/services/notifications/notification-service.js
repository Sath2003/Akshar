import nodemailer from 'nodemailer'
import twilio from 'twilio'
import { parseEnv } from '../../env.js'

const env = parseEnv()

let twilioClient = null
if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
}

let transporter = null
if (env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465, // true for 465, false for other ports
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  })
}

/**
 * Send an email using SMTP (Nodemailer)
 */
export async function sendEmail({ to, subject, text, html }) {
  if (!transporter || !env.SMTP_FROM_EMAIL) {
    console.warn(`[Email Notification Skipped] Missing SMTP config. To: ${to}, Subject: ${subject}`)
    return false
  }

  try {
    await transporter.sendMail({
      from: env.SMTP_FROM_EMAIL,
      to,
      subject,
      text,
      html,
    })
    return true
  } catch (error) {
    console.error('SMTP email error:', error)
    return false
  }
}

/**
 * Send an SMS using Twilio
 */
export async function sendSMS({ to, body }) {
  if (!twilioClient || !env.TWILIO_PHONE_NUMBER) {
    console.warn(`[SMS Notification Skipped] Missing Twilio config. To: ${to}, Body: ${body}`)
    return false
  }

  try {
    await twilioClient.messages.create({
      body,
      from: env.TWILIO_PHONE_NUMBER,
      to,
    })
    return true
  } catch (error) {
    console.error('Twilio SMS error:', error)
    return false
  }
}
