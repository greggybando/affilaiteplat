import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
}

export async function sendEmail(options: EmailOptions) {
  try {
    if (!resend || !process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured')
      return { success: false, error: 'Email service not configured' }
    }

    const result = await resend.emails.send({
      from: options.from || 'LifeDesign Community <community@lifedesign.com>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    })

    return { success: true, id: result.data?.id }
  } catch (error: any) {
    console.error('Error sending email:', error)
    return { success: false, error: error.message }
  }
}

export function generateEmailTemplate(content: {
  title: string
  body: string
  buttonText?: string
  buttonUrl?: string
  unsubscribeUrl?: string
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%); border-radius: 8px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                <span style="color: #ffffff; font-size: 24px; font-weight: bold;">L</span>
              </div>
              <h1 style="margin: 0; color: #111827; font-size: 24px; font-weight: bold;">LifeDesign Community</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: 600;">${content.title}</h2>
              <div style="color: #374151; font-size: 16px; line-height: 1.6;">
                ${content.body}
              </div>
              ${content.buttonUrl && content.buttonText ? `
              <div style="margin: 32px 0 0; text-align: center;">
                <a href="${content.buttonUrl}" style="display: inline-block; padding: 12px 24px; background-color: #9333ea; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">${content.buttonText}</a>
              </div>
              ` : ''}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 12px; color: #6b7280; font-size: 14px;">
                You're receiving this because you're a member of LifeDesign Community
              </p>
              ${content.unsubscribeUrl ? `
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                <a href="${content.unsubscribeUrl}" style="color: #9333ea; text-decoration: none;">Unsubscribe</a>
              </p>
              ` : ''}
              <p style="margin: 12px 0 0; color: #9ca3af; font-size: 12px;">
                LifeDesign Platform<br>
                123 Main St, City, State 12345
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

