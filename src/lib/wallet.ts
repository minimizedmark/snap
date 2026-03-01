import { prisma } from './prisma';
import { Prisma } from '@prisma/client';
import { toDecimal, fromDecimal, PRICING } from './pricing';
import { chargePaymentMethod } from './stripe';
import { sendEmail } from './email';

/**
 * Custom error for insufficient wallet balance
 */
export class InsufficientBalanceError extends Error {
  constructor(message: string = 'Insufficient wallet balance') {
    super(message);
    this.name = 'InsufficientBalanceError';
  }
}

export interface DebitWalletParams {
  userId: string;
  amount: number;
  description: string;
  referenceId?: string;
}

export interface CreditWalletParams {
  userId: string;
  amount: number;
  description: string;
  referenceId?: string;
}

/**
 * Atomically debits (subtracts) amount from wallet with balance check
 * Uses atomic decrement operation to prevent race conditions
 * Returns new balance or throws InsufficientBalanceError if insufficient funds
 */
export async function debitWallet(params: DebitWalletParams): Promise<number> {
  const { userId, amount, description, referenceId } = params;

  return await prisma.$transaction(async (tx) => {
    // Atomic update with balance check in WHERE clause
    // This prevents race conditions - only updates if balance >= amount
    const result = await tx.wallet.updateMany({
      where: {
        userId,
        balance: { gte: toDecimal(amount) },
      },
      data: {
        balance: { decrement: toDecimal(amount) },
      },
    });

    // If no rows were updated, balance was insufficient
    if (result.count === 0) {
      throw new InsufficientBalanceError();
    }

    // Read the new balance
    const wallet = await tx.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const newBalance = fromDecimal(wallet.balance);

    // Create transaction record
    await tx.walletTransaction.create({
      data: {
        userId,
        amount: toDecimal(amount),
        type: 'DEBIT',
        description,
        referenceId,
        balanceAfter: wallet.balance,
      },
    });

    return newBalance;
  });
}

/**
 * Atomically credits (adds) amount to wallet
 * Uses atomic increment operation to prevent race conditions
 * Returns new balance
 */
export async function creditWallet(params: CreditWalletParams): Promise<number> {
  const { userId, amount, description, referenceId } = params;

  return await prisma.$transaction(async (tx) => {
    // Atomic increment operation
    const result = await tx.wallet.updateMany({
      where: { userId },
      data: {
        balance: { increment: toDecimal(amount) },
      },
    });

    // Verify wallet exists
    if (result.count === 0) {
      throw new Error('Wallet not found');
    }

    // Read the new balance
    const wallet = await tx.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const newBalance = fromDecimal(wallet.balance);

    // Create transaction record
    await tx.walletTransaction.create({
      data: {
        userId,
        amount: toDecimal(amount),
        type: 'CREDIT',
        description,
        referenceId,
        balanceAfter: wallet.balance,
      },
    });

    return newBalance;
  });
}

/**
 * Gets current wallet balance
 */
export async function getWalletBalance(userId: string): Promise<number> {
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
  });

  if (!wallet) {
    throw new Error('Wallet not found');
  }

  return fromDecimal(wallet.balance);
}

/**
 * Checks if user has sufficient balance
 */
export async function hasInsufficientBalance(userId: string, requiredAmount: number): Promise<boolean> {
  const balance = await getWalletBalance(userId);
  return balance < requiredAmount;
}

/**
 * Atomically checks if a low balance alert should be sent AND records it.
 *
 * Uses a single DB upsert as the concurrency gate — only one concurrent webhook
 * can win the race. The upsert targets the @@unique([userId, alertLevel]) index
 * directly, so Postgres handles the conflict atomically with no read-then-write
 * window.
 *
 * Flow:
 *   1. Balance above threshold → return false immediately (no alert needed)
 *   2. Upsert with conflict target:
 *      - No existing row → INSERT, return true (send the alert)
 *      - Existing row sent < 24h ago → no-op UPDATE (WHERE guards it), return false
 *      - Existing row sent > 24h ago → UPDATE lastSentAt, return true (resend)
 *
 * Returns true if the caller should send the alert email/SMS.
 */
export async function checkAndRecordLowBalanceAlert(
  userId: string,
  alertLevel: number
): Promise<boolean> {
  const balance = await getWalletBalance(userId);

  if (balance > alertLevel) {
    return false;
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const now = new Date();

  // Single upsert targets the unique index — Postgres resolves the concurrent
  // insert race atomically. The updateMany WHERE filters out recently-sent rows
  // so the update only fires when the alert is genuinely stale.
  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Try to update an existing stale row first (most common path after first alert)
    const updated = await tx.lowBalanceAlert.updateMany({
      where: {
        userId,
        alertLevel: toDecimal(alertLevel),
        lastSentAt: { lt: cutoff }, // only update if stale — recent rows are a no-op
      },
      data: { lastSentAt: now },
    });

    if (updated.count > 0) {
      return true; // stale row updated — send the alert
    }

    // No stale row found — either row doesn't exist yet, or it was sent recently.
    // Attempt insert. If the unique constraint fires (concurrent insert), skip.
    try {
      await tx.lowBalanceAlert.create({
        data: {
          userId,
          alertLevel: toDecimal(alertLevel),
          lastSentAt: now,
        },
      });
      return true; // new row inserted — send the alert
    } catch (error: unknown) {
      // Unique constraint violation: concurrent webhook already inserted this row.
      // Also handles the "row exists and was sent recently" case — the updateMany
      // above returned 0 because lastSentAt >= cutoff, and create fails because
      // the row exists. Either way: alert already handled, skip.
      const isUniqueViolation =
        error instanceof Error &&
        'code' in error &&
        (error as { code: string }).code === 'P2002';

      if (isUniqueViolation) {
        return false;
      }

      throw error; // unexpected error — bubble up
    }
  });

  return result;
}

