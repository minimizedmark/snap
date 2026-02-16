import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ phoneNumber: string }> }
) {
  try {
    const { phoneNumber } = await params;
    const normalized = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

    const twilioConfig = await prisma.twilioConfig.findFirst({
      where: { phoneNumber: normalized },
      include: {
        user: {
          include: {
            companyProfile: true,
            businessSettings: true,
          },
        },
      },
    });

    if (!twilioConfig?.user) {
      return NextResponse.json(
        { error: 'No user found for this phone number' },
        { status: 404 }
      );
    }

    const { user } = twilioConfig;
    const greetingAudioUrl = user.companyProfile?.greetingAudioUrl;
    const greetingScript = user.companyProfile?.greetingScript;
    const businessName = user.businessSettings?.businessName;

    return NextResponse.json({
      phoneNumber: normalized,
      businessName,
      greetingAudioUrl: greetingAudioUrl || null,
      greetingScript: greetingScript || null,
      hasCustomGreeting: !!greetingAudioUrl,
    });
  } catch (error) {
    console.error('Error fetching greeting:', error);
    return NextResponse.json(
      { error: 'Failed to fetch greeting' },
      { status: 500 }
    );
  }
}
