import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { transcribeVoicemail, generateCallResponse } from '@/lib/ai';
import { prisma } from '@/lib/prisma';
import { formatBusinessHours } from '@/lib/utils';

/**
 * POST /api/ai-inference
 * 
 * Combined AI endpoint: transcribes audio and generates a contextual SMS response.
 * Uses Whisper-1 for transcription + DialoGPT-medium for response generation.
 * 
 * Request body:
 * {
 *   audioUrl: "https://api.twilio.com/...",   // Twilio voicemail recording URL
 *   callerName?: "John Smith",                // Optional: for personalization
 *   isVip?: boolean,
 *   isBusinessHours?: boolean,
 *   callLogId?: "clxx..."                     // Optional: update existing call log
 * }
 * 
 * Response:
 * {
 *   transcription: "Hi, this is John...",
 *   response: "Hi John! Thanks for calling...",
 *   durationMinutes: 0.45
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const { audioUrl, callerName, isVip = false, isBusinessHours = true, callLogId } = body;

    if (!audioUrl || typeof audioUrl !== 'string') {
      return NextResponse.json({ error: 'audioUrl is required' }, { status: 400 });
    }

    // Fetch user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        messageTemplates: true,
        businessSettings: true,
      },
    });

    if (!user || !user.messageTemplates || !user.businessSettings) {
      return NextResponse.json({ error: 'User not fully configured' }, { status: 400 });
    }

    // Step 1: Transcribe audio with Whisper-1
    const transcription = await transcribeVoicemail(audioUrl);

    // Step 2: Determine default template for fallback
    const businessHours = formatBusinessHours(
      user.businessSettings.hoursStart,
      user.businessSettings.hoursEnd
    );

    let defaultTemplate: string;
    if (!isBusinessHours) {
      defaultTemplate = user.messageTemplates.afterHoursResponse;
    } else if (transcription.text && !transcription.text.startsWith('[')) {
      defaultTemplate = user.messageTemplates.voicemailResponse;
    } else {
      defaultTemplate = user.messageTemplates.standardResponse;
    }

    // Step 3: Generate contextual response with DialoGPT-medium
    const response = await generateCallResponse({
      voicemailTranscription: transcription.text,
      businessName: user.businessSettings.businessName,
      businessHours,
      isBusinessHours,
      isVip,
      callerName,
      aiInstructions: (user.messageTemplates as any).aiInstructions,
      defaultTemplate,
    });

    // Step 4: Update call log if provided
    if (callLogId) {
      try {
        await prisma.callLog.update({
          where: { id: callLogId, userId },
          data: { voicemailTranscription: transcription.text },
        });
      } catch (updateError) {
        console.warn('⚠️  Failed to update call log:', updateError);
      }
    }

    return NextResponse.json({
      transcription: transcription.text,
      response,
      durationMinutes: transcription.durationMinutes,
    });
  } catch (error) {
    console.error('❌ AI inference error:', error);
    return NextResponse.json(
      { error: 'AI inference failed' },
      { status: 500 }
    );
  }
}
