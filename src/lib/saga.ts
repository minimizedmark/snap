/**
 * Saga Pattern for Distributed Transactions
 * 
 * Ensures data consistency by running compensation functions in reverse order
 * when any step in a multi-step process fails.
 */

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

/**
 * REMOVED: MissedCallSaga and its steps (generateResponseStep, sendSmsStep,
 * debitWalletStep, createLogStep, checkBalanceStep) were deleted because:
 *
 * 1. Dead code — nothing called processMissedCall() anywhere in the codebase.
 * 2. Non-atomic wallet debit — used raw prisma.wallet.update instead of
 *    debitWallet() from wallet.ts, creating race conditions under concurrent load.
 * 3. Float arithmetic on financial data — parseFloat().toString() - amount
 *    produces precision errors (e.g. $0.9899999999).
 * 4. Unencrypted credential access — sendSmsStep read twilioConfig.accountSid
 *    directly; live code marks these 'ADMIN_MANAGED' and routes through admin creds.
 * 5. Route handler import — imported DEFAULT_TEMPLATES from an API route file.
 *
 * The generic Saga<T> class above is kept — it's sound infrastructure.
 * If a saga-based call pipeline is needed in future, build it on top of the
 * existing debitWallet(), creditWallet(), and sendSmsFromNumber() primitives.
 */
