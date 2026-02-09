/**
 * Custom error classes for SnapCalls SaaS
 * Each error includes a code property for programmatic handling
 */

export class InsufficientBalanceError extends Error {
  public readonly code = 'INSUFFICIENT_BALANCE';
  public readonly userId: string;
  public readonly requiredAmount: number;
  public readonly currentBalance: number;

  constructor(userId: string, requiredAmount: number, currentBalance: number) {
    super(
      `Insufficient balance for user ${userId}. Required: $${requiredAmount}, Available: $${currentBalance}`
    );
    this.name = 'InsufficientBalanceError';
    this.userId = userId;
    this.requiredAmount = requiredAmount;
    this.currentBalance = currentBalance;
    
    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InsufficientBalanceError);
    }
  }
}

export class TwilioServiceError extends Error {
  public readonly code = 'TWILIO_SERVICE_ERROR';
  public readonly twilioErrorCode?: string;
  public readonly statusCode?: number;

  constructor(message: string, twilioErrorCode?: string, statusCode?: number) {
    super(message);
    this.name = 'TwilioServiceError';
    this.twilioErrorCode = twilioErrorCode;
    this.statusCode = statusCode;
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TwilioServiceError);
    }
  }
}

export class StripeWebhookError extends Error {
  public readonly code = 'STRIPE_WEBHOOK_ERROR';
  public readonly eventType?: string;
  public readonly eventId?: string;

  constructor(message: string, eventType?: string, eventId?: string) {
    super(message);
    this.name = 'StripeWebhookError';
    this.eventType = eventType;
    this.eventId = eventId;
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StripeWebhookError);
    }
  }
}

export class CircuitOpenError extends Error {
  public readonly code = 'CIRCUIT_OPEN';
  public readonly serviceName: string;
  public readonly nextAttemptTime: Date;

  constructor(serviceName: string, nextAttemptTime: Date) {
    super(
      `Circuit breaker is open for ${serviceName}. Next attempt at ${nextAttemptTime.toISOString()}`
    );
    this.name = 'CircuitOpenError';
    this.serviceName = serviceName;
    this.nextAttemptTime = nextAttemptTime;
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CircuitOpenError);
    }
  }
}

export class SagaCompensationError extends Error {
  public readonly code = 'SAGA_COMPENSATION_ERROR';
  public readonly sagaName: string;
  public readonly failedStep: string;
  public readonly originalError: Error;

  constructor(sagaName: string, failedStep: string, originalError: Error) {
    super(
      `Saga compensation failed for ${sagaName} at step ${failedStep}: ${originalError.message}`
    );
    this.name = 'SagaCompensationError';
    this.sagaName = sagaName;
    this.failedStep = failedStep;
    this.originalError = originalError;
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SagaCompensationError);
    }
  }
}
