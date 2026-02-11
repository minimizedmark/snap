import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { transcribeVoicemail, generateCallResponse } from '@/lib/ai';
import { formatBusinessHours } from '@/lib/utils';

/**
 * POST /api/ai-transcribe
 * 
 * Transcribes a voicemail and generates an AI-powered SMS response.
 * Available to all users — cost is included in the $0.99/call price.
 * 
 * This endpoint is called during call processing when a voicemail is detected.
 * Can also be called manually from the dashboard to re-transcribe/re-generate
 * for a specific call log entry.
 * 
 * Request body:
 * {
 *   voicemailUrl: "https://api.twilio.com/...",
 *   callLogId?: "clxx...",       // Optional: link to existing call log
 *   callerName?: "John Smith",   // Optional: for personalization
 *   isVip?: boolean,
 *   isBusinessHours?: boolean
 * }
 * 
 * Response:
 * {
 *   transcription: "Hi, this is John, I wanted to ask about...",
 *   aiResponse: "Hi John! Thanks for calling. We got your message about...",
 *   durationMinutes: 0.45,
 *   transcriptionCost: 0.00135  // Our cost (not charged to user)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        messageTemplates: true,
        businessSettings: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.messageTemplates || !user.businessSettings) {
      return NextResponse.json({ error: 'User not fully configured' }, { status: 400 });
    }

    const body = await req.json();
    const { voicemailUrl, callLogId, callerName, isVip = false, isBusinessHours = true } = body;

    if (!voicemailUrl || typeof voicemailUrl !== 'string') {
      return NextResponse.json(
        { error: 'voicemailUrl is required' },
        { status: 400 }
      );
    }

    // Step 1: Transcribe the voicemail using GPT-4o Mini
    const transcription = await transcribeVoicemail(voicemailUrl);

    // Step 2: Generate AI response using DialoGPT-medium
    const businessHours = formatBusinessHours(
      user.businessSettings.hoursStart,
      user.businessSettings.hoursEnd
    );

    // Determine which default template to use for fallback
    let defaultTemplate: string;
    if (!isBusinessHours) {
      defaultTemplate = user.messageTemplates.afterHoursResponse;
    } else if (transcription.text && !transcription.text.startsWith('[')) {
      defaultTemplate = user.messageTemplates.voicemailResponse;
    } else {
      defaultTemplate = user.messageTemplates.standardResponse;
    }

    const aiResponse = await generateCallResponse({
      voicemailTranscription: transcription.text,
      businessName: user.businessSettings.businessName,
      businessHours,
      isBusinessHours,
      isVip,
      callerName,
      aiInstructions: (user.messageTemplates as any).aiInstructions,
      defaultTemplate,
    });

    // Step 3: Update call log if provided
    if (callLogId) {
      try {
        await prisma.callLog.update({
          where: { id: callLogId, userId }, // Ensure user owns the call log
          data: {
            voicemailTranscription: transcription.text,
          },
        });
      } catch (updateError) {
        console.warn('⚠️  Failed to update call log with transcription:', updateError);
        // Non-critical — continue with response
      }
    }

    return NextResponse.json({
      transcription: transcription.text,
      aiResponse,
      durationMinutes: transcription.durationMinutes,
      transcriptionCost: transcription.cost, // Our cost, not charged to user
    });
  } catch (error) {
    console.error('❌ AI transcribe error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe voicemail' },
      { status: 500 }
    );
  }
}
