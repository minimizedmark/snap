import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { generateAiResponse } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.companyProfile.findUnique({
      where: { userId: session.user.id },
    });

    const businessSettings = await prisma.businessSettings.findUnique({
      where: { userId: session.user.id },
    });

    const businessName = businessSettings?.businessName || 'your business';
    const businessType = profile?.businessType || 'service business';
    const services = profile?.primaryServices?.join(', ') || 'general services';
    const personality = profile?.businessPersonality?.join(', ') || 'professional, friendly';

    const prompt = `Generate a phone greeting script for ${businessName}, a ${businessType} offering ${services}.

The tone should be: ${personality}.

The greeting should:
1. Welcome the caller warmly
2. Mention the business name
3. Briefly mention what services are offered
4. Let them know their call is important
5. Ask them to leave a message with their name, number, and reason for calling
6. Mention they'll receive a text response shortly

Keep it under 30 seconds when spoken (roughly 75-90 words). Write it naturally as if being spoken aloud.

Script only, no formatting or labels:`;

    const result = await generateAiResponse({
      prompt,
      businessName,
      maxTokens: 300,
      temperature: 0.6,
    });

    // If AI is not configured, provide a default template
    const script = result.text.startsWith('[AI')
      ? `Thank you for calling ${businessName}! We specialize in ${services} and we're sorry we missed your call. Your call is very important to us. Please leave your name, phone number, and a brief message about how we can help you. We'll send you a text message shortly and get back to you as soon as possible. Thank you and have a great day!`
      : result.text;

    return NextResponse.json({ script });
  } catch (error) {
    console.error('Error generating greeting script:', error);
    return NextResponse.json({ error: 'Failed to generate script' }, { status: 500 });
  }
}
