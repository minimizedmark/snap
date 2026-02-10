import { Decimal } from '@prisma/client/runtime/library';

// Pricing constants
export const PRICING = {
  // SnapCalls Basic tier: $1.00 deducted per call
  // SnapCalls Pro tier: $1.50 deducted per call (includes AI transcription + dynamic responses)
  // Effective cost to user is lower when they load wallet with bonuses:
  //   - $20 load (0% bonus): Basic=$1.00/call, Pro=$1.50/call
  //   - $100 load (50% bonus): Basic=$0.67/call, Pro=$1.00/call (they got 50% more credits)
  SNAPCALLS_BASIC: {
    PRICE: 1.0,             // Amount deducted from wallet per call
  },
  SNAPCALLS_PRO: {
    PRICE: 1.5,             // Amount deducted from wallet per call (includes AI costs)
  },
  AI_FEATURES: {
    // BASIC tier: AI template assistance with monthly limits
    BASIC_MONTHLY_LIMITS: {
      standardResponse: 2,    // 2 free AI-assisted changes per month
      voicemailResponse: 2,   // 2 free AI-assisted changes per month
      afterHoursResponse: 1,  // 1 free AI-assisted change per month
    },
    TEMPLATE_CHANGE_OVERAGE: 0.25,  // $0.25 per AI change after free limit
  },
  TRANSCRIPTION: {
    GPT4O_MINI: 0.003,  // Cost per minute for voicemail transcription (our cost)
    // PRO tier: transcription included in $1.50/call, no extra charge to user
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

/**
 * Parameters for calculating itemized call costs
 */
export interface CallPricingParams {
  tier: SnapCallsTier;
  isVip: boolean;
  hasVoicemail: boolean;
  sequencesEnabled: boolean;
  recognitionEnabled: boolean;
  twoWayEnabled: boolean;
  vipPriorityEnabled: boolean;
  transcriptionEnabled: boolean;
  isRepeatCaller: boolean;
  customerReplied: boolean;
}

/**
 * Itemized breakdown of call costs
 */
export interface CallPricingResult {
  /** Base cost for the call ($1.00 for BASIC, $1.50 for PRO) */
  baseCost: number;
  /** Cost for follow-up sequences ($0.50 if enabled) */
  sequencesCost: number;
  /** Cost for caller recognition ($0.25 if enabled and repeat caller) */
  recognitionCost: number;
  /** Cost for two-way communication ($0.50 if enabled) */
  twoWayCost: number;
  /** Cost for VIP priority handling ($0.50 for VIP callers, $0.25 for regular) */
  vipPriorityCost: number;
  /** Cost for voicemail transcription ($0.25 if enabled and has voicemail) */
  transcriptionCost: number;
  /** Total cost to deduct from wallet */
  totalCost: number;
  /** Tier used for pricing */
  tier: SnapCallsTier;
}

/**
 * Calculates itemized call costs based on tier and enabled features.
 * 
 * Pricing breakdown:
 * - Base: $1.00 (BASIC) or $1.50 (PRO, includes AI transcription + response generation)
 * - Follow-up sequences: +$0.50 if enabled
 * - Caller recognition: +$0.25 if enabled AND repeat caller
 * - Two-way communication: +$0.50 if enabled
 * - VIP priority: +$0.50 if VIP caller (or +$0.25 if enabled but not VIP)
 * - Voicemail transcription: +$0.25 if enabled AND voicemail exists
 * 
 * Note: The actual cost to the user is lower when they loaded wallet with bonuses.
 * For example, with 50% bonus ($100 load gets $150 credits):
 *   - Basic tier: $1.00 deducted, but effective cost is $0.67
 *   - Pro tier: $1.50 deducted, but effective cost is $1.00
 * 
 * @param params - Call pricing parameters including tier and feature flags
 * @returns Itemized cost breakdown with total
 */
export function calculateCallCost(params: CallPricingParams): CallPricingResult {
  const baseCost = params.tier === 'BASIC' 
    ? PRICING.SNAPCALLS_BASIC.PRICE
    : PRICING.SNAPCALLS_PRO.PRICE;

  const sequencesCost = params.sequencesEnabled ? 0.50 : 0;
  
  const recognitionCost = (params.recognitionEnabled && params.isRepeatCaller) ? 0.25 : 0;
  
  const twoWayCost = params.twoWayEnabled ? 0.50 : 0;
  
  const vipPriorityCost = params.vipPriorityEnabled
    ? (params.isVip ? 0.50 : 0.25)
    : 0;
  
  const transcriptionCost = (params.transcriptionEnabled && params.hasVoicemail) ? 0.25 : 0;

  const totalCost = baseCost + sequencesCost + recognitionCost + twoWayCost + vipPriorityCost + transcriptionCost;

  return {
    baseCost,
    sequencesCost,
    recognitionCost,
    twoWayCost,
    vipPriorityCost,
    transcriptionCost,
    totalCost,
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

