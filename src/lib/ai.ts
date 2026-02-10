import { env } from './env';

/**
 * AI Service Layer
 * 
 * Two AI backends:
 * 1. OpenAI GPT-4o Mini - Voicemail transcription ($0.003/min, our cost)
 * 2. RunPod Qwen3-4B   - Text generation for AI responses + template assistance
 * 
 * PRO tier: Both included in $1.50/call price (no extra charge)
 * BASIC tier: Qwen3-4B for template assistance only (limited free, then $0.25/change)
 */

// ============================================================
// GPT-4o Mini — Voicemail Transcription (PRO tier only)
// ============================================================

export interface TranscriptionResult {
  text: string;
  durationMinutes: number;
  cost: number; // Our cost, not charged to user
}

/**
 * Transcribes a voicemail audio file using OpenAI GPT-4o Mini audio API.
 * 
 * Cost: ~$0.003/minute (our cost, absorbed into PRO $1.50/call)
 * 
 * @param audioUrl - Twilio voicemail recording URL
 * @returns Transcription text, duration, and our cost
 */
export async function transcribeVoicemail(audioUrl: string): Promise<TranscriptionResult> {
  const apiKey = env.OPENAI_API_KEY;
  
  if (!apiKey || apiKey.startsWith('DEV_ONLY_')) {
    console.warn('⚠️  OpenAI API key not configured, returning placeholder transcription');
    return {
      text: '[Transcription unavailable - OpenAI API key not configured]',
      durationMinutes: 0,
      cost: 0,
    };
  }

  try {
    // Download audio from Twilio
    const audioResponse = await fetch(audioUrl, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
      },
    });

    if (!audioResponse.ok) {
      throw new Error(`Failed to download voicemail: ${audioResponse.status}`);
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });

    // Create form data for Whisper API
    const formData = new FormData();
    formData.append('file', audioBlob, 'voicemail.wav');
    formData.append('model', 'gpt-4o-mini-transcribe');
    formData.append('response_format', 'verbose_json');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI transcription failed: ${response.status} - ${errorBody}`);
    }

    const result = await response.json();
    const durationMinutes = (result.duration || 0) / 60;
    const cost = durationMinutes * 0.003; // $0.003/min

    console.log('✅ Voicemail transcribed:', {
      durationSeconds: result.duration,
      durationMinutes: durationMinutes.toFixed(2),
      cost: `$${cost.toFixed(4)}`,
      textLength: result.text.length,
    });

    return {
      text: result.text,
      durationMinutes,
      cost,
    };
  } catch (error) {
    console.error('❌ Voicemail transcription error:', error);
    return {
      text: '[Transcription failed]',
      durationMinutes: 0,
      cost: 0,
    };
  }
}


// ============================================================
// RunPod Qwen3-4B — AI Text Generation
// ============================================================

export interface AiGenerationResult {
  text: string;
  tokensUsed: number;
}

export interface AiGenerateParams {
  /** The prompt/instruction for text generation */
  prompt: string;
  /** User's custom AI instructions (PRO tier) */
  aiInstructions?: string | null;
  /** Business context for better responses */
  businessName?: string;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature for generation (0.0-1.0) */
  temperature?: number;
}

/**
 * Generates text using RunPod Qwen3-4B endpoint.
 * Used for both:
 * - PRO tier: Dynamic AI-generated call responses (included in $1.50/call)
 * - BASIC tier: AI template assistance (limited free, then $0.25/change)
 * 
 * @param params - Generation parameters
 * @returns Generated text and token usage
 */
export async function generateAiResponse(params: AiGenerateParams): Promise<AiGenerationResult> {
  const endpoint = env.RUNPOD_ENDPOINT;
  
  if (!endpoint || endpoint.startsWith('DEV_ONLY_')) {
    console.warn('⚠️  RunPod endpoint not configured, returning placeholder response');
    return {
      text: '[AI response unavailable - RunPod endpoint not configured]',
      tokensUsed: 0,
    };
  }

  const { prompt, aiInstructions, businessName, maxTokens = 256, temperature = 0.7 } = params;

  // Build system message with context
  let systemMessage = 'You are a professional business SMS assistant. ';
  systemMessage += 'Generate concise, friendly, and professional text message responses. ';
  systemMessage += 'Keep messages under 160 characters when possible for SMS optimization. ';
  
  if (businessName) {
    systemMessage += `You are responding on behalf of ${businessName}. `;
  }

  if (aiInstructions) {
    systemMessage += `\n\nCustom instructions from the business owner:\n${aiInstructions}`;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: prompt },
          ],
          max_tokens: maxTokens,
          temperature,
          stop: ['\n\n'], // Stop at double newline for clean SMS formatting
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`RunPod generation failed: ${response.status} - ${errorBody}`);
    }

    const result = await response.json();
    
    // RunPod serverless returns output in different formats depending on the handler
    const generatedText = result.output?.text 
      || result.output?.choices?.[0]?.message?.content
      || result.output?.choices?.[0]?.text
      || result.output
      || '';
    
    const tokensUsed = result.output?.usage?.total_tokens 
      || result.output?.usage?.completion_tokens
      || 0;

    console.log('✅ AI response generated:', {
      tokensUsed,
      textLength: generatedText.length,
    });

    return {
      text: typeof generatedText === 'string' ? generatedText.trim() : String(generatedText).trim(),
      tokensUsed,
    };
  } catch (error) {
    console.error('❌ AI generation error:', error);
    return {
      text: '[AI generation failed - please try again]',
      tokensUsed: 0,
    };
  }
}


// ============================================================
// AI Template Assistance (BASIC + PRO)
// ============================================================

export interface TemplateAssistRequest {
  /** Which template to improve */
  templateType: 'standardResponse' | 'voicemailResponse' | 'afterHoursResponse';
  /** Current template text */
  currentTemplate: string;
  /** What the user wants changed */
  userRequest: string;
  /** Business name for context */
  businessName: string;
  /** PRO user's custom AI instructions */
  aiInstructions?: string | null;
}

/**
 * Generates an improved message template based on user's request.
 * Used by both BASIC and PRO tiers (billing is handled by the API route).
 */
export async function generateTemplateImprovement(params: TemplateAssistRequest): Promise<AiGenerationResult> {
  const { templateType, currentTemplate, userRequest, businessName, aiInstructions } = params;

  const typeLabel = templateType === 'standardResponse' ? 'standard missed call'
    : templateType === 'voicemailResponse' ? 'voicemail'
    : 'after-hours';

  const prompt = `Improve this ${typeLabel} SMS response template for ${businessName}.

