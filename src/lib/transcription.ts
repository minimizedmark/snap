/**
 * Voicemail transcription via OpenAI Whisper.
 *
 * Whisper is used specifically for transcription — it's the best available
 * and cheap enough that per-transcription cost is negligible.
 * The write bot (ai-writer.ts) is separate and uses the self-hosted model.
 */

import OpenAI from 'openai';
import { env } from './env';

let _openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!_openai) {
    if (!env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set — required for Whisper transcription');
    }
    _openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return _openai;
}

/**
 * Transcribes a voicemail recording URL using OpenAI Whisper.
 *
 * Twilio recording URLs require auth to fetch, so we download the audio
 * as a buffer first then pass it to Whisper as a file upload.
 *
 * @param recordingUrl - Twilio RecordingUrl from the webhook payload
 * @returns Transcribed text, or null if transcription fails
 */
export async function transcribeVoicemail(recordingUrl: string): Promise<string | null> {
  try {
    // Twilio recording URLs need credentials appended to download the audio
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured for voicemail download');
    }

    // Download the audio from Twilio (mp3 format)
    const audioUrl = `${recordingUrl}.mp3`;
    const audioResponse = await fetch(audioUrl, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      },
    });

    if (!audioResponse.ok) {
      throw new Error(`Failed to download voicemail: ${audioResponse.status} ${audioResponse.statusText}`);
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    const audioFile = new File([audioBuffer], 'voicemail.mp3', { type: 'audio/mpeg' });

    const openai = getOpenAIClient();

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
    });

    const text = transcription.text?.trim();

    if (!text) {
      console.warn('⚠️ Whisper returned empty transcription');
      return null;
    }

    console.log('✅ Voicemail transcribed:', { length: text.length });
    return text;
  } catch (error) {
    // Transcription failure is non-fatal — write bot will handle it gracefully
    console.error('❌ Voicemail transcription failed:', error);
    return null;
  }
}
