import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { toDecimal } from '@/lib/pricing';
import { generateTemplateImprovement } from '@/lib/ai';

/**
 * POST /api/ai-assist
 * 
 * AI-powered template improvement — available to all users.
 * Every user gets unlimited AI template suggestions at no extra charge.
 * AI features are included in the $0.99/call price.
 * 
 * Request body:
 * {
 *   templateType: "standardResponse" | "voicemailResponse" | "afterHoursResponse",
 *   userRequest: "Make it more friendly and mention we call back within 30 minutes"
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
    const body = await req.json();

    const { templateType, userRequest } = body;

    // Validate templateType
    const validTypes = ['standardResponse', 'voicemailResponse', 'afterHoursResponse'] as const;
    if (!validTypes.includes(templateType)) {
      return NextResponse.json(
        { error: 'Invalid templateType. Must be standardResponse, voicemailResponse, or afterHoursResponse' },
        { status: 400 }
      );
    }

    if (!userRequest || typeof userRequest !== 'string' || userRequest.trim().length === 0) {
      return NextResponse.json(
        { error: 'userRequest is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Fetch user with related data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        messageTemplates: true,
        businessSettings: true,
        wallet: true,
      },
    });

    if (!user || !user.messageTemplates || !user.businessSettings) {
      return NextResponse.json({ error: 'User not fully configured' }, { status: 400 });
    }

    // Generate AI suggestion
    const currentTemplate = user.messageTemplates[templateType as keyof typeof user.messageTemplates] as string;

    const result = await generateTemplateImprovement({
      templateType: templateType as 'standardResponse' | 'voicemailResponse' | 'afterHoursResponse',
      currentTemplate,
      userRequest: userRequest.trim(),
      businessName: user.businessSettings.businessName,
      aiInstructions: (user.messageTemplates as any).aiInstructions,
    });

    // Log the change
    const balanceAfter = user.wallet ? user.wallet.balance.toNumber() : 0;

    await prisma.messageChangeLog.create({
      data: {
        userId,
        messageType: templateType,
        changeMethod: 'ai',
        charged: false,
        amount: toDecimal(0),
        balanceAfter: toDecimal(balanceAfter),
      },
    });

    return NextResponse.json({
      suggestion: result.text,
      templateType,
      currentTemplate,
    });
  } catch (error) {
    console.error('❌ AI assist error:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI suggestion' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai-assist
 * 
 * Returns the user's AI template status.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        messageTemplates: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      unlimited: true,
      hasAiInstructions: !!(user.messageTemplates as any)?.aiInstructions,
    });
  } catch (error) {
    console.error('❌ AI assist status error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI usage status' },
      { status: 500 }
    );
  }
}
