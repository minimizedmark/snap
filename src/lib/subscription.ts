import { prisma } from './prisma';
import { stripe } from './stripe';
import { PRICING } from './pricing';
import { sendEmail } from './email';

export interface SubscriptionResult {
  success: boolean;
  message: string;
}

/**
 * Checks if user should receive abuse prevention warnings or be suspended
 * Based on regular (non-forwarded) call usage
 */
export async function checkAbuseThresholds(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { 
      wallet: true,
      phoneNumber: true,
    },
  });

  if (!user || user.subscriptionType === 'SNAPLINE') {
    return; // SnapLine users can make regular calls
  }

  const regularCallCount = user.directCallsThisMonth;

  // Send warning at 15 regular calls
  if (regularCallCount === PRICING.ABUSE_PREVENTION.WARNING_THRESHOLD && user.upgradeWarningsSent === 0) {
    await sendAbuseWarningEmail(user.email, regularCallCount, user.wallet?.balance);
    await prisma.user.update({
      where: { id: userId },
      data: { upgradeWarningsSent: 1 },
    });
    return;
  }

  // Suspend service at 20 regular calls
  if (regularCallCount >= PRICING.ABUSE_PREVENTION.SUSPENSION_THRESHOLD && user.isActive) {
    await suspendForAbuseViolation(userId);
  }
}

/**
 * Suspends user service for ToS violation (using forwarding number for regular calls)
 */
async function suspendForAbuseViolation(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { 
      wallet: true,
      phoneNumber: true,
    },
  });

  if (!user) return;

  // Suspend the service
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: 'suspended',
      isActive: false,
    },
  });

  // Send suspension email with wallet balance and SnapLine upgrade link
  await sendSuspensionEmail(
    user.email,
    user.directCallsThisMonth,
    user.wallet?.balance,
    user.phoneNumber?.phoneNumber
  );
}

/**
 * Creates a Stripe subscription for SnapLine plan ($20/month)
 */
async function createSnapLineSubscription(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { stripeCustomer: true },
  });

  if (!user?.stripeCustomer?.stripeCustomerId) {
    throw new Error('No Stripe customer found');
  }

  // Create subscription
  const subscription = await stripe().subscriptions.create({
    customer: user.stripeCustomer.stripeCustomerId,
    items: [
      {
        price: process.env.STRIPE_SNAPLINE_PRICE_ID!, // $20/month price ID from Stripe
      },
    ],
    metadata: {
      userId: userId,
      plan: 'snapline',
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: 'active',
    },
  });
}

/**
 * Manually subscribes user to SnapLine (user-initiated)
 * This is the only way to upgrade from suspended BASIC tier
 */
export async function subscribeToSnapLine(userId: string): Promise<SubscriptionResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { stripeCustomer: true },
  });

  if (!user) {
    return { success: false, message: 'User not found' };
  }

  if (user.subscriptionType === 'SNAPLINE') {
    return { success: false, message: 'Already subscribed to SnapLine' };
  }

  if (!user.stripeCustomer?.stripeCustomerId) {
    return { success: false, message: 'No payment method on file' };
  }

  try {
    // Create subscription (first charge happens now)
    await createSnapLineSubscription(userId);

    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionType: 'SNAPLINE',
        subscriptionStatus: 'active',
        isActive: true,  // Reactivate service
        directCallsThisMonth: 0,  // Reset counter
        upgradeWarningsSent: 0,
      },
    });

    await sendEmail(user.email, {
      subject: 'Welcome to SnapLine!',
      template: 'snapline-activated',
      data: {},
    });

    return { success: true, message: 'Successfully subscribed to SnapLine' };
  } catch (error) {
    console.error('SnapLine subscription error:', error);
    return { success: false, message: 'Subscription failed' };
  }
}

/**
 * Increments regular (non-forwarded) call counter for abuse prevention
 */
export async function incrementRegularCallCount(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      directCallsThisMonth: { increment: 1 },
    },
  });

  // Check abuse thresholds
  await checkAbuseThresholds(userId);
}

/**
 * Resets monthly regular call counter (run via cron on 1st of month)
 */
export async function resetMonthlyRegularCallCounts(): Promise<void> {
  await prisma.user.updateMany({
    data: {
      directCallsThisMonth: 0,
      upgradeWarningsSent: 0,
    },
  });
}

/**
 * Sends abuse warning email at 15 regular calls
 */
async function sendAbuseWarningEmail(
  email: string, 
  callCount: number, 
  walletBalance: any
): Promise<void> {
  const balance = walletBalance ? walletBalance.toNumber() : 0;
  
  await sendEmail(email, {
    subject: '⚠️ SnapCalls Usage Warning - Action Required',
    template: 'abuse-warning',
    data: {
      callCount,
      suspensionThreshold: PRICING.ABUSE_PREVENTION.SUSPENSION_THRESHOLD,
      walletBalance: balance,
    },
  });
}

/**
 * Sends suspension email at 20 regular calls
 */
async function sendSuspensionEmail(
  email: string,
  callCount: number,
  walletBalance: any,
  phoneNumber?: string | null
): Promise<void> {
  const balance = walletBalance ? walletBalance.toNumber() : 0;
  
  await sendEmail(email, {
    subject: '🚨 SnapCalls Service Suspended - ToS Violation',
    template: 'service-suspended',
    data: {
      callCount,
      walletBalance: balance,
      phoneNumber: phoneNumber || 'N/A',
      snaplineUpgradeUrl: `${process.env.APP_URL}/upgrade-snapline`,
    },
  });
}

/**
 * Cancels SnapLine subscription and downgrades to BASIC
 */
export async function cancelSnapLineSubscription(userId: string): Promise<SubscriptionResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user?.stripeSubscriptionId) {
    return { success: false, message: 'No active subscription' };
  }

  try {
    await stripe().subscriptions.cancel(user.stripeSubscriptionId);

    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionType: 'BASIC',
        subscriptionStatus: 'cancelled',
        stripeSubscriptionId: null,
        directCallsThisMonth: 0,
        upgradeWarningsSent: 0,
      },
    });

    return { success: true, message: 'SnapLine subscription cancelled' };
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return { success: false, message: 'Cancellation failed' };
  }
}
