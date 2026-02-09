/**
 * Circuit Breaker Pattern for API Resilience
 * 
 * Prevents cascading failures by temporarily blocking requests to a failing service.
 * States: CLOSED (normal) → OPEN (failing) → HALF_OPEN (testing recovery)
 */

export class CircuitOpenError extends Error {
  constructor(
    message: string,
    public readonly retryAfter: Date
  ) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerOptions {
  name: string;
  threshold: number;  // Number of failures before opening circuit
  timeout: number;    // Milliseconds to wait before attempting recovery
}

interface CircuitStats {
  failures: number;
  lastFailure: Date | null;
  state: string;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount: number = 0;
  private lastFailureTime: Date | null = null;
  private nextAttemptTime: Date | null = null;
  
  private readonly name: string;
  private readonly threshold: number;
  private readonly timeout: number;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.threshold = options.threshold;
    this.timeout = options.timeout;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'OPEN') {
      if (this.nextAttemptTime && new Date() >= this.nextAttemptTime) {
        // Cooldown period has passed, move to HALF_OPEN
        this.transitionTo('HALF_OPEN');
      } else {
        // Still in cooldown, reject immediately
        const retryAfter = this.nextAttemptTime || new Date(Date.now() + this.timeout);
        const secondsUntilRetry = Math.ceil((retryAfter.getTime() - Date.now()) / 1000);
        throw new CircuitOpenError(
          `Circuit breaker [${this.name}] is OPEN. Retry in ${secondsUntilRetry} seconds.`,
          retryAfter
        );
      }
    }

    try {
      // Attempt to execute the function
      const result = await fn();
      
      // Success! Handle based on current state
      this.onSuccess();
      
      return result;
    } catch (error) {
      // Failure! Handle based on current state
      this.onFailure();
      
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      // Recovery successful, close the circuit
      this.transitionTo('CLOSED');
      this.failureCount = 0;
      this.lastFailureTime = null;
      this.nextAttemptTime = null;
    } else if (this.state === 'CLOSED') {
      // Normal operation, reset failure count on success
      this.failureCount = 0;
      this.lastFailureTime = null;
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.state === 'HALF_OPEN') {
      // Failed during recovery test, reopen the circuit
      this.transitionTo('OPEN');
      this.nextAttemptTime = new Date(Date.now() + this.timeout);
    } else if (this.state === 'CLOSED' && this.failureCount >= this.threshold) {
      // Exceeded failure threshold, open the circuit
      this.transitionTo('OPEN');
      this.nextAttemptTime = new Date(Date.now() + this.timeout);
    }
  }

  /**
   * Transition to a new state with logging
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    
    if (oldState !== newState) {
      console.log(
        `[CircuitBreaker:${this.name}] State transition: ${oldState} → ${newState}`,
        {
          failures: this.failureCount,
          lastFailure: this.lastFailureTime?.toISOString(),
          nextAttempt: this.nextAttemptTime?.toISOString(),
        }
      );
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): CircuitStats {
    return {
      failures: this.failureCount,
      lastFailure: this.lastFailureTime,
      state: this.state,
    };
  }

  /**
   * Manually reset the circuit breaker to CLOSED state
   */
  reset(): void {
    console.log(`[CircuitBreaker:${this.name}] Manual reset triggered`);
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
  }
}

// Singleton instance for Twilio API calls
export const twilioBreaker = new CircuitBreaker({
  name: 'twilio',
  threshold: 5,      // Open circuit after 5 consecutive failures
  timeout: 60000,    // Wait 60 seconds before attempting recovery
});
