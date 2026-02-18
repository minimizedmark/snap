import { NextRequest, NextResponse } from 'next/server';
import { validateStripeWebhook } from '@/lib/stripe';
import { creditWallet } from '@/lib/wallet';
import { calculateWalletDeposit } from '@/lib/pricing';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import Stripe from 'stripe';
import type { SubscriptionType } from '@prisma/client';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSubscriptionTypeFromPriceId(priceId: string): SubscriptionType {
  if (priceId === env.STRIPE_SNAPLINE_PRICE_ID) return 'SNAPLINE';
  if (priceId === env.STRIPE_BASIC_PRICE_ID) return 'BASIC';
  console.warn('⚠️  Unknown Stripe price ID:', priceId, '- defaulting to BASIC');
  return 'BASIC';
}

function emailWrapper(body: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="margin:0;padding:0;background:#F5F5F5;font-family:system-ui,-apple-system,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;padding:40px 16px;">
          <tr>
            <td align="center">
              <table width="100%" style="max-width:560px;">
                <!-- Header -->
                <tr>
                  <td style="background:#0A0A0A;border-bottom:4px solid #FF6B00;padding:20px 32px;border-radius:8px 8px 0 0;">
                    <span style="color:#ffffff;font-weight:700;font-size:18px;letter-spacing:0.1em;text-transform:uppercase;">Snap Calls</span>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="background:#ffffff;border:4px solid #FF6B00;border-top:none;padding:32px;border-radius:0 0 8px 8px;">
                    ${body}
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="padding:24px 0;text-align:center;">
                    <p style="margin:0;color:#666666;font-size:13px;">
                      &copy; ${new Date().getFullYear()} Snap Calls &mdash; Never miss another customer.
                    </p>
                    <p style="margin:8px 0 0;color:#999999;font-size:12px;">
                      Questions? <a href="mailto:support@snappcalls.app" style="color:#FF6B00;">support@snappcalls.app</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

async function sendEmail(to: string, subject: string, body: string) {
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: `Snap Calls <${process.env.FROM_EMAIL}>`,
    to,
    subject,
    html: emailWrapper(body),
  });
}

