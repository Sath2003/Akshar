import sgMail from '@sendgrid/mail'
import twilio from 'twilio'
import { env } from '../../env.js'

let twilioClient = null
if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
}

if (env.SENDGRID_API_KEY) {
  sgMail.setApiKey(env.SENDGRID_API_KEY)
}

/**
 * Send an email using SendGrid
 */
export async function sendEmail({ to, subject, text, html }) {
  if (!env.SENDGRID_API_KEY || !env.SENDGRID_FROM_EMAIL) {
    console.warn(`[Email Notification Skipped] Missing SendGrid config. To: ${to}, Subject: ${subject}`)
    return false
  }

  try {
    await sgMail.send({
      to,
      from: env.SENDGRID_FROM_EMAIL,
      subject,
      text,
      html,
    })
    return true
  } catch (error) {
    console.error('SendGrid email error:', error)
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