Current template:
"${currentTemplate}"

User's request: ${userRequest}

Generate ONLY the improved template text. Keep it under 160 characters for SMS. Use {businessName}, {businessHours}, and {callerName} as placeholders where appropriate.`;

  return generateAiResponse({
    prompt,
    aiInstructions,
    businessName,
    maxTokens: 200,
    temperature: 0.6,
  });
}


// ============================================================
// AI Call Response Generation (PRO tier only)
// ============================================================

export interface AiCallResponseParams {
  /** Voicemail transcription text */
  voicemailTranscription: string;
  /** Business name */
  businessName: string;
  /** Business hours for context */
  businessHours: string;
  /** Whether it's currently business hours */
  isBusinessHours: boolean;
  /** Whether the caller is a VIP */
  isVip: boolean;
  /** VIP caller's name (if available) */
  callerName?: string | null;
  /** User's custom AI instructions */
  aiInstructions?: string | null;
  /** The default template (fallback context) */
  defaultTemplate: string;
}

/**
 * Generates a dynamic, context-aware SMS response based on voicemail content.
 * PRO tier only - cost included in $1.50/call.
 * 
 * Flow:
 * 1. Takes voicemail transcription + business context
 * 2. Uses Qwen3-4B to generate a personalized response
 * 3. Falls back to default template if AI fails
 */
export async function generateCallResponse(params: AiCallResponseParams): Promise<string> {
  const {
    voicemailTranscription,
    businessName,
    businessHours,
    isBusinessHours,
    isVip,
    callerName,
    aiInstructions,
    defaultTemplate,
  } = params;

  const prompt = `Generate a personalized SMS response for a missed call at ${businessName}.

Voicemail transcription: "${voicemailTranscription}"

Context:
- Business hours: ${businessHours}
- Currently ${isBusinessHours ? 'during' : 'outside'} business hours
${isVip && callerName ? `- VIP caller: ${callerName}` : '- Regular caller'}
${callerName ? `- Caller name: ${callerName}` : ''}

Default template for reference: "${defaultTemplate}"

Generate a professional, personalized SMS response that:
1. Acknowledges their specific voicemail content
2. Is warm and professional
3. Stays under 160 characters
4. Includes relevant follow-up information

Response text only, no quotes:`;

  try {
    const result = await generateAiResponse({
      prompt,
      aiInstructions,
      businessName,
      maxTokens: 200,
      temperature: 0.5, // Slightly lower temperature for consistent quality
    });

    // Validate the response isn't empty or an error
    if (result.text && !result.text.startsWith('[AI')) {
      return result.text;
    }

    // Fall back to default template
    console.warn('⚠️  AI call response was empty/error, using default template');
    return defaultTemplate;
  } catch (error) {
    console.error('❌ AI call response generation failed, using default template:', error);
    return defaultTemplate;
  }
}
