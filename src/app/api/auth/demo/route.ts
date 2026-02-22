import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

const TEST_ACCOUNT_EMAIL = process.env.TEST_ACCOUNT_EMAIL || 'test@snapcalls.dev';

export async function POST(request: NextRequest) {
  const demoAccessKey = process.env.DEMO_ACCESS_KEY;

  if (!demoAccessKey) {
    return NextResponse.json({ error: 'Demo mode not configured' }, { status: 403 });
  }

  let key: string | undefined;
  try {
    const body = await request.json();
    key = body.key;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (key !== demoAccessKey) {
    return NextResponse.json({ error: 'Invalid demo key' }, { status: 403 });
  }

  // Find the test account
  const user = await prisma.user.findUnique({
    where: { email: TEST_ACCOUNT_EMAIL },
    select: { id: true, isTestAccount: true },
  });

  if (!user || !user.isTestAccount) {
    return NextResponse.json(
      { error: 'Demo account not set up. Ask admin to run the test account setup.' },
      { status: 404 }
    );
  }

  // Generate a 24-hour login token
  const token = uuidv4();
  await prisma.magicLink.create({
    data: {
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      used: false,
    },
  });

  return NextResponse.json({ success: true, token });
}
