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
    const services = Array.isArray(profile?.primaryServices) && profile.primaryServices.length
      ? profile.primaryServices.slice(0, 3).join(', ')
      : 'general services';
    const personality = Array.isArray(profile?.businessPersonality) && profile.businessPersonality.length
      ? profile.businessPersonality.join(', ')
      : 'warm, professional';
    const keyMessages = Array.isArray(profile?.keyMessages) && profile.keyMessages.length
      ? profile.keyMessages.slice(0, 2).join(', ')
      : '';

    // Extract owner name from staff members
    const staffMembers = profile?.staffMembers as Array<{ name: string; role: string }> | null;
    let ownerName = businessName;
    if (staffMembers && staffMembers.length > 0) {
      const owner = staffMembers.find((m) => m.role === 'Owner' && m.name?.trim());
      const anyNamed = staffMembers.find((m) => m.name?.trim());
      ownerName = owner?.name || anyNamed?.name || businessName;
    }

    const prompt = `You are writing a voicemail greeting script for a real person who runs a small business.

Business: ${businessName}
Owner/contact: ${ownerName}
Industry: ${businessType}
Services: ${services}
Tone: ${personality}${keyMessages ? `\nKey messages: ${keyMessages}` : ''}

Write a personal, warm voicemail greeting script with these STRICT requirements:
1. Maximum 60 words total — count every word carefully before outputting
2. Use the owner's name naturally (e.g. "Hi, this is ${ownerName} with ${businessName}...")
3. Include ONE specific value statement tied to their actual trade — not generic filler like "your call is important to us"
4. Sound like a real human speaking, conversational and warm — no corporate language
5. Do NOT ask callers to leave a message and do NOT mention texting
6. End with EXACTLY this phrase: "we'll get back to you faster than you think."
7. Output the script only — no labels, no quotes, no formatting, no word count

Example of the right tone and format:
"Hi, you've reached Mike with Riverside HVAC. We handle everything from emergency furnace repairs to full AC installs — and we know you can't wait when something breaks. We've got you covered, so leave us a quick message and we'll get back to you faster than you think."`;

    const result = await generateAiResponse({
      prompt,
      businessName,
      maxTokens: 200,
      temperature: 0.5,
    });

    // If AI is not configured or returns an error, use a personalized fallback
    const aiText = result.text.trim();
    const script = (!aiText || aiText.startsWith('[AI') || aiText.startsWith('['))
      ? `Hi, you've reached ${ownerName} with ${businessName}. We specialize in ${services} and take every customer seriously. Leave us a quick message and we'll get back to you faster than you think.`
      : aiText;

    return NextResponse.json({ script });
  } catch (error) {
    console.error('Error generating greeting script:', error);
    return NextResponse.json({ error: 'Failed to generate script' }, { status: 500 });
  }
}
