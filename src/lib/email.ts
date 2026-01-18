import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@snapback.app';

if (!RESEND_API_KEY) {
  console.warn('⚠️  Resend API key not configured');
}

const resend = new Resend(RESEND_API_KEY);

/**
 * Sends a magic link email
 */
export async function sendMagicLinkEmail(
  to: string,
  magicLink: string
): Promise<{ id: string } | null> {
  try {
    const { data, error } = await resend.emails.send({
      from: `Snapback <${FROM_EMAIL}>`,
      to,
      subject: 'Sign in to Snapback',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; padding: 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <tr>
                <td style="background-color: #000000; padding: 40px 20px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">Snapback</h1>
                  <p style="color: #0EA5E9; margin: 10px 0 0 0; font-size: 16px; font-weight: 500;">It's a snap</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px 20px;">
                  <h2 style="color: #000000; margin: 0 0 20px 0; font-size: 24px;">Sign in to your account</h2>
                  <p style="color: #6b7280; margin: 0 0 30px 0; font-size: 16px; line-height: 1.5;">
                    Click the button below to sign in to your Snapback account. This link will expire in 15 minutes.
                  </p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${magicLink}" style="display: inline-block; background-color: #0EA5E9; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Sign In
                    </a>
                  </div>
                  <p style="color: #9ca3af; margin: 30px 0 0 0; font-size: 14px; line-height: 1.5;">
                    If you didn't request this email, you can safely ignore it.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color: #f9fafb; padding: 20px; text-align: center;">
                  <p style="color: #6b7280; margin: 0; font-size: 14px;">
                    © ${new Date().getFullYear()} Snapback. Never miss another customer.
                  </p>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Failed to send magic link email:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error sending magic link email:', error);
    return null;
  }
}

/**
 * Sends a low balance alert email
 */
export async function sendLowBalanceAlertEmail(
  to: string,
  businessName: string,
  balance: number,
  alertLevel: number
): Promise<void> {
  try {
    await resend.emails.send({
      from: `Snapback Alerts <${FROM_EMAIL}>`,
      to,
      subject: `⚠️ Wallet Balance Alert - $${balance.toFixed(2)} Remaining`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; padding: 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <tr>
                <td style="background-color: #DC2626; padding: 40px 20px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">⚠️ Low Balance Alert</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px 20px;">
                  <h2 style="color: #000000; margin: 0 0 20px 0; font-size: 24px;">Your wallet balance is low</h2>
                  <p style="color: #6b7280; margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">
                    Hi ${businessName},
                  </p>
                  <p style="color: #6b7280; margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">
                    Your Snapback wallet balance has dropped to <strong style="color: #DC2626;">$${balance.toFixed(2)}</strong>.
                  </p>
                  ${balance === 0 ? `
                    <div style="background-color: #FEE2E2; border-left: 4px solid #DC2626; padding: 16px; margin: 20px 0; border-radius: 4px;">
                      <p style="color: #991B1B; margin: 0; font-weight: 600;">Service Paused</p>
                      <p style="color: #991B1B; margin: 8px 0 0 0; font-size: 14px;">Your service has been automatically paused. Add funds to resume responding to missed calls.</p>
                    </div>
                  ` : `
                    <p style="color: #6b7280; margin: 0 0 30px 0; font-size: 16px; line-height: 1.5;">
                      To continue responding to missed calls, please add funds to your wallet.
                    </p>
                  `}
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.APP_URL}/wallet" style="display: inline-block; background-color: #0EA5E9; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Add Funds Now
                    </a>
                  </div>
                  <p style="color: #9ca3af; margin: 30px 0 0 0; font-size: 14px; line-height: 1.5;">
                    Consider enabling auto-reload to never miss a call!
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color: #f9fafb; padding: 20px; text-align: center;">
                  <p style="color: #6b7280; margin: 0; font-size: 14px;">
                    © ${new Date().getFullYear()} Snapback. Never miss another customer.
                  </p>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });
  } catch (error) {
    console.error('Failed to send low balance alert email:', error);
  }
}

/**
 * Sends a missed call notification email
 */
export async function sendMissedCallNotificationEmail(
  to: string,
  businessName: string,
  callerNumber: string,
  callerName: string | null,
  messageType: string,
  timestamp: Date
): Promise<void> {
  try {
    await resend.emails.send({
      from: `Snapback Notifications <${FROM_EMAIL}>`,
      to,
      subject: `📞 Missed Call from ${callerName || callerNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; padding: 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <tr>
                <td style="background-color: #000000; padding: 40px 20px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">📞 Missed Call</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px 20px;">
                  <h2 style="color: #000000; margin: 0 0 20px 0; font-size: 24px;">${callerName || 'New Caller'}</h2>
                  <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 16px;">
                    <strong>Phone:</strong> ${callerNumber}
                  </p>
                  <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 16px;">
                    <strong>Time:</strong> ${timestamp.toLocaleString()}
                  </p>
                  <p style="color: #6b7280; margin: 0 0 20px 0; font-size: 16px;">
                    <strong>Response Type:</strong> ${messageType}
                  </p>
                  <div style="background-color: #F0F9FF; border-left: 4px solid #0EA5E9; padding: 16px; margin: 20px 0; border-radius: 4px;">
                    <p style="color: #0C4A6E; margin: 0; font-weight: 600;">Auto-response sent!</p>
                    <p style="color: #0C4A6E; margin: 8px 0 0 0; font-size: 14px;">We automatically sent your ${messageType} message to this caller.</p>
                  </div>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.APP_URL}/calls" style="display: inline-block; background-color: #0EA5E9; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      View Call Details
                    </a>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="background-color: #f9fafb; padding: 20px; text-align: center;">
                  <p style="color: #6b7280; margin: 0; font-size: 14px;">
                    © ${new Date().getFullYear()} Snapback. Never miss another customer.
                  </p>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });
  } catch (error) {
    console.error('Failed to send missed call notification email:', error);
  }
}
