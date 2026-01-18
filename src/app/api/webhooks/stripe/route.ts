import { NextRequest, NextResponse } from 'next/server';
import { validateStripeWebhook } from '@/lib/stripe';
import { creditWallet } from '@/lib/wallet';
import { calculateWalletDeposit } from '@/lib/pricing';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

/**
 * Handles Stripe webhook events
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = validateStripeWebhook(body, signature);
  } catch (error) {
    console.error('❌ Stripe webhook validation failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        // Handle subscription events if needed
        console.log('Subscription event:', event.type);
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Error handling webhook:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Handles successful payment
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const customerId = paymentIntent.customer as string;
  const amount = paymentIntent.amount / 100; // Convert from cents

  // Find user by Stripe customer ID
  const stripeCustomer = await prisma.stripeCustomer.findUnique({
    where: { stripeCustomerId: customerId },
    include: { user: true },
  });

  if (!stripeCustomer) {
    console.error('❌ No user found for Stripe customer:', customerId);
    return;
  }

  // Calculate deposit with bonus
  const depositInfo = calculateWalletDeposit(amount);

  // Credit wallet with bonus
  const balanceAfter = await creditWallet({
    userId: stripeCustomer.userId,
    amount: depositInfo.totalCredit,
    description: `Wallet deposit: $${amount} + $${depositInfo.bonusAmount} bonus`,
    referenceId: paymentIntent.id,
  });

  console.log('✅ Payment processed:', {
    userId: stripeCustomer.userId,
    depositAmount: amount,
    bonusAmount: depositInfo.bonusAmount,
    totalCredit: depositInfo.totalCredit,
    balanceAfter,
  });

  // Send confirmation email
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: `Snapback <${process.env.FROM_EMAIL}>`,
      to: stripeCustomer.user.email,
      subject: '✅ Wallet Deposit Successful',
      html: `
        <h2>Deposit Successful!</h2>
        <p>Your wallet has been credited with $${depositInfo.totalCredit.toFixed(2)}:</p>
        <ul>
          <li>Deposit amount: $${depositInfo.depositAmount.toFixed(2)}</li>
          <li>Bonus: $${depositInfo.bonusAmount.toFixed(2)} (${depositInfo.description})</li>
        </ul>
        <p>New balance: $${balanceAfter.toFixed(2)}</p>
        <p>Thank you for using Snapback!</p>
      `,
    });
  } catch (error) {
    console.error('❌ Failed to send deposit confirmation email:', error);
  }
}

/**
 * Handles failed payment
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const customerId = paymentIntent.customer as string;

  // Find user by Stripe customer ID
  const stripeCustomer = await prisma.stripeCustomer.findUnique({
    where: { stripeCustomerId: customerId },
    include: { user: true },
  });

  if (!stripeCustomer) {
    console.error('❌ No user found for Stripe customer:', customerId);
    return;
  }

  console.error('❌ Payment failed:', {
    userId: stripeCustomer.userId,
    paymentIntentId: paymentIntent.id,
    failureMessage: paymentIntent.last_payment_error?.message,
  });

  // Send failure notification email
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: `Snapback <${process.env.FROM_EMAIL}>`,
      to: stripeCustomer.user.email,
      subject: '❌ Wallet Deposit Failed',
      html: `
        <h2>Payment Failed</h2>
        <p>We were unable to process your wallet deposit.</p>
        <p>Reason: ${paymentIntent.last_payment_error?.message || 'Unknown error'}</p>
        <p>Please try again or contact support if the problem persists.</p>
      `,
    });
  } catch (error) {
    console.error('❌ Failed to send payment failure email:', error);
  }
}
