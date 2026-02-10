import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { PRICING, toDecimal, fromDecimal } from '@/lib/pricing';
import { debitWallet, InsufficientBalanceError } from '@/lib/wallet';
import { generateTemplateImprovement } from '@/lib/ai';

/**
 * POST /api/ai-assist
 * 
 * AI-powered template improvement for both BASIC and PRO tiers.
 * 
 * BASIC tier:
 *   - Free monthly limits: 2 changes for standard/voicemail, 1 for after-hours
 *   - Over limit: $0.25 deducted from wallet per change
 *   - Tracked via MessageChangeTracking table
 * 
 * PRO tier:
 *   - Unlimited AI template changes (no extra charge)
 *   - Uses custom aiInstructions for personalized suggestions
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
        messageChangeTracking: true,
        businessSettings: true,
        wallet: true,
      },
    });

    if (!user || !user.messageTemplates || !user.businessSettings) {
      return NextResponse.json({ error: 'User not fully configured' }, { status: 400 });
    }

    // callTier is available after prisma generate with updated schema
    const isPro = (user as any).callTier === 'PRO';
    const currentMonth = new Date().toISOString().slice(0, 7); // "2026-02"
    let charged = false;
    let chargeAmount = 0;

    // ── BASIC tier: check monthly limits ──────────────────────────
    if (!isPro) {
      // Get or create tracking record
      let tracking = user.messageChangeTracking;

      if (!tracking || tracking.currentMonth !== currentMonth) {
        // New month or no tracking yet — reset/create
        if (tracking) {
          tracking = await prisma.messageChangeTracking.update({
            where: { id: tracking.id },
            data: { currentMonth, changesUsed: 0 },
          });
        } else {
          tracking = await prisma.messageChangeTracking.create({
            data: {
              userId,
              currentMonth,
              changesUsed: 0,
            },
          });
        }
      }

      // Calculate per-type limits
      const limitKey = templateType as keyof typeof PRICING.AI_FEATURES.BASIC_MONTHLY_LIMITS;
      const monthlyLimit = PRICING.AI_FEATURES.BASIC_MONTHLY_LIMITS[limitKey];

      // Count this month's changes for this specific template type
      const changesThisMonth = await prisma.messageChangeLog.count({
        where: {
          userId,
          messageType: templateType,
          changeMethod: 'ai',
          timestamp: {
            gte: new Date(`${currentMonth}-01T00:00:00Z`),
          },
        },
      });

      if (changesThisMonth >= monthlyLimit) {
        // Over limit — charge $0.25 from wallet
        chargeAmount = PRICING.AI_FEATURES.TEMPLATE_CHANGE_OVERAGE;

        if (!user.wallet) {
          return NextResponse.json(
            { error: 'No wallet found. Please add funds first.' },
            { status: 400 }
          );
        }

        const walletBalance = fromDecimal(user.wallet.balance);
        if (walletBalance < chargeAmount) {
          return NextResponse.json(
            {
              error: 'Insufficient wallet balance for AI template change',
              requiredAmount: chargeAmount,
              currentBalance: walletBalance,
              freeChangesUsed: changesThisMonth,
              monthlyLimit,
            },
            { status: 402 }
          );
        }

        charged = true;
      }
    }

    // ── Generate AI suggestion ────────────────────────────────────
    const currentTemplate = user.messageTemplates[templateType as keyof typeof user.messageTemplates] as string;

    const result = await generateTemplateImprovement({
      templateType: templateType as 'standardResponse' | 'voicemailResponse' | 'afterHoursResponse',
      currentTemplate,
      userRequest: userRequest.trim(),
      businessName: user.businessSettings.businessName,
      aiInstructions: isPro ? (user.messageTemplates as any).aiInstructions : null,
    });

    // ── Charge wallet if BASIC and over limit ─────────────────────
    let balanceAfter = user.wallet ? fromDecimal(user.wallet.balance) : 0;

    if (charged) {
      try {
        balanceAfter = await debitWallet({
          userId,
          amount: chargeAmount,
          description: `AI template change: ${templateType}`,
          referenceId: `ai_template_${Date.now()}`,
        });
      } catch (error) {
        if (error instanceof InsufficientBalanceError) {
          return NextResponse.json(
            { error: 'Insufficient wallet balance' },
            { status: 402 }
          );
        }
        throw error;
      }
    }

    // ── Log the change ────────────────────────────────────────────
    await prisma.messageChangeLog.create({
      data: {
        userId,
        messageType: templateType,
        changeMethod: 'ai',
        charged,
        amount: toDecimal(chargeAmount),
        balanceAfter: toDecimal(balanceAfter),
      },
    });

    // Update change tracking counter for BASIC tier
    if (!isPro) {
      await prisma.messageChangeTracking.upsert({
        where: { userId },
        create: {
          userId,
          currentMonth,
          changesUsed: 1,
        },
        update: {
          changesUsed: { increment: 1 },
          currentMonth, // Ensure month is current
        },
      });
    }

    // ── Calculate remaining free changes ──────────────────────────
    let remainingFreeChanges = null;
    if (!isPro) {
      const limitKey = templateType as keyof typeof PRICING.AI_FEATURES.BASIC_MONTHLY_LIMITS;
      const monthlyLimit = PRICING.AI_FEATURES.BASIC_MONTHLY_LIMITS[limitKey];
      const used = await prisma.messageChangeLog.count({
        where: {
          userId,
          messageType: templateType,
          changeMethod: 'ai',
          timestamp: { gte: new Date(`${currentMonth}-01T00:00:00Z`) },
        },
      });
      remainingFreeChanges = Math.max(0, monthlyLimit - used);
    }

    return NextResponse.json({
      suggestion: result.text,
      templateType,
      currentTemplate,
      charged,
      chargeAmount: charged ? chargeAmount : 0,
      balanceAfter,
      remainingFreeChanges,
      tier: isPro ? 'PRO' : 'BASIC',
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
 * Returns the user's AI template usage status for the current month.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const currentMonth = new Date().toISOString().slice(0, 7);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        messageTemplates: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isPro = (user as any).callTier === 'PRO';

    if (isPro) {
      return NextResponse.json({
        tier: 'PRO',
        unlimited: true,
        hasAiInstructions: !!(user.messageTemplates as any)?.aiInstructions,
      });
    }

    // BASIC tier: return per-type usage
    const templateTypes = ['standardResponse', 'voicemailResponse', 'afterHoursResponse'] as const;
    const usage: Record<string, { used: number; limit: number; remaining: number }> = {};

    for (const type of templateTypes) {
      const used = await prisma.messageChangeLog.count({
        where: {
          userId,
          messageType: type,
          changeMethod: 'ai',
          timestamp: { gte: new Date(`${currentMonth}-01T00:00:00Z`) },
        },
      });
      const limit = PRICING.AI_FEATURES.BASIC_MONTHLY_LIMITS[type];
      usage[type] = {
        used,
        limit,
        remaining: Math.max(0, limit - used),
      };
    }

    return NextResponse.json({
      tier: 'BASIC',
      unlimited: false,
      month: currentMonth,
      usage,
      overageCost: PRICING.AI_FEATURES.TEMPLATE_CHANGE_OVERAGE,
    });
  } catch (error) {
    console.error('❌ AI assist status error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI usage status' },
      { status: 500 }
    );
  }
}
