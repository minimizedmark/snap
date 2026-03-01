import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateTwilioSignature } from '@/lib/twilio';
import { env } from '@/lib/env';

/**
 * TWIML VOICE HANDLER
 *
 * This is the entry point for every inbound call.
 * Twilio hits this URL the moment a call arrives on the customer's number.
 *
 * What it does:
 * 1. Validates the request is genuinely from Twilio
 * 2. Looks up the business that owns this number
 * 3. Returns TwiML that plays their recorded greeting
 * 4. Starts recording the caller
 * 5. When recording ends (hang-up or timeout), Twilio POSTs the recording
 *    to /api/webhooks/twilio/call where all the billing/AI/SMS magic happens
 *
 * HANG-UP HANDLING:
 * If the caller hangs up before leaving a message, Twilio still fires the
 * action callback — just without a RecordingUrl. The call webhook handles
 * that case as a standard hang-up response.
 *
 * GREETING FALLBACK:
 * If no greeting has been recorded yet (greetingUrl is null), we use a
 * generic TTS message so calls still work during onboarding.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-twilio-signature') ?? '';
  const url = `${env.APP_URL}/api/voice`;

  const params: Record<string, string> = {};
  new URLSearchParams(rawBody).forEach((value, key) => {
    params[key] = value;
  });

  const isValid = validateTwilioSignature(signature, url, params);

  if (!isValid) {
    console.error('❌ Invalid Twilio signature on voice webhook');
    return new Response('Forbidden', { status: 403 });
  }

  const businessNumber = params.To;
  const callerNumber = params.From;

  if (!businessNumber) {
    console.error('❌ Missing To number in voice webhook');
    return twimlResponse(fallbackTwiml(''));
  }

  // Look up the business that owns this number to get their greeting
  const twilioConfig = await prisma.twilioConfig.findFirst({
    where: {
      phoneNumber: businessNumber,
      verified: true,
    },
    include: {
      user: {
        include: {
          businessSettings: true,
        },
      },
    },
  });

  if (!twilioConfig?.user?.businessSettings) {
    console.error('❌ No business found for number:', businessNumber);
    // Still play something — silent failure means confused callers
    return twimlResponse(fallbackTwiml('our team'));
  }

  const { businessName, greetingUrl } = twilioConfig.user.businessSettings;
  const callbackUrl = `${env.APP_URL}/api/webhooks/twilio/call`;

  console.log('📞 Inbound call:', {
    to: businessNumber,
    from: callerNumber,
    business: businessName,
    hasGreeting: !!greetingUrl,
  });

  const xml = greetingUrl
    ? recordWithGreeting(greetingUrl, callbackUrl)
    : fallbackTwiml(businessName, callbackUrl);

  return twimlResponse(xml);
}

/**
 * TwiML: play the customer's recorded greeting then record the caller.
 * The recording result (including RecordingUrl) is POSTed to callbackUrl.
 *
 * NOTE: recordingStatusCallback intentionally omitted. Twilio fires `action`
 * with the full RecordingUrl — that's all the call webhook needs. Pointing
 * recordingStatusCallback at the same URL causes a second POST that the
 * duplicate-SID guard discards, burning a DB lookup and generating a
 * misleading "duplicate webhook" log entry on every single call.
 */
function recordWithGreeting(greetingUrl: string, callbackUrl: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${escapeXml(greetingUrl)}</Play>
  <Record
    action="${escapeXml(callbackUrl)}"
    method="POST"
    maxLength="120"
    timeout="5"
    playBeep="true"
    transcribe="false"
  />
</Response>`;
}

/**
 * TwiML fallback: used when no greeting has been recorded yet.
 * Generic TTS message so calls still work during onboarding.
 */
function fallbackTwiml(businessName: string, callbackUrl?: string): string {
  const name = businessName || 'our team';
  const cb = callbackUrl ?? '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hi, you've reached ${escapeXml(name)}. We can't take your call right now but please leave a message and we'll get back to you right away.</Say>
  ${cb ? `<Record
    action="${escapeXml(cb)}"
    method="POST"
    maxLength="120"
    timeout="5"
    playBeep="true"
    transcribe="false"
  />` : '<Hangup/>'}
</Response>`;
}

function twimlResponse(xml: string) {
  return new Response(xml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
