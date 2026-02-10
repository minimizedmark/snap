import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getUserSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userData = await getUserSession(session.user.id);

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(userData);
  } catch (error) {
    console.error('Error fetching user session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user session' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/session
 * 
 * Update user settings. Currently supports:
 * - aiInstructions: Custom AI instructions for PRO tier users
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();

    // Handle AI instructions update
    if ('aiInstructions' in body) {
      // Verify user is PRO tier
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { callTier: true },
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if ((user as any).callTier !== 'PRO') {
        return NextResponse.json(
          { error: 'AI instructions are only available for PRO tier users' },
          { status: 403 }
        );
      }

      const aiInstructions = body.aiInstructions;

      // Validate length
      if (aiInstructions && typeof aiInstructions === 'string' && aiInstructions.length > 500) {
        return NextResponse.json(
          { error: 'AI instructions must be 500 characters or less' },
          { status: 400 }
        );
      }

      await prisma.messageTemplates.update({
        where: { userId },
        data: {
          aiInstructions: aiInstructions || null,
        },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  } catch (error) {
    console.error('Error updating user session:', error);
    return NextResponse.json(
      { error: 'Failed to update user session' },
      { status: 500 }
    );
  }
}
