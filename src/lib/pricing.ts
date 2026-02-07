import { Decimal } from '@prisma/client/runtime/library';

// Pricing constants
export const PRICING = {
  // SnapCalls Basic tier: $1.00 deducted per call
  // SnapCalls Pro tier: $1.50 deducted per call (includes voicemail transcription)
  // Effective cost to user is lower when they load wallet with bonuses:
  //   - $20 load (0% bonus): Basic=$1.00/call, Pro=$1.50/call
  //   - $100 load (50% bonus): Basic=$0.67/call, Pro=$1.00/call (they got 50% more credits)
  SNAPCALLS_BASIC: {
    PRICE: 1.0,             // Amount deducted from wallet per call
  },
  SNAPCALLS_PRO: {
    PRICE: 1.5,             // Amount deducted from wallet per call
  },
  WALLET_DEPOSITS: {
    20: { bonus: 0, description: '0% bonus' },
    30: { bonus: 4.5, description: '15% bonus' },
    50: { bonus: 12.5, description: '25% bonus' },
    100: { bonus: 50, description: '50% bonus' },
  },
  SETUP_FEE: 5.0,
  SNAPLINE_MONTHLY: 20.0,  // SnapLine subscription (full phone service)
  ABUSE_PREVENTION: {
    WARNING_THRESHOLD: 15,   // Warning email at 15 regular calls
    SUSPENSION_THRESHOLD: 20, // Suspend service at 20 regular calls
  },
  AUTO_RELOAD: {
    DEFAULT_THRESHOLD: 10.0,
    DEFAULT_AMOUNT: 20.0,
  },
  MINIMUM_BALANCE: 0.67,    // Minimum for cheapest call (Basic with max bonus)
  LOW_BALANCE_ALERTS: [10.0, 5.0, 2.0],
} as const;

export type SnapCallsTier = 'BASIC' | 'PRO';

export interface CallPricingParams {
  tier: SnapCallsTier;
  hasVoicemail: boolean;
}

export interface CallPricingResult {
  cost: number;
  tier: SnapCallsTier;
}

/**
 * Calculates the cost to deduct from wallet for a call
 * Note: The actual cost to the user is lower when they loaded wallet with bonuses.
 * For example, with 50% bonus ($100 load gets $150 credits):
 *   - Basic tier: $1.00 deducted, but effective cost is $0.67
 *   - Pro tier: $1.50 deducted, but effective cost is $1.00
 */
export function calculateCallCost(params: CallPricingParams): CallPricingResult {
  const cost = params.tier === 'BASIC' 
    ? PRICING.SNAPCALLS_BASIC.PRICE
    : PRICING.SNAPCALLS_PRO.PRICE;

  return {
    cost,
    tier: params.tier,
  };
}

/**
 * Gets the effective cost per call to the user based on their wallet bonus
 * Used for display purposes to show users their actual cost per call
 * 
 * Example: User loads $100, gets $150 (50% bonus)
 * - Basic: $1.00 deducted / 1.5 = $0.67 effective cost
 * - Pro: $1.50 deducted / 1.5 = $1.00 effective cost
 */
export function getEffectiveCallCost(tier: SnapCallsTier, bonusPercentage: number): number {
  const deductedAmount = tier === 'BASIC' 
    ? PRICING.SNAPCALLS_BASIC.PRICE
    : PRICING.SNAPCALLS_PRO.PRICE;
  
  // Effective cost = amount deducted / (1 + bonus percentage)
  return deductedAmount / (1 + bonusPercentage);
}

/**
 * Calculates the wallet deposit amount with bonus
 */
export function calculateWalletDeposit(amount: number): {
  depositAmount: number;
  bonusAmount: number;
  totalCredit: number;
  description: string;
} {
  const bonus = PRICING.WALLET_DEPOSITS[amount as keyof typeof PRICING.WALLET_DEPOSITS];

  if (bonus) {
    return {
      depositAmount: amount,
      bonusAmount: bonus.bonus,
      totalCredit: amount + bonus.bonus,
      description: bonus.description,
    };
  }

  // No bonus for other amounts
  return {
    depositAmount: amount,
    bonusAmount: 0,
    totalCredit: amount,
    description: 'Standard deposit',
  };
}

/**
 * Converts number to Decimal for Prisma
 */
export function toDecimal(value: number): Decimal {
  return new Decimal(value);
}

/**
 * Converts Decimal to number
 */
export function fromDecimal(value: Decimal): number {
  return value.toNumber();
}

/**
 * Formats currency for display
 */
export function formatCurrency(amount: number | Decimal): string {
  const num = typeof amount === 'number' ? amount : fromDecimal(amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
}

/**
 * Processes one-time setup fee from wallet
 */
export async function processSetupFee(userId: string): Promise<number> {
  const { debitWallet } = await import('./wallet');
  return await debitWallet({
    userId,
    amount: PRICING.SETUP_FEE,
    description: 'One-time setup fee',
  });
}

