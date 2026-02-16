import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.companyProfile.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error fetching company profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { step, data } = body;

    if (!step || !data) {
      return NextResponse.json({ error: 'Missing step or data' }, { status: 400 });
    }

    const stepFields: Record<number, string[]> = {
      1: ['businessType', 'primaryServices', 'serviceAreas'],
      2: ['businessHours', 'emergencyServices', 'emergencyDefinition', 'responseTimeframe'],
      3: ['staffMembers', 'callRoutingRules'],
      4: ['businessPersonality', 'keyMessages'],
      5: ['commonCallReasons', 'quoteHandling', 'emergencyProtocol', 'afterHoursProtocol'],
      6: ['greetingScript', 'greetingAudioUrl'],
    };

    const allowedFields = stepFields[step];
    if (!allowedFields) {
      return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
    }

    // Filter data to only allowed fields for this step
    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in data) {
        updateData[field] = data[field];
      }
    }

    // Track the highest step completed
    const nextStep = Math.min(step + 1, 6);

    const profile = await prisma.companyProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        currentStep: nextStep,
        ...updateData,
      },
      update: {
        currentStep: nextStep,
        ...updateData,
      },
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error saving company profile:', error);
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
  }
}

export async function PATCH() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.companyProfile.update({
      where: { userId: session.user.id },
      data: { onboardingComplete: true },
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error completing company profile:', error);
    return NextResponse.json({ error: 'Failed to complete profile' }, { status: 500 });
  }
}
