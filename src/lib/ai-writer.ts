/**
 * AI Write Bot — generates personalized SMS responses for missed calls.
 *
 * Uses any OpenAI-compatible endpoint. Point it at your self-hosted model
 * by setting these env vars:
 *   AI_BASE_URL  — your model server (e.g. http://localhost:11434/v1)
 *   AI_MODEL     — model name to call (e.g. "qwen3-4b", "llama3")
 *   AI_API_KEY   — optional, only if your server requires auth
 *
 * If AI_BASE_URL is not set, falls back to OpenAI directly using OPENAI_API_KEY.
 *
 * THE CORE PSYCHOLOGICAL PREMISE (applies to ALL message types):
 *
 * Every person who calls a business and doesn't connect carries a silent
 * assumption: "That was probably a waste of time." They've been trained by
 * years of voicemail black holes, unreturned calls, and businesses that
 * don't give a damn. Our job is to shatter that assumption instantly.
 *
 * The goal of every message is the same regardless of what the caller did:
 * make them feel that calling was (or would have been) the right move,
 * and that staying engaged is absolutely worth their time.
 *
 * Three scenarios, one mission:
 *
 *   HANG-UP: "You almost got something — come back."
 *   The caller assumed voicemail was pointless. The instant text proves otherwise.
 *   Create just enough FOMO that they think "wait, maybe I should have stayed on."
 *
 *   VOICEMAIL (answerable): "You made a smart move calling — here's proof."
 *   Reward the effort immediately. Mirror their words back so they feel heard.
 *   Then show momentum — something is already in motion because they called.
 *
 *   VOICEMAIL (unanswerable): "You asked the right question — that answer is worth waiting for."
 *   Never guess or fabricate. But make them feel their question was good,
 *   the person who has the answer is exactly who they need, and calling back
 *   is the obvious move — not a chore.
 */

import OpenAI from 'openai';
import { env } from './env';

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const config: ConstructorParameters<typeof OpenAI>[0] = {
      apiKey: env.AI_API_KEY || env.OPENAI_API_KEY || 'no-key-required',
    };

    if (env.AI_BASE_URL) {
      config.baseURL = env.AI_BASE_URL;
    }

    _client = new OpenAI(config);
  }
  return _client;
}

export interface WriteCallResponseParams {
  businessName: string;
  industry: string;
  callerName: string | null;
  businessHours: string;
  isBusinessHours: boolean;
  /** Whisper transcription of voicemail — null means caller hung up without leaving one */
  voicemailTranscript: string | null;
}

/**
 * Generates a personalized SMS response for a missed call.
 * See module-level comment for full psychological framework.
 */
export async function generateCallResponse(params: WriteCallResponseParams): Promise<string> {
  const {
    businessName,
    industry,
    callerName,
    businessHours,
    isBusinessHours,
    voicemailTranscript,
  } = params;

  const callerAddress = callerName ? `Hi ${callerName}` : 'Hi';
  const hoursContext = isBusinessHours
    ? `We are currently within business hours (${businessHours}).`
    : `We are currently outside business hours. Our hours are ${businessHours}.`;

  const callContext = voicemailTranscript
    ? `The caller left a voicemail. Transcription: "${voicemailTranscript}"`
    : `The caller hung up without leaving a voicemail message.`;

  const systemPrompt = `You are an expert at writing SMS messages that make people feel calling was absolutely worth their time — or that they just missed out by hanging up early.

THE CORE PREMISE:
Every caller arrives with a silent assumption: "this was probably a waste of time." Your job is to shatter that assumption in one text. Not with enthusiasm or friendliness — with precision. Make them feel something: curiosity, validation, momentum, or mild regret. Any of those beats indifference.

RULES FOR ALL MESSAGES:
- Maximum 160 characters — one SMS, no exceptions
- Must feel human and personal, never robotic or template-like
- Must mention the business name naturally
- No hashtags. No lists. No emojis unless one very subtle one fits perfectly.
- Never beg, never sound desperate, never be pushy
- Never start with "I" — start with the caller address given to you

---

FOR HANG-UPS (caller hung up, left no voicemail):

MISSION: "You almost got something — come back."

The caller hung up because they assumed voicemail was a dead end. This text arrives seconds later and proves them wrong. The goal is re-engagement through mild FOMO — make them think "wait, maybe I should have stayed on the line."

PSYCHOLOGICAL TRIGGERS — pick the one that fits the industry best:

1. IMPLIED MISSED OPPORTUNITY
   Suggest they were moments away from getting exactly what they needed.
   The mystery is the trigger — do NOT say what they missed.
   Feel: "You were this close" without those words.

2. INSTANT RESPONSIVENESS AS SOCIAL PROOF
   The speed of this text IS the message. It proves this business notices,
   pays attention, and acts — unlike every other place they've called.
   Contrast them against the void of businesses that never respond.

3. LOW-FRICTION RE-ENTRY
   They can reply RIGHT HERE. No menus, no hold music, no callbacks.
   A text reply is enough to get what they called for.
   Remove every barrier between them and engagement.

4. CURIOSITY GAP
   Hint that there's something relevant to their specific situation —
   without revealing it. The gap between "there's something" and "what is it?" drives action.

TONE: Warm but confident. Like a capable person who noticed you and reached out.
Not needy. Not salesy. Just: "hey, we saw you — and we're worth your time."

---

FOR VOICEMAILS WHERE YOU CAN ANSWER:

MISSION: "You made a smart move calling — here's proof."

They made the effort. Reward it immediately with evidence you actually listened.
Mirror their specific words back so they feel genuinely heard, not processed.
Then show momentum — something is already in motion because they called.
Eliminate uncertainty: they should feel that calling was clearly the right move
and that help is already coming.

TONE: Capable and reassuring. Like a competent person who's already on it.

---

FOR VOICEMAILS WITH QUESTIONS YOU CANNOT ANSWER:
(pricing, availability, appointments, specific products, policies — anything you'd have to guess at)

MISSION: "You asked the right question — that answer is worth waiting for."

NEVER guess or fabricate an answer. But don't make them feel like they hit a wall.
Make them feel their question was a good one, the right person has the answer,
and calling back is obvious — not a chore. The goal is to keep the momentum
they built by leaving a voicemail in the first place.

TONE: Honest and warm. Like a receptionist who can't answer but makes you feel
confident the person who can will absolutely be worth talking to.`;

  const userMessage = `Business name: ${businessName}
Industry: ${industry}
${hoursContext}
${callContext}

Write a single SMS reply. Start with "${callerAddress},"`;

  try {
    const client = getClient();

    const completion = await client.chat.completions.create({
      model: env.AI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 100,
      temperature: 0.8,
    });

    const message = completion.choices[0]?.message?.content?.trim();

    if (!message) {
      throw new Error('AI returned empty response');
    }

    console.log('✅ AI write bot generated response:', { length: message.length });
    return message;
  } catch (error) {
    console.error('❌ AI write bot failed, using fallback:', error);

    // Hardcoded fallbacks — same psychological premise applied to plain copy.
    // Hang-up: FOMO + low-friction re-entry
    // Voicemail: momentum + proof of attention
    if (voicemailTranscript) {
      return `${callerAddress}, this is ${businessName}! Got your message — we're already on it. You called the right place. Expect to hear from us very soon!`;
    }

    return `${callerAddress}, this is ${businessName}! We just missed you — reply here and skip the whole callback dance. We're here and ready to help right now.`;
  }
}
