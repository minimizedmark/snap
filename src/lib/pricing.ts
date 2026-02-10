import { Decimal } from '@prisma/client/runtime/library';

// Pricing constants
export const PRICING = {
  // SnapCalls: $0.99 per call — all calls include contextual AI SMS
  // Every call gets: voicemail transcription + AI-powered personalized response
  // Effective cost to user is lower when they load wallet with bonuses:
  //   - $20 load (0% bonus): $0.99/call
  //   - $100 load (50% bonus): $0.66/call (they got 50% more credits)
  SNAPCALLS: {
    PRICE: 0.99,  // Amount deducted from wallet per call
  },
  TRANSCRIPTION: {
    GPT4O_MINI: 0.003,  // Cost per minute for voicemail transcription (our cost, included in $0.99)
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
  MINIMUM_BALANCE: 0.66,    // Minimum for cheapest call ($0.99 with 50% bonus)
  LOW_BALANCE_ALERTS: [10.0, 5.0, 2.0],
} as const;



/**
 * Parameters for calculating itemized call costs
 */
export interface CallPricingParams {
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
  /** Base cost for the call ($0.99) */
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
}

/**
 * Calculates itemized call costs.
 * 
 * Pricing breakdown:
 * - Base: $0.99 (includes AI transcription + contextual response)
 * - Follow-up sequences: +$0.50 if enabled
 * - Caller recognition: +$0.25 if enabled AND repeat caller
 * - Two-way communication: +$0.50 if enabled
 * - VIP priority: +$0.50 if VIP caller (or +$0.25 if enabled but not VIP)
 * - Voicemail transcription: +$0.25 if enabled AND voicemail exists
 * 
 * Note: The actual cost to the user is lower when they loaded wallet with bonuses.
 * For example, with 50% bonus ($100 load gets $150 credits):
 *   - $0.99 deducted, but effective cost is $0.66
 * 
 * @param params - Call pricing parameters with feature flags
 * @returns Itemized cost breakdown with total
 */
export function calculateCallCost(params: CallPricingParams): CallPricingResult {
  const baseCost = PRICING.SNAPCALLS.PRICE;

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
  };
}

/**
 * Gets the effective cost per call to the user based on their wallet bonus
 * Used for display purposes to show users their actual cost per call
 * 
 * Example: User loads $100, gets $150 (50% bonus)
 * - $0.99 deducted / 1.5 = $0.66 effective cost
 */
export function getEffectiveCallCost(bonusPercentage: number): number {
  return PRICING.SNAPCALLS.PRICE / (1 + bonusPercentage);
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

