import { NextRequest, NextResponse } from 'next/server';
import { createMagicLink } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Dev mode: skip email, create token and return it for auto-login
    if (process.env.NODE_ENV === 'development') {
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.user.create({
          data: { email, timezone: 'America/New_York', isActive: true },
        });
      }
      const token = uuidv4();
      await prisma.magicLink.create({
        data: {
          token,
          userId: user.id,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          used: false,
        },
      });
      return NextResponse.json({ success: true, token });
    }

    // Test account: skip email in any environment — return token directly for auto-login
    const maybeTestUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, isTestAccount: true },
    });
    if (maybeTestUser?.isTestAccount) {
      const token = uuidv4();
      await prisma.magicLink.create({
        data: {
          token,
          userId: maybeTestUser.id,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          used: false,
        },
      });
      return NextResponse.json({ success: true, token });
    }

    // Production: send magic link email
    const token = await createMagicLink(email);

    if (!token) {
      return NextResponse.json(
        { error: 'Failed to send magic link' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in send-magic-link route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
