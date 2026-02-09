/**
 * Saga Pattern for Distributed Transactions
 * 
 * Ensures data consistency by running compensation functions in reverse order
 * when any step in a multi-step process fails.
 */

import { prisma } from '@/lib/prisma';
import Twilio from 'twilio';

// Generic saga types
export interface SagaStep<TContext> {
  name: string;
  execute: (context: TContext) => Promise<TContext>;
  compensate: (context: TContext) => Promise<void>;
}

export interface SagaResult {
  success: boolean;
  completedSteps: string[];
  error?: Error;
}

/**
 * Generic Saga orchestrator
 * Executes steps in order and compensates in reverse on failure
 */
export class Saga<TContext> {
  private steps: SagaStep<TContext>[];

  constructor(steps: SagaStep<TContext>[]) {
    this.steps = steps;
  }

  /**
   * Execute the saga
   * If any step fails, compensate all previous steps in reverse order
   */
  async execute(initialContext: TContext): Promise<SagaResult> {
    const completedSteps: Array<{ name: string; context: TContext }> = [];
    let currentContext = initialContext;

    try {
      // Execute each step in order
      for (const step of this.steps) {
        console.log(`[Saga] Executing step: ${step.name}`);
        currentContext = await step.execute(currentContext);
        completedSteps.push({ name: step.name, context: currentContext });
        console.log(`[Saga] Completed step: ${step.name}`);
      }

      // All steps succeeded
      return {
        success: true,
        completedSteps: completedSteps.map(s => s.name),
      };
    } catch (error) {
      // A step failed, run compensations in reverse order
      console.error(`[Saga] Step failed:`, error);
      console.log(`[Saga] Running compensations for ${completedSteps.length} completed steps`);

      // Compensate in reverse order
      for (let i = completedSteps.length - 1; i >= 0; i--) {
        const step = completedSteps[i];
        const sagaStep = this.steps.find(s => s.name === step.name);
        
        if (sagaStep) {
          try {
            console.log(`[Saga] Compensating step: ${step.name}`);
            await sagaStep.compensate(step.context);
            console.log(`[Saga] Compensated step: ${step.name}`);
          } catch (compensationError) {
            // Log compensation failures but continue compensating other steps
            console.error(`[Saga] Compensation failed for step ${step.name}:`, compensationError);
          }
        }
      }

      return {
        success: false,
        completedSteps: completedSteps.map(s => s.name),
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}

// Missed Call Pipeline Context
export interface MissedCallContext {
  userId: string;
  callerNumber: string;
  businessNumber: string;
  responseText?: string;
  smsSid?: string;
  smsStatus?: string;
  debitAmount?: number;
  balanceAfter?: number;
  callLogId?: string;
  // Additional fields that might be needed
  twilioCallSid?: string;
  isVip?: boolean;
  isBusinessHours?: boolean;
  responseType?: string;
}

/**
 * Step 1: Generate AI response text
 */
const generateResponseStep: SagaStep<MissedCallContext> = {
  name: 'generate_response',
  execute: async (context) => {
    // TODO: Replace with actual AI response generation
    // For now, fetch user's message templates
    const templates = await prisma.messageTemplates.findUnique({
      where: { userId: context.userId },
    });

    const businessSettings = await prisma.businessSettings.findUnique({
      where: { userId: context.userId },
    });

    // Determine response type based on business hours
    const responseType = context.responseType || 'standard';
    let responseText = templates?.standardResponse || 'Thank you for calling. We will get back to you shortly.';

    if (responseType === 'voicemail') {
      responseText = templates?.voicemailResponse || responseText;
    } else if (responseType === 'after_hours') {
      responseText = templates?.afterHoursResponse || responseText;
    }

    return {
      ...context,
      responseText,
    };
  },
  compensate: async (context) => {
    // No-op: Can't "undo" text generation
    console.log(`[Saga] No compensation needed for generate_response`);
  },
};

/**
 * Step 2: Send SMS via Twilio
 */
const sendSmsStep: SagaStep<MissedCallContext> = {
  name: 'send_sms',
  execute: async (context) => {
    if (!context.responseText) {
      throw new Error('Response text is required to send SMS');
    }

    // Get Twilio credentials
    const twilioConfig = await prisma.twilioConfig.findUnique({
      where: { userId: context.userId },
    });

    if (!twilioConfig) {
      throw new Error('Twilio configuration not found for user');
    }

    // Send SMS (wrapped with circuit breaker in production)
    const twilioClient = Twilio(twilioConfig.accountSid, twilioConfig.authToken);
    
    const message = await twilioClient.messages.create({
      to: context.callerNumber,
      from: context.businessNumber,
      body: context.responseText,
    });

    return {
      ...context,
      smsSid: message.sid,
      smsStatus: message.status,
    };
  },
  compensate: async (context) => {
    // No-op: Can't unsend an SMS
    console.log(`[Saga] No compensation needed for send_sms (SMS already sent: ${context.smsSid})`);
  },
};

/**
 * Step 3: Debit wallet
 */
const debitWalletStep: SagaStep<MissedCallContext> = {
  name: 'debit_wallet',
  execute: async (context) => {
    // Calculate cost (simplified - use actual cost calculation in production)
    const baseCost = 1.00;
    const debitAmount = context.debitAmount || baseCost;

    // Debit wallet and create transaction
    const wallet = await prisma.wallet.findUnique({
      where: { userId: context.userId },
    });

    if (!wallet) {
      throw new Error('Wallet not found for user');
    }

    const newBalance = parseFloat(wallet.balance.toString()) - debitAmount;

    if (newBalance < 0) {
      throw new Error('Insufficient wallet balance');
    }

    const updatedWallet = await prisma.wallet.update({
      where: { userId: context.userId },
      data: { balance: newBalance },
    });

    await prisma.walletTransaction.create({
      data: {
        userId: context.userId,
        amount: debitAmount,
        type: 'DEBIT',
        description: `Missed call from ${context.callerNumber}`,
        referenceId: context.twilioCallSid,
        balanceAfter: newBalance,
      },
    });

    return {
      ...context,
      debitAmount,
      balanceAfter: newBalance,
    };
  },
  compensate: async (context) => {
    // Credit the wallet back
    if (context.debitAmount && context.userId) {
      console.log(`[Saga] Refunding ${context.debitAmount} to wallet for user ${context.userId}`);
      
      const wallet = await prisma.wallet.findUnique({
        where: { userId: context.userId },
      });

      if (wallet) {
        const newBalance = parseFloat(wallet.balance.toString()) + context.debitAmount;

        await prisma.wallet.update({
          where: { userId: context.userId },
          data: { balance: newBalance },
        });

        await prisma.walletTransaction.create({
          data: {
            userId: context.userId,
            amount: context.debitAmount,
            type: 'CREDIT',
            description: `Refund: Failed call processing for ${context.callerNumber}`,
            referenceId: context.twilioCallSid ? `refund-${context.twilioCallSid}` : undefined,
            balanceAfter: newBalance,
          },
        });
      }
    }
  },
};

/**
 * Step 4: Create call log entry
 */
const createLogStep: SagaStep<MissedCallContext> = {
  name: 'create_log',
  execute: async (context) => {
    if (!context.twilioCallSid) {
      throw new Error('Twilio call SID is required to create call log');
    }

    const callLog = await prisma.callLog.create({
      data: {
        userId: context.userId,
        callerNumber: context.callerNumber,
        twilioCallSid: context.twilioCallSid,
        isVip: context.isVip || false,
        isBusinessHours: context.isBusinessHours || true,
        responseType: context.responseType || 'standard',
        messageSent: context.responseText || '',
        smsStatus: context.smsStatus,
        smsMessageSid: context.smsSid,
        baseCost: context.debitAmount || 1.00,
        totalCost: context.debitAmount || 1.00,
      },
    });

    return {
      ...context,
      callLogId: callLog.id,
    };
  },
  compensate: async (context) => {
    // Delete the call log entry
    if (context.callLogId) {
      console.log(`[Saga] Deleting call log entry: ${context.callLogId}`);
      
      try {
        await prisma.callLog.delete({
          where: { id: context.callLogId },
        });
      } catch (error) {
        console.error(`[Saga] Failed to delete call log:`, error);
      }
    }
  },
};

/**
 * Step 5: Check if low balance alert is needed
 */
const checkBalanceStep: SagaStep<MissedCallContext> = {
  name: 'check_balance',
  execute: async (context) => {
    if (context.balanceAfter !== undefined) {
      const LOW_BALANCE_THRESHOLD = 10.00;

      if (context.balanceAfter < LOW_BALANCE_THRESHOLD) {
        // Check if we already sent an alert recently
        const recentAlert = await prisma.lowBalanceAlert.findFirst({
          where: {
            userId: context.userId,
            alertLevel: LOW_BALANCE_THRESHOLD,
            lastSentAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Within last 24 hours
            },
          },
        });

        if (!recentAlert) {
          // Create/update alert record
          const existingAlert = await prisma.lowBalanceAlert.findFirst({
            where: {
              userId: context.userId,
              alertLevel: LOW_BALANCE_THRESHOLD,
            },
          });

          if (!existingAlert) {
            await prisma.lowBalanceAlert.create({
              data: {
                userId: context.userId,
                alertLevel: LOW_BALANCE_THRESHOLD,
                lastSentAt: new Date(),
              },
            });
          } else {
            await prisma.lowBalanceAlert.update({
              where: { id: existingAlert.id },
              data: { lastSentAt: new Date() },
            });
          }

          // TODO: Send low balance notification (email/SMS)
          console.log(`[Saga] Low balance alert triggered for user ${context.userId}`);
        }
      }
    }

    return context;
  },
  compensate: async (context) => {
    // No-op: Alert is informational only
    console.log(`[Saga] No compensation needed for check_balance`);
  },
};

/**
 * Missed Call Saga instance
 */
export const MissedCallSaga = new Saga<MissedCallContext>([
  generateResponseStep,
  sendSmsStep,
  debitWalletStep,
  createLogStep,
  checkBalanceStep,
]);

/**
 * Process a missed call using the saga pattern
 * Ensures atomic-like behavior with automatic rollback on failure
 */
export async function processMissedCall(context: MissedCallContext): Promise<SagaResult> {
  console.log(`[MissedCallSaga] Starting processing for call from ${context.callerNumber}`);
  
  const result = await MissedCallSaga.execute(context);
  
  if (result.success) {
    console.log(`[MissedCallSaga] Successfully processed missed call`);
  } else {
    console.error(`[MissedCallSaga] Failed to process missed call:`, result.error);
  }
  
  return result;
}
