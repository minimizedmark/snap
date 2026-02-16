import { env } from './env';

/**
 * AI Service Layer
 * 
 * Two AI backends:
 * 1. OpenAI Whisper-1   - Voicemail transcription ($0.006/min, our cost)
 * 2. DialoGPT-medium    - Text generation for AI responses + template assistance
 * 
 * All AI features included in $0.99/call — every call gets contextual SMS.
 */

// ============================================================
// OpenAI Whisper-1 — Voicemail Transcription
// ============================================================

export interface TranscriptionResult {
  text: string;
  durationMinutes: number;
  cost: number; // Our cost, not charged to user
}

/**
 * Transcribes a voicemail audio file using OpenAI Whisper-1 API.
 * 
 * Cost: ~$0.006/minute (our cost, included in $0.99/call)
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
    formData.append('model', 'whisper-1');
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
    const cost = durationMinutes * 0.006; // $0.006/min (Whisper-1)

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
// DialoGPT-medium — AI Text Generation
// ============================================================

export interface AiGenerationResult {
  text: string;
  tokensUsed: number;
}

export interface AiGenerateParams {
  /** The prompt/instruction for text generation */
  prompt: string;
  /** User's custom AI instructions */
  aiInstructions?: string | null;
  /** Business context for better responses */
  businessName?: string;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature for generation (0.0-1.0) */
  temperature?: number;
}

/**
 * Generates text using DialoGPT-medium endpoint.
 * Used for:
 * - Dynamic AI-generated call responses (included in $0.99/call)
 * - AI template assistance (unlimited, no extra charge)
 * 
 * @param params - Generation parameters
 * @returns Generated text and token usage
 */
export async function generateAiResponse(params: AiGenerateParams): Promise<AiGenerationResult> {
  const endpoint = env.DIALOGPT_ENDPOINT;
  
  if (!endpoint || endpoint.startsWith('DEV_ONLY_')) {
    console.warn('⚠️  DialoGPT endpoint not configured, returning placeholder response');
    return {
      text: '[AI response unavailable - DialoGPT endpoint not configured]',
      tokensUsed: 0,
    };
  }

  const { prompt, aiInstructions, businessName, maxTokens = 256, temperature = 0.7 } = params;

  // Build context prompt for DialoGPT
  let contextPrompt = '';
  
  if (businessName) {
    contextPrompt += `Business: ${businessName}. `;
  }

  if (aiInstructions) {
    contextPrompt += `Instructions: ${aiInstructions}. `;
  }

  contextPrompt += `Generate a concise, professional SMS response (under 160 chars). `;
  contextPrompt += prompt;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add RunPod API key if available
    if (env.RUNPOD_API_KEY) {
      headers['Authorization'] = `Bearer ${env.RUNPOD_API_KEY}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        input: {
          prompt: contextPrompt,
          max_new_tokens: maxTokens,
          temperature,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`DialoGPT generation failed: ${response.status} - ${errorBody}`);
    }

    const result = await response.json();
    
    // Handle various response formats from inference endpoints
    let generatedText = '';
    if (Array.isArray(result)) {
      generatedText = result[0]?.generated_text || result[0]?.text || '';
    } else if (result.generated_text) {
      generatedText = result.generated_text;
    } else if (result.output) {
      generatedText = result.output?.text || result.output?.generated_text || String(result.output);
    } else {
      generatedText = String(result);
    }

    console.log('✅ AI response generated:', {
      textLength: generatedText.length,
    });

    return {
      text: typeof generatedText === 'string' ? generatedText.trim() : String(generatedText).trim(),
      tokensUsed: 0,
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
// AI Template Assistance
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
  /** User's custom AI instructions */
  aiInstructions?: string | null;
}

/**
 * Generates an improved message template based on user's request.
 * Available to all users — unlimited, no extra charge.
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
// AI Call Response Generation
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
  /** Business type from company profile */
  businessType?: string;
  /** Primary services offered */
  primaryServices?: string[];
  /** Emergency protocol */
  emergencyProtocol?: string;
  /** Response timeframe */
  responseTimeframe?: string;
}

/**
 * Generates a dynamic, context-aware SMS response based on voicemail content.
 * Cost included in $0.99/call.
 * 
 * Flow:
 * 1. Takes voicemail transcription + business context
 * 2. Uses DialoGPT-medium to generate a personalized response
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
    businessType,
    primaryServices,
    emergencyProtocol,
    responseTimeframe,
  } = params;

  const serviceContext = primaryServices?.length
    ? `- Services offered: ${primaryServices.join(', ')}`
    : '';
  const typeContext = businessType ? `- Business type: ${businessType}` : '';
  const emergencyContext = emergencyProtocol ? `- Emergency protocol: ${emergencyProtocol}` : '';
  const timeframeContext = responseTimeframe ? `- Response timeframe: ${responseTimeframe}` : '';

  const prompt = `Generate a personalized SMS response for a missed call at ${businessName}.

Voicemail transcription: "${voicemailTranscription}"

Context:
- Business hours: ${businessHours}
- Currently ${isBusinessHours ? 'during' : 'outside'} business hours
${isVip && callerName ? `- VIP caller: ${callerName}` : '- Regular caller'}
${callerName ? `- Caller name: ${callerName}` : ''}
${typeContext}
${serviceContext}
${emergencyContext}
${timeframeContext}

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
