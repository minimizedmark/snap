import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

/**
 * Default message templates seeded for every new user.
 * The AI write bot uses these as tone/style guidance, not as literal output —
 * actual messages are generated contextually per call using business name and industry.
 */
export const DEFAULT_TEMPLATES = {
  standardResponse: `Hi, this is {businessName}! We told you we'd get back to you faster than you think! But since you didn't leave a message, we don't know what we could have done to help you. All calls are very important to us and we would have loved to assist with all your {businessName} needs. Remember — we are here to serve! Please call us back anytime.`,
  voicemailResponse: `Hi, this is {businessName}! We received your voicemail and wanted to reach out right away. We take every call seriously and will be in touch shortly. Thank you for giving us the opportunity to help you!`,
  afterHoursResponse: `Hi, this is {businessName}! We just missed your call but wanted to reach out right away even though we're currently closed. We'll be back during business hours at {businessHours}. Please call us back — we would love to assist you!`,
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { businessName, industry, hoursStart, hoursEnd } = body;

    if (!businessName || !industry) {
      return NextResponse.json({ error: 'businessName and industry are required' }, { status: 400 });
    }

    // Save business settings and seed message templates atomically.
    // Templates use upsert so re-submitting onboarding doesn't wipe customizations.
    await prisma.$transaction([
      prisma.businessSettings.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          businessName,
          industry,
          hoursStart,
          hoursEnd,
          daysOpen: [1, 2, 3, 4, 5],
          timezone: user.timezone,
        },
        update: {
          businessName,
          industry,
          hoursStart,
          hoursEnd,
        },
      }),
      // Seed defaults only on create — don't overwrite customized templates on update
      prisma.messageTemplates.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          standardResponse: DEFAULT_TEMPLATES.standardResponse,
          voicemailResponse: DEFAULT_TEMPLATES.voicemailResponse,
          afterHoursResponse: DEFAULT_TEMPLATES.afterHoursResponse,
        },
        update: {}, // Never overwrite on subsequent onboarding visits
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Business info save error:', error);
    return NextResponse.json(
      { error: 'Failed to save business info' },
      { status: 500 }
    );
  }
}

