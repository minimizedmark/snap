import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { createPaymentIntent, createStripeCustomer } from '@/lib/stripe';
import { PRICING } from '@/lib/pricing';
import { creditWallet } from '@/lib/wallet';

/**
 * Create a payment intent for wallet deposit
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { amount } = body;

    // Validate amount - must be at least $20 or one of the bonus tiers
    const validAmounts = [20, 30, 50, 100];
    if (!amount || !validAmounts.includes(amount)) {
      return NextResponse.json({
        error: `Invalid amount. Please select $20, $30, $50, or $100`
      }, { status: 400 });
    }

    // Test account: skip Stripe entirely — credit wallet directly and return success
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isTestAccount: true },
    });

    if (user?.isTestAccount) {
      const bonusInfo = PRICING.WALLET_DEPOSITS[amount as keyof typeof PRICING.WALLET_DEPOSITS] ?? { bonus: 0 };
      const totalCredit = amount + bonusInfo.bonus;
      const newBalance = await creditWallet({
        userId: session.user.id,
        amount: totalCredit,
        description: `Test account wallet credit ($${amount} + $${bonusInfo.bonus} bonus)`,
        referenceId: `test_deposit_${Date.now()}`,
      });
      console.log(`🧪 Test account wallet credited: $${totalCredit} (balance: $${newBalance})`);
      return NextResponse.json({ success: true, testAccount: true, newBalance });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY is not set');
      return NextResponse.json({ error: 'Payment processing is not configured. Contact support.' }, { status: 500 });
    }

    // Get or create Stripe customer
    let stripeCustomer = await prisma.stripeCustomer.findUnique({
      where: { userId: session.user.id },
    });

    if (!stripeCustomer) {
      let customerId: string;
      try {
        customerId = await createStripeCustomer(session.user.email!);
      } catch (err) {
        console.error('❌ Failed to create Stripe customer:', err instanceof Error ? err.message : String(err));
        return NextResponse.json({ error: 'Failed to set up payment profile. Please contact support.' }, { status: 500 });
      }
      stripeCustomer = await prisma.stripeCustomer.create({
        data: {
          userId: session.user.id,
          stripeCustomerId: customerId,
        },
      });
    }

    // Create payment intent
    let clientSecret: string;
    let paymentIntentId: string;
    try {
      ({ clientSecret, paymentIntentId } = await createPaymentIntent(
        amount,
        stripeCustomer.stripeCustomerId,
        {
          userId: session.user.id,
          type: 'wallet_deposit',
          amount: amount.toString(),
        }
      ));
    } catch (err) {
      console.error('❌ Failed to create payment intent:', err instanceof Error ? err.message : String(err));
      return NextResponse.json({ error: 'Failed to initialize payment. Please try again or contact support.' }, { status: 500 });
    }

    return NextResponse.json({
      clientSecret,
      paymentIntentId,
    });
  } catch (error) {
    console.error('❌ Unexpected error in deposit route:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again or contact support.' },
      { status: 500 }
    );
  }
}
