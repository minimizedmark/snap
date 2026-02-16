import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ phoneNumber: string }> }
) {
  const apiKey = req.headers.get('x-api-key');
  if (!apiKey || apiKey !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { phoneNumber } = await params;

  // Normalize phone number
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
    return NextResponse.json({ error: 'No user found for this phone number' }, { status: 404 });
  }

  const { user } = twilioConfig;

  return NextResponse.json({
    userId: user.id,
    businessName: user.businessSettings?.businessName,
    businessSettings: user.businessSettings,
    companyProfile: user.companyProfile,
  });
}