// ─── Webhook Handler ──────────────────────────────────────────────────────────

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
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        console.log('Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Error handling webhook:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

// ─── Event Handlers ───────────────────────────────────────────────────────────

/**
 * Idempotency: referenceId (paymentIntent.id) on WalletTransaction prevents
 * double-crediting if Stripe retries delivery.
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const customerId = paymentIntent.customer as string;
  const amount = paymentIntent.amount / 100;

  const existingTransaction = await prisma.walletTransaction.findFirst({
    where: { referenceId: paymentIntent.id },
  });

  if (existingTransaction) {
    console.log('✅ Payment already processed (idempotent):', paymentIntent.id);
    return;
  }

  const stripeCustomer = await prisma.stripeCustomer.findUnique({
    where: { stripeCustomerId: customerId },
    include: { user: true },
  });

  if (!stripeCustomer) {
    console.error('❌ No user found for Stripe customer:', customerId);
    return;
  }

  await handleWalletDeposit(stripeCustomer.userId, stripeCustomer.user.email, amount, paymentIntent.id);
}

async function handleWalletDeposit(userId: string, userEmail: string, amount: number, paymentIntentId: string) {
  const depositInfo = calculateWalletDeposit(amount);

  const balanceAfter = await creditWallet({
    userId,
    amount: depositInfo.totalCredit,
    description: `Wallet deposit: $${amount} + $${depositInfo.bonusAmount} bonus`,
    referenceId: paymentIntentId,
  });

  console.log('✅ Wallet credited:', {
    userId,
    depositAmount: amount,
    bonusAmount: depositInfo.bonusAmount,
    totalCredit: depositInfo.totalCredit,
    balanceAfter,
  });

  try {
    await sendEmail(
      userEmail,
      'Wallet Deposit Confirmed — Snap Calls',
      `
        <h2 style="margin:0 0 8px;color:#0A0A0A;font-size:22px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Deposit Confirmed</h2>
        <p style="margin:0 0 24px;color:#666666;font-size:14px;">Your wallet has been topped up and is ready to use.</p>

        <table width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #e5e7eb;border-radius:6px;overflow:hidden;margin-bottom:24px;">
          <tr style="background:#F5F5F5;">
            <td style="padding:12px 16px;color:#333333;font-weight:600;font-size:14px;">Deposit Amount</td>
            <td style="padding:12px 16px;color:#333333;font-size:14px;text-align:right;">$${depositInfo.depositAmount.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding:12px 16px;color:#333333;font-weight:600;font-size:14px;">Bonus Credit</td>
            <td style="padding:12px 16px;color:#FF6B00;font-size:14px;font-weight:700;text-align:right;">+ $${depositInfo.bonusAmount.toFixed(2)}</td>
          </tr>
          <tr style="background:#0A0A0A;">
            <td style="padding:12px 16px;color:#ffffff;font-weight:700;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;">New Balance</td>
            <td style="padding:12px 16px;color:#FF6B00;font-size:16px;font-weight:700;text-align:right;">$${balanceAfter.toFixed(2)}</td>
          </tr>
        </table>

        <p style="margin:0;color:#666666;font-size:14px;">Every missed call is now an opportunity. Snap Calls has you covered.</p>
      `
    );
  } catch (error) {
    console.error('❌ Failed to send deposit confirmation email:', error);
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const customerId = paymentIntent.customer as string;

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

  try {
    await sendEmail(
      stripeCustomer.user.email,
      'Wallet Deposit Failed — Snap Calls',
      `
        <h2 style="margin:0 0 8px;color:#0A0A0A;font-size:22px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Payment Failed</h2>
        <p style="margin:0 0 24px;color:#666666;font-size:14px;">We were unable to process your wallet deposit.</p>

        <div style="border:2px solid #fecaca;background:#fef2f2;border-radius:6px;padding:16px;margin-bottom:24px;">
          <p style="margin:0;color:#991b1b;font-size:14px;font-weight:600;">
            ${paymentIntent.last_payment_error?.message || 'An unexpected error occurred.'}
          </p>
        </div>

        <p style="margin:0;color:#666666;font-size:14px;">Please try again or contact us at <a href="mailto:support@snappcalls.app" style="color:#FF6B00;font-weight:600;">support@snappcalls.app</a> if the problem persists.</p>
      `
    );
  } catch (error) {
    console.error('❌ Failed to send payment failure email:', error);
  }
}

/**
 * Idempotent: updating subscription status to the same value is safe.
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const stripeCustomer = await prisma.stripeCustomer.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!stripeCustomer) {
    console.error('❌ No user found for Stripe customer:', customerId);
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  if (!priceId) {
    console.error('❌ No price ID found in subscription:', subscription.id);
    return;
  }

  const subscriptionType = getSubscriptionTypeFromPriceId(priceId);

  await prisma.user.update({
    where: { id: stripeCustomer.userId },
    data: {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionType,
    },
  });

  console.log('✅ Subscription updated:', {
    userId: stripeCustomer.userId,
    subscriptionId: subscription.id,
    subscriptionType,
    status: subscription.status,
  });
}

/**
 * Idempotent: downgrading to BASIC multiple times is safe.
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const stripeCustomer = await prisma.stripeCustomer.findUnique({
    where: { stripeCustomerId: customerId },
    include: { user: true },
  });

  if (!stripeCustomer) {
    console.error('❌ No user found for Stripe customer:', customerId);
    return;
  }

  await prisma.user.update({
    where: { id: stripeCustomer.userId },
    data: {
      subscriptionType: 'BASIC',
      subscriptionStatus: 'cancelled',
      stripeSubscriptionId: null,
    },
  });

  console.log('✅ Subscription cancelled:', {
    userId: stripeCustomer.userId,
    subscriptionId: subscription.id,
  });

  try {
    await sendEmail(
      stripeCustomer.user.email,
      'Subscription Cancelled — Snap Calls',
      `
        <h2 style="margin:0 0 8px;color:#0A0A0A;font-size:22px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Subscription Cancelled</h2>
        <p style="margin:0 0 24px;color:#666666;font-size:14px;">Your SnapLine subscription has been cancelled and you've been moved to the Basic plan.</p>

        <p style="margin:0 0 24px;color:#666666;font-size:14px;">You can upgrade again at any time from your dashboard — no waiting, no setup fee.</p>

        <p style="margin:0;color:#666666;font-size:14px;">Questions? We're here at <a href="mailto:support@snappcalls.app" style="color:#FF6B00;font-weight:600;">support@snappcalls.app</a>.</p>
      `
    );
  } catch (error) {
    console.error('❌ Failed to send cancellation email:', error);
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const stripeCustomer = await prisma.stripeCustomer.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!stripeCustomer) {
    console.error('❌ No user found for Stripe customer:', customerId);
    return;
  }

  await prisma.user.update({
    where: { id: stripeCustomer.userId },
    data: { subscriptionStatus: 'active' },
  });

  console.log('✅ Subscription payment succeeded:', {
    userId: stripeCustomer.userId,
    invoiceId: invoice.id,
    amount: invoice.amount_paid / 100,
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const stripeCustomer = await prisma.stripeCustomer.findUnique({
    where: { stripeCustomerId: customerId },
    include: { user: true },
  });

  if (!stripeCustomer) {
    console.error('❌ No user found for Stripe customer:', customerId);
    return;
  }

  await prisma.user.update({
    where: { id: stripeCustomer.userId },
    data: {
      subscriptionStatus: 'paused',
      isActive: false,
    },
  });

  console.error('❌ Subscription payment failed:', {
    userId: stripeCustomer.userId,
    invoiceId: invoice.id,
  });

  try {
    await sendEmail(
      stripeCustomer.user.email,
      'Action Required: Subscription Payment Failed — Snap Calls',
      `
        <h2 style="margin:0 0 8px;color:#0A0A0A;font-size:22px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Payment Failed</h2>
        <p style="margin:0 0 24px;color:#666666;font-size:14px;">We were unable to process your SnapLine subscription renewal. Your service has been paused.</p>

        <div style="border:2px solid #fecaca;background:#fef2f2;border-radius:6px;padding:16px;margin-bottom:24px;">
          <p style="margin:0;color:#991b1b;font-size:14px;font-weight:600;">
            Please update your payment method to restore service.
          </p>
        </div>

        <p style="margin:0;color:#666666;font-size:14px;">Log in to your dashboard to update your billing details, or contact us at <a href="mailto:support@snappcalls.app" style="color:#FF6B00;font-weight:600;">support@snappcalls.app</a>.</p>
      `
    );
  } catch (error) {
    console.error('❌ Failed to send payment failure email:', error);
  }
}