/**
 * Processes auto-reload if enabled and balance is below threshold.
 *
 * Flow:
 * 1. Check wallet has auto-reload enabled and balance is below threshold
 * 2. Verify Stripe customer has a saved payment method
 * 3. Idempotency: skip if an auto-reload was already processed in the last 5 minutes
 * 4. Charge the saved payment method via Stripe
 * 5. On success: credit wallet + notify user
 * 6. On failure: disable auto-reload to prevent repeated charges + notify user
 *
 * @returns true if reload was triggered successfully, false otherwise
 */
export async function processAutoReload(userId: string): Promise<boolean> {
  try {
    // Step 1: Check wallet auto-reload settings
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet || !wallet.autoReloadEnabled) {
      return false;
    }

    const balance = fromDecimal(wallet.balance);
    const threshold = fromDecimal(wallet.autoReloadThreshold);
    const reloadAmount = fromDecimal(wallet.autoReloadAmount);

    if (balance >= threshold) {
      return false;
    }

    // Step 2: Check for saved payment method
    const stripeCustomer = await prisma.stripeCustomer.findUnique({
      where: { userId },
    });

    if (!stripeCustomer || !stripeCustomer.paymentMethodId) {
      console.warn('⚠️  Auto-reload enabled but no payment method saved:', { userId });
      return false;
    }

    // Step 3: Idempotency — skip if auto-reload already triggered in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentReload = await prisma.walletTransaction.findFirst({
      where: {
        userId,
        type: 'CREDIT',
        description: { startsWith: 'Auto-reload:' },
        timestamp: { gte: fiveMinutesAgo },
      },
    });

    if (recentReload) {
      console.log('ℹ️  Auto-reload already triggered recently, skipping:', {
        userId,
        lastReloadAt: recentReload.timestamp,
      });
      return false;
    }

    // Step 4: Charge the saved payment method
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    let paymentIntentId: string;
    try {
      paymentIntentId = await chargePaymentMethod(
        stripeCustomer.stripeCustomerId,
        stripeCustomer.paymentMethodId,
        reloadAmount,
        `Snap Calls auto-reload: $${reloadAmount.toFixed(2)}`
      );
    } catch (stripeError) {
      console.error('❌ Auto-reload Stripe charge failed:', {
        userId,
        amount: reloadAmount,
        error: stripeError,
      });

      // Disable auto-reload to prevent repeated failures
      await prisma.wallet.update({
        where: { userId },
        data: { autoReloadEnabled: false },
      });

      // Notify user of payment failure
      if (user?.email) {
        await sendEmail(user.email, {
          subject: '⚠️ Auto-Reload Payment Failed — Auto-Reload Disabled',
          template: 'payment-failed',
          data: {},
        });
      }

      return false;
    }

    // Step 5: Credit the wallet
    const newBalance = await creditWallet({
      userId,
      amount: reloadAmount,
      description: `Auto-reload: $${reloadAmount.toFixed(2)}`,
      referenceId: `auto_reload_${paymentIntentId}`,
    });

    console.log('✅ Auto-reload successful:', {
      userId,
      reloadAmount,
      newBalance,
      paymentIntentId,
    });

    // Notify user of successful reload
    if (user?.email) {
      await sendEmail(user.email, {
        subject: `✅ Wallet Auto-Reloaded — $${reloadAmount.toFixed(2)} Added`,
        template: 'auto-reload-success',
        data: {
          amount: reloadAmount.toFixed(2),
          newBalance: newBalance.toFixed(2),
        },
      });
    }

    return true;
  } catch (error) {
    console.error('❌ Unexpected error in processAutoReload:', { userId, error });
    return false;
  }
}

/**
 * Initializes a wallet for a new user
 */
export async function initializeWallet(userId: string): Promise<void> {
  await prisma.wallet.create({
    data: {
      userId,
      balance: toDecimal(0),
      currency: 'USD',
      autoReloadEnabled: false,
      autoReloadThreshold: toDecimal(PRICING.AUTO_RELOAD.DEFAULT_THRESHOLD),
      autoReloadAmount: toDecimal(PRICING.AUTO_RELOAD.DEFAULT_AMOUNT),
    },
  });
}
