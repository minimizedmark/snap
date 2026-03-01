import { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { prisma } from '@/lib/prisma';
import { calculateCallCost, PRICING, toDecimal, fromDecimal } from '@/lib/pricing';
import { debitWallet, getWalletBalance, checkAndRecordLowBalanceAlert, InsufficientBalanceError } from '@/lib/wallet';
import { sendOwnerNotification, normalizePhoneNumber, validateTwilioSignature } from '@/lib/twilio';
import { sendSmsFromNumber } from '@/lib/twilio-provisioning';
import { sendLowBalanceAlertEmail, sendMissedCallNotificationEmail } from '@/lib/email';
import { isWithinBusinessHours, formatBusinessHours } from '@/lib/utils';
import { transcribeVoicemail } from '@/lib/transcription';
import { generateCallResponse } from '@/lib/ai-writer';
import { env } from '@/lib/env';

/**
 * THE MONEY PRINTER 💰
 * Critical webhook handler for Twilio missed call notifications
 * Must respond within 1 second with 200 OK
 *
 * SECURITY: Validates Twilio signature before any processing.
 * Without this, anyone who finds the URL can drain wallets and generate
 * fraudulent call logs for free. Not ideal.
 */
export async function POST(req: NextRequest) {
  // Validate Twilio signature BEFORE doing anything else.
  // Twilio signs every request with HMAC-SHA1 using your auth token.
  // We must read the raw body first, then reconstruct it for validation.
  const rawBody = await req.text();

  const signature = req.headers.get('x-twilio-signature') ?? '';

  // Build the full URL Twilio signed — must match exactly what Twilio sent to
  const url = `${env.APP_URL}/api/webhooks/twilio/call`;

  // Parse the form-encoded body into a params map for Twilio's validator
  const params: Record<string, string> = {};
  new URLSearchParams(rawBody).forEach((value, key) => {
    params[key] = value;
  });

  const isValid = validateTwilioSignature(signature, url, params);

  if (!isValid) {
    console.error('❌ Invalid Twilio signature on call webhook — rejecting request');
    return new Response('Forbidden', { status: 403 });
  }

  // IMMEDIATE 200 OK RESPONSE
  // waitUntil tells Vercel to keep the lambda alive until processing completes.
  // Without this, the runtime is killed the moment we return — mid-SMS, mid-debit.
  waitUntil(
    processCallAsync(params).catch((error) => {
      console.error('❌ Async call processing error:', error);
    })
  );

  return new Response('OK', { status: 200 });
}

/**
 * Processes the call asynchronously.
 * Receives pre-parsed params because the raw body was already consumed
 * during Twilio signature validation above.
 */
async function processCallAsync(payload: Record<string, string>) {
  try {
    const {
      CallSid: twilioCallSid,
      From: callerNumber,
      To: businessNumber,
      RecordingUrl: voicemailUrl,
    } = payload;

    if (!twilioCallSid || !callerNumber || !businessNumber) {
      console.error('❌ Missing required webhook parameters');
      return;
    }

    // Check for duplicate (prevent double charging)
    const existingCall = await prisma.callLog.findUnique({
      where: { twilioCallSid },
    });

    if (existingCall) {
      console.warn('⚠️  Duplicate call webhook received:', twilioCallSid);
      return;
    }

    // Lookup user by phone number
    const twilioConfig = await prisma.twilioConfig.findFirst({
      where: {
        phoneNumber: businessNumber,
        verified: true,
      },
      include: {
        user: {
          include: {
            businessSettings: true,
            userFeatures: true,
            notificationSettings: true,
            wallet: true,
          },
        },
      },
    });

    if (!twilioConfig) {
      console.error('❌ No verified Twilio config found for:', businessNumber);
      return;
    }

    const user = twilioConfig.user;

    if (!user.businessSettings || !user.wallet) {
      console.error('❌ User not fully configured:', user.id);
      return;
    }

    // Track regular calls for abuse prevention (BASIC plan only)
    // If user is using this number for regular calls (not just forwarding),
    // they'll hit warning at 15 calls and suspension at 20 calls
    if (user.subscriptionType === 'BASIC') {
      const { incrementRegularCallCount } = await import('@/lib/subscription');
      await incrementRegularCallCount(user.id);
    }

    // Check wallet balance — must have at least MINIMUM_BALANCE to process any call
    const currentBalance = fromDecimal(user.wallet.balance);

    if (currentBalance < PRICING.MINIMUM_BALANCE) {
      console.warn('⚠️  Insufficient balance for user:', user.id, 'Balance:', currentBalance);

      // Alert at MINIMUM_BALANCE level — wallet is below the floor to process any call
      await sendLowBalanceAlert(user.id, user.email, user.businessSettings.businessName, currentBalance, PRICING.MINIMUM_BALANCE);

      return;
    }

    // Check if caller is VIP
    const normalizedCallerNumber = normalizePhoneNumber(callerNumber);
    const vipContact = await prisma.vipContact.findFirst({
      where: {
        userId: user.id,
        phoneNumber: normalizedCallerNumber,
      },
    });

    const isVip = !!vipContact;
    const callerName = vipContact?.name || null;

    // Check business hours
    const isBusinessHours = isWithinBusinessHours(
      user.businessSettings.timezone,
      user.businessSettings.hoursStart,
      user.businessSettings.hoursEnd,
      user.businessSettings.daysOpen
    );

    // Check for voicemail
    const hasVoicemail = !!voicemailUrl;

    // Determine response type for logging/billing
    let responseType: string;
    if (!isBusinessHours) {
      responseType = 'after_hours';
    } else if (hasVoicemail) {
      responseType = 'voicemail';
    } else {
      responseType = 'standard';
    }

    // STEP 1: Transcribe voicemail with Whisper if one was left.
    // Transcription feeds into the AI writer for a contextual response.
    // Hang-ups get null here — the AI writer handles that case differently.
    let voicemailTranscript: string | null = null;
    if (hasVoicemail && voicemailUrl) {
      voicemailTranscript = await transcribeVoicemail(voicemailUrl);
    }

    // STEP 2: Generate personalized SMS via AI write bot.
    // Self-hosted model server (or OpenAI fallback) uses business context +
    // voicemail transcript (if any) to write a contextual, human-sounding reply.
    const formattedHours = formatBusinessHours(
      user.businessSettings.hoursStart,
      user.businessSettings.hoursEnd
    );

    const messageSent = await generateCallResponse({
      businessName: user.businessSettings.businessName,
      industry: user.businessSettings.industry,
      callerName,
      businessHours: formattedHours,
      isBusinessHours,
      voicemailTranscript,
    });

    // Check if caller is repeat caller (for recognition cost)
    const previousCalls = await prisma.callLog.count({
      where: {
        userId: user.id,
        callerNumber: normalizedCallerNumber,
      },
    });
    const isRepeatCaller = previousCalls > 0;

    // Calculate costs
    const features = user.userFeatures || {
      sequencesEnabled: false,
      recognitionEnabled: false,
      twoWayEnabled: false,
      vipPriorityEnabled: false,
      transcriptionEnabled: false,
    };

    const pricing = calculateCallCost({
      isVip,
      hasVoicemail,
      sequencesEnabled: features.sequencesEnabled,
      recognitionEnabled: features.recognitionEnabled,
      twoWayEnabled: features.twoWayEnabled,
      vipPriorityEnabled: features.vipPriorityEnabled,
      transcriptionEnabled: features.transcriptionEnabled,
      isRepeatCaller,
      customerReplied: false,
    });

    /**
     * BILLING PHILOSOPHY: Charge on attempt, not on success
     *
     * We always charge for the call even if SMS delivery fails because:
     * 1. We incurred Twilio costs attempting the service
     * 2. The user configured the service and requested the response
     * 3. Transient failures shouldn't let users game the system
     *
     * The flow is:
     * 1. Attempt SMS (may fail due to Twilio errors, invalid number, etc.)
     * 2. Always debit wallet regardless of SMS outcome
     * 3. Record both statuses in call log for transparency
     * 4. If wallet debit fails due to insufficient funds, alert user and bail
     * 5. If wallet debit fails for any other reason, log for manual review
     *
     * NOTE: We do NOT re-check balance here before the debit. The balance
     * read at the top of this function is stale by this point (transcription +
     * AI generation = several seconds of drift). debitWallet's atomic WHERE
     * clause is the only reliable guard — it checks and debits in one DB op.
     */

    // Attempt to send SMS — capture status but never return early
    let smsStatus = 'pending';
    let smsMessageSid: string | null = null;
    let smsError: Error | null = null;

    try {
      const smsResult = await sendSmsFromNumber(
        businessNumber,
        callerNumber,
        messageSent
      );

      smsStatus = smsResult.status;
      smsMessageSid = smsResult.sid;
      console.log(`✅ SMS sent: ${smsMessageSid} (${smsStatus})`);
    } catch (error) {
      smsError = error as Error;
      console.error('❌ SMS send failed:', smsError.message);
      smsStatus = 'failed';
      // Continue to billing — we attempted the service
    }

    // Deduct from wallet (atomic transaction) — ALWAYS attempt regardless of SMS status.
    // debitWallet uses WHERE balance >= amount, so this is the real balance check.
    let balanceAfter: number = 0;
    let walletDebitStatus = 'pending';

    try {
      balanceAfter = await debitWallet({
        userId: user.id,
        amount: pricing.totalCost,
        description: smsStatus === 'failed'
          ? `Call from ${callerName || callerNumber} (SMS failed)`
          : `Call from ${callerName || callerNumber}`,
        referenceId: twilioCallSid,
      });
      walletDebitStatus = 'success';
      console.log(`💰 Wallet debited: $${pricing.totalCost} (balance: $${balanceAfter})`);
    } catch (walletError) {
      walletDebitStatus = 'failed';

      if (walletError instanceof InsufficientBalanceError) {
        // Balance was drained by a concurrent call between our initial read and now.
        // Fetch the real current balance for an accurate alert.
        console.warn('⚠️  Insufficient balance at debit time (concurrent drain):', {
          userId: user.id,
          requiredAmount: pricing.totalCost,
        });
        const freshBalance = await getWalletBalance(user.id);
        await sendLowBalanceAlert(user.id, user.email, user.businessSettings.businessName, freshBalance, pricing.totalCost);
        return; // Bail — SMS may have been attempted but we can't charge. Log separately if needed.
      }

      // Unexpected wallet error — SMS may have been sent but wallet was NOT charged.
      // Alert admin for manual review.
      console.error('❌ CRITICAL: Wallet debit failed after SMS attempt:', walletError);
      console.error(`   - User: ${user.id} (${user.email})`);
      console.error(`   - Amount: $${pricing.totalCost}`);
      console.error(`   - Call: ${twilioCallSid}`);
      console.error(`   - SMS Status: ${smsStatus}`);
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: `Snap Calls <${process.env.FROM_EMAIL}>`,
          to: env.ADMIN_EMAIL,
          subject: '🚨 BILLING FAILURE: SMS sent but wallet not charged',
          html: `<p><strong>A call was processed and SMS sent, but the wallet debit failed.</strong></p>
          <ul>
            <li>User: ${user.email} (${user.id})</li>
            <li>Amount owed: $${pricing.totalCost}</li>
            <li>Twilio Call SID: ${twilioCallSid}</li>
            <li>SMS Status: ${smsStatus}</li>
            <li>Time: ${new Date().toISOString()}</li>
          </ul>
          <p>Manual wallet debit required.</p>`,
        });
      } catch (alertError) {
        console.error('❌ Failed to send billing failure alert:', alertError);
      }
      // Continue to create call log for audit trail
    }

    // Create call log entry
    const callLog = await prisma.callLog.create({
      data: {
        userId: user.id,
        callerNumber: normalizedCallerNumber,
        callerName,
        twilioCallSid,
        isVip,
        isBusinessHours,
        hasVoicemail,
        voicemailUrl: voicemailUrl || null,
        voicemailTranscription: voicemailTranscript,
        responseType,
        messageSent,
        smsStatus,
        smsMessageSid,
        sequenceTriggered: features.sequencesEnabled,
        recognitionUsed: features.recognitionEnabled && isRepeatCaller,
        baseCost: toDecimal(pricing.baseCost),
        sequencesCost: toDecimal(pricing.sequencesCost),
        recognitionCost: toDecimal(pricing.recognitionCost),
        twoWayCost: toDecimal(pricing.twoWayCost),
        vipPriorityCost: toDecimal(pricing.vipPriorityCost),
        transcriptionCost: toDecimal(pricing.transcriptionCost),
        totalCost: toDecimal(pricing.totalCost),
        ownerNotified: false,
      },
    });

    // Update VIP stats if applicable
    if (vipContact) {
      await prisma.vipContact.update({
        where: { id: vipContact.id },
        data: {
          lastCallDate: new Date(),
          totalCalls: { increment: 1 },
        },
      });
    }


    // Send notification to owner
    const notifSettings = user.notificationSettings;
    if (notifSettings) {
      // SMS notification
      if (notifSettings.notifySms && notifSettings.smsNumber) {
        try {
          await sendOwnerNotification(
            notifSettings.smsNumber,
            `📞 Missed call from ${callerName || callerNumber}. Auto-response sent. View: ${process.env.APP_URL}/calls`
          );
        } catch (notifError) {
          console.error('⚠️  Failed to send owner SMS notification:', notifError);
        }
      }

      // Email notification
      if (notifSettings.notifyEmail && notifSettings.emailAddress) {
        try {
          await sendMissedCallNotificationEmail(
            notifSettings.emailAddress,
            user.businessSettings.businessName,
            callerNumber,
            callerName,
            responseType,
            callLog.timestamp
          );
        } catch (emailError) {
          console.error('⚠️  Failed to send owner email notification:', emailError);
        }
      }

      // Mark as notified
      await prisma.callLog.update({
        where: { id: callLog.id },
        data: { ownerNotified: true },
      });
    }

    // Check for low balance alerts — atomic check+record prevents duplicate alerts
    // from concurrent webhooks both passing the "should send?" check.
    for (const alertLevel of PRICING.LOW_BALANCE_ALERTS) {
      const shouldAlert = await checkAndRecordLowBalanceAlert(user.id, alertLevel);
      if (shouldAlert) {
        await sendLowBalanceAlert(user.id, user.email, user.businessSettings.businessName, balanceAfter, alertLevel);
      }
    }

    console.log('✅ Call processed successfully:', {
      callSid: twilioCallSid,
      userId: user.id,
      cost: pricing.totalCost,
      balanceAfter,
    });
  } catch (error) {
    console.error('❌ Error processing call:', error);
    throw error;
  }
}

/**
 * Sends low balance alert via email and SMS
 */
async function sendLowBalanceAlert(
  userId: string,
  email: string,
  businessName: string,
  balance: number,
  alertLevel: number
) {
  try {
    // Send email alert
    await sendLowBalanceAlertEmail(email, businessName, balance, alertLevel);

    // Get notification settings for SMS
    const notifSettings = await prisma.notificationSettings.findUnique({
      where: { userId },
    });

    if (notifSettings?.notifySms && notifSettings.smsNumber) {
      await sendOwnerNotification(
        notifSettings.smsNumber,
        `⚠️ Snap Calls Wallet Alert: Your balance is $${balance.toFixed(2)}. Add funds at ${process.env.APP_URL}/wallet`
      );
    }
  } catch (error) {
    console.error('❌ Error sending low balance alert:', error);
  }
}
