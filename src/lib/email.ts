import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@send.snappcalls.app';

let resendInstance: Resend | null = null;

function getResendClient() {
  if (!RESEND_API_KEY) {
    console.warn('⚠️  Resend API key not configured - emails will not be sent');
    return null;
  }
  
  if (!resendInstance) {
    resendInstance = new Resend(RESEND_API_KEY);
  }
  return resendInstance;
}

/**
 * Sends a magic link email
 */
export async function sendMagicLinkEmail(
  to: string,
  magicLink: string
): Promise<{ id: string } | null> {
  try {
    const resend = getResendClient();
    if (!resend) {
      console.error('❌ Resend client not configured - check RESEND_API_KEY');
      return null;
    }

    console.log('📧 Attempting to send magic link email to:', to);

    const { data, error } = await resend.emails.send({
      from: `Snap Calls <${FROM_EMAIL}>`,
      to,
      subject: 'Sign in to Snap Calls',
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
                  <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">Snap Calls</h1>
                  <p style="color: #FF6B35; margin: 10px 0 0 0; font-size: 16px; font-weight: 500;">Never miss a job</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px 20px;">
                  <h2 style="color: #000000; margin: 0 0 20px 0; font-size: 24px;">Sign in to your account</h2>
                  <p style="color: #6b7280; margin: 0 0 30px 0; font-size: 16px; line-height: 1.5;">
                    Click the button below to sign in to your Snap Calls account. This link will expire in 15 minutes.
                  </p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${magicLink}" style="display: inline-block; background-color: #FF6B35; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
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
                    © ${new Date().getFullYear()} Snap Calls. Never miss a job.
                  </p>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Failed to send magic link email:', error);
      return null;
    }

    console.log('✅ Magic link email sent successfully. ID:', data?.id);
    return data;
  } catch (error) {
    console.error('❌ Error sending magic link email:', error);
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
  _alertLevel: number
): Promise<void> {
  try {
    const resend = getResendClient();
    if (!resend) {
      console.error('Resend client not configured');
      return;
    }

    await resend.emails.send({
      from: `Snap Calls Alerts <${FROM_EMAIL}>`,
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
                    Your Snap Calls wallet balance has dropped to <strong style="color: #DC2626;">$${balance.toFixed(2)}</strong>.
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
                    <a href="${process.env.APP_URL}/wallet" style="display: inline-block; background-color: #FF6B35; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
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
                    © ${new Date().getFullYear()} Snap Calls. Never miss a job.
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
    const resend = getResendClient();
    if (!resend) {
      console.error('Resend client not configured');
      return;
    }

    await resend.emails.send({
      from: `Snap Calls Notifications <${FROM_EMAIL}>`,
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
                  <div style="background-color: #FFF4ED; border-left: 4px solid #FF6B35; padding: 16px; margin: 20px 0; border-radius: 4px;">
                    <p style="color: #CC4A00; margin: 0; font-weight: 600;">Auto-response sent!</p>
                    <p style="color: #CC4A00; margin: 8px 0 0 0; font-size: 14px;">We automatically sent your ${messageType} message to this caller.</p>
                  </div>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.APP_URL}/calls" style="display: inline-block; background-color: #FF6B35; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      View Call Details
                    </a>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="background-color: #f9fafb; padding: 20px; text-align: center;">
                  <p style="color: #6b7280; margin: 0; font-size: 14px;">
                    © ${new Date().getFullYear()} Snap Calls. Never miss a job.
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

/**
 * Generic email sender for subscription events
 */
export async function sendEmail(
  to: string,
  options: {
    subject: string;
    template: string;
    data: Record<string, any>;
  }
): Promise<void> {
  try {
    const resend = getResendClient();
    if (!resend) {
      console.error('Resend client not configured');
      return;
    }

    const html = getEmailTemplate(options.template, options.data);

    await resend.emails.send({
      from: `Snap Calls <${FROM_EMAIL}>`,
      to,
      subject: options.subject,
      html,
    });
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}

/**
 * Gets email template HTML based on template name
 */
function getEmailTemplate(template: string, data: Record<string, any>): string {
  const templates: Record<string, (data: any) => string> = {
    'abuse-warning': (d) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <tr>
              <td style="background-color: #F59E0B; padding: 40px 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">⚠️ Important Notice</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px 20px;">
                <h2 style="color: #000000; margin: 0 0 20px 0; font-size: 24px;">Your Snap Number Is Not a Regular Phone Line</h2>
                <p style="color: #6b7280; margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">
                  You've received <strong>${d.callCount} direct calls</strong> this month on your Snap Number.
                </p>
                <p style="color: #6b7280; margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">
                  Your Snap Number is designed for missed call notifications — not as a primary phone line. Using it as a regular phone line is a violation of our Terms of Service.
                </p>
                <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin: 20px 0; border-radius: 4px;">
                  <p style="color: #92400E; margin: 0; font-weight: 600;">⚠️ Warning: Number will be suspended at ${d.suspensionThreshold} calls</p>
                  <p style="color: #92400E; margin: 8px 0 0 0; font-size: 14px;">If your direct call count reaches ${d.suspensionThreshold}, your Snap Number will be suspended. To continue using it as a full phone line, consider upgrading to a SnapLine.</p>
                </div>
                <p style="color: #6b7280; margin: 20px 0; font-size: 16px; line-height: 1.5;">
                  <strong>Want a full-service phone line?</strong> Upgrade to a SnapLine for only $20/month and use your number however you like.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.APP_URL}/upgrade-snapline" style="display: inline-block; background-color: #FF6B35; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                    Upgrade to SnapLine — $20/mo
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f9fafb; padding: 20px; text-align: center;">
                <p style="color: #6b7280; margin: 0; font-size: 14px;">
                  © ${new Date().getFullYear()} Snap Calls. Never miss a job.
                </p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    
    'service-suspended': (d) => `
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
                <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">🚫 Snap Number Suspended</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px 20px;">
                <h2 style="color: #000000; margin: 0 0 20px 0; font-size: 24px;">Your Snap Number Has Been Suspended</h2>
                <p style="color: #6b7280; margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">
                  We previously sent you a warning about using your Snap Number as a regular phone line. Your number has now received <strong>${d.callCount} direct calls</strong> this month, which violates our Terms of Service.
                </p>
                <p style="color: #6b7280; margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">
                  We're happy that you find SnapCalls so useful! Instead of revoking your number, we've <strong>suspended</strong> it until you upgrade.
                </p>
                <div style="background-color: #FFF4ED; border-left: 4px solid #FF6B35; padding: 16px; margin: 20px 0; border-radius: 4px;">
                  <p style="color: #CC4A00; margin: 0; font-weight: 600;">Upgrade to a SnapLine for only $20/month</p>
                  <p style="color: #CC4A00; margin: 8px 0 0 0; font-size: 14px;">A SnapLine is a full-service phone line — use your number however you like with no restrictions. Your existing wallet balance ($${d.walletBalance}) will still be used for missed call responses.</p>
                </div>
                ${d.phoneNumber && d.phoneNumber !== 'N/A' ? `
                <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 16px; margin: 20px 0; border-radius: 4px; text-align: center;">
                  <p style="color: #6b7280; margin: 0; font-size: 14px;">Your suspended number</p>
                  <p style="color: #000000; margin: 8px 0 0 0; font-size: 20px; font-weight: bold;">${d.phoneNumber}</p>
                </div>
                ` : ''}
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${d.snaplineUpgradeUrl}" style="display: inline-block; background-color: #FF6B35; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                    Upgrade to SnapLine — Only $20/mo
                  </a>
                </div>
                <p style="color: #6b7280; margin: 20px 0 0 0; font-size: 14px; line-height: 1.5; text-align: center;">
                  Thank you for your continued support — we truly appreciate it. 🧡
                </p>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f9fafb; padding: 20px; text-align: center;">
                <p style="color: #6b7280; margin: 0; font-size: 14px;">
                  © ${new Date().getFullYear()} Snap Calls. Never miss a job.
                </p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    
    'payment-method-required': () => `
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
                <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">⚠️ Action Required</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px 20px;">
                <h2 style="color: #000000; margin: 0 0 20px 0; font-size: 24px;">Payment Method Needed</h2>
                <p style="color: #6b7280; margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">
                  Your Snap Number has been suspended for TOS violation, and we need a payment method on file to upgrade you to a SnapLine.
                </p>
                <div style="background-color: #FEE2E2; border-left: 4px solid #DC2626; padding: 16px; margin: 20px 0; border-radius: 4px;">
                  <p style="color: #991B1B; margin: 0; font-weight: 600;">Add a payment method to upgrade</p>
                  <p style="color: #991B1B; margin: 8px 0 0 0; font-size: 14px;">Please add a payment method to upgrade to a SnapLine ($20/mo) and reactivate your number.</p>
                </div>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.APP_URL}/dashboard" style="display: inline-block; background-color: #FF6B35; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                    Add Payment Method
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f9fafb; padding: 20px; text-align: center;">
                <p style="color: #6b7280; margin: 0; font-size: 14px;">
                  © ${new Date().getFullYear()} Snap Calls. Never miss a job.
                </p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    
    'auto-reload-success': (d) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <tr>
              <td style="background-color: #10B981; padding: 40px 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">✅ Wallet Auto-Reloaded</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px 20px;">
                <h2 style="color: #000000; margin: 0 0 20px 0; font-size: 24px;">$${d.amount} Added to Your Wallet</h2>
                <p style="color: #6b7280; margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">
                  Your wallet balance was low, so we automatically reloaded it using your saved payment method.
                </p>
                <div style="background-color: #ECFDF5; border-left: 4px solid #10B981; padding: 16px; margin: 20px 0; border-radius: 4px;">
                  <p style="color: #065F46; margin: 0; font-weight: 600;">New Balance: $${d.newBalance}</p>
                </div>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.APP_URL}/wallet" style="display: inline-block; background-color: #FF6B35; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                    View Wallet
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f9fafb; padding: 20px; text-align: center;">
                <p style="color: #6b7280; margin: 0; font-size: 14px;">
                  © ${new Date().getFullYear()} Snap Calls. Never miss a job.
                </p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,

    'payment-failed': () => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <tr>
              <td style="background-color: #DC2626; padding: 40px 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">⚠️ Payment Failed</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px 20px;">
                <h2 style="color: #000000; margin: 0 0 20px 0; font-size: 24px;">Service Paused</h2>
                <p style="color: #6b7280; margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">
                  Your SnapLine subscription payment failed. Your service has been paused until payment is successful.
                </p>
                <div style="background-color: #FEE2E2; border-left: 4px solid #DC2626; padding: 16px; margin: 20px 0; border-radius: 4px;">
                  <p style="color: #991B1B; margin: 0; font-weight: 600;">Update your payment method</p>
                  <p style="color: #991B1B; margin: 8px 0 0 0; font-size: 14px;">Please update your payment method in your dashboard to restore service.</p>
                </div>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.APP_URL}/dashboard" style="display: inline-block; background-color: #FF6B35; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                    Update Payment Method
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f9fafb; padding: 20px; text-align: center;">
                <p style="color: #6b7280; margin: 0; font-size: 14px;">
                  © ${new Date().getFullYear()} Snap Calls. Never miss a job.
                </p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    
    'snapline-activated': () => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <tr>
              <td style="background-color: #FF6B35; padding: 40px 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">🎉 Welcome to SnapLine!</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px 20px;">
                <h2 style="color: #000000; margin: 0 0 20px 0; font-size: 24px;">You're all set!</h2>
                <p style="color: #6b7280; margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">
                  You've successfully upgraded to a SnapLine. Your number has been reactivated and is ready to use as a full-service phone line.
                </p>
                <p style="color: #6b7280; margin: 20px 0; font-size: 16px; line-height: 1.5;">
                  <strong>What you get with SnapLine:</strong>
                </p>
                <ul style="color: #6b7280; font-size: 16px; line-height: 1.8;">
                  <li>Full-service phone line — use your number however you like</li>
                  <li>No direct call limits</li>
                  <li>All existing features (missed call responses, etc.)</li>
                  <li>$20/month subscription + $1 per missed call response</li>
                </ul>
                <p style="color: #6b7280; margin: 20px 0 0 0; font-size: 14px; line-height: 1.5; text-align: center;">
                  Thank you for your continued support — we truly appreciate it. 🧡
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.APP_URL}/dashboard" style="display: inline-block; background-color: #FF6B35; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                    Go to Dashboard
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f9fafb; padding: 20px; text-align: center;">
                <p style="color: #6b7280; margin: 0; font-size: 14px;">
                  © ${new Date().getFullYear()} Snap Calls. Never miss a job.
                </p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    
    'admin-alert': (d) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #1f2937; padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #111827; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
            <tr>
              <td style="background-color: #DC2626; padding: 40px 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">🚨 SYSTEM ALERT</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px 20px;">
                <h2 style="color: #ffffff; margin: 0 0 20px 0; font-size: 24px;">${d.alertCount} Critical Issues Detected</h2>
                
                <div style="background-color: #1f2937; border-left: 4px solid #DC2626; padding: 16px; margin: 20px 0; border-radius: 4px;">
                  <p style="color: #FCA5A5; margin: 0; font-weight: 600; white-space: pre-line;">${d.alertList}</p>
                </div>
                
                <p style="color: #9ca3af; margin: 20px 0; font-size: 16px; line-height: 1.5;">
                  Immediate action required. Check the admin dashboard for full details and remediation options.
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${d.dashboardUrl}" style="display: inline-block; background-color: #DC2626; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                    Open Admin Dashboard
                  </a>
                </div>
                
                <p style="color: #6b7280; margin: 30px 0 0 0; font-size: 14px; line-height: 1.5;">
                  This is an automated alert from Snap Calls monitoring system.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background-color: #1f2937; padding: 20px; text-align: center;">
                <p style="color: #6b7280; margin: 0; font-size: 14px;">
                  Snap Calls Admin Monitoring
                </p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  };

  const templateFn = templates[template];
  if (!templateFn) {
    console.error('Unknown email template:', template);
    return '';
  }

  return templateFn(data);
}

