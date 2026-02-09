/**
 * Error monitoring and observability using Sentry
 * Falls back to no-ops if SENTRY_DSN is not configured
 */

import * as Sentry from '@sentry/nextjs';
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';

// Check if Sentry is enabled
const SENTRY_ENABLED = !!process.env.SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'development';
const RELEASE = process.env.NEXT_PUBLIC_APP_VERSION || process.env.npm_package_version || 'unknown';

// Initialize Sentry if DSN is provided
if (SENTRY_ENABLED) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: ENVIRONMENT,
    release: RELEASE,
    
    // Adjust traces sample rate based on environment
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
    
    // Filter out sensitive data
    beforeSend(event, hint) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      return event;
    },
  });
}

/**
 * Capture an error with optional context
 */
export function captureError(error: Error, context?: Record<string, any>): void {
  if (!SENTRY_ENABLED) {
    console.error('[Monitoring] Error captured:', error, context);
    return;
  }

  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
    }
    Sentry.captureException(error);
  });
}

/**
 * Capture a message with severity level
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info'
): void {
  if (!SENTRY_ENABLED) {
    console.log(`[Monitoring] ${level.toUpperCase()}: ${message}`);
    return;
  }

  Sentry.captureMessage(message, level);
}

/**
 * Set user context for error tracking
 */
export function setUserContext(userId: string, email?: string): void {
  if (!SENTRY_ENABLED) {
    return;
  }

  Sentry.setUser({
    id: userId,
    email,
  });
}

/**
 * Clear user context (e.g., on logout)
 */
export function clearUserContext(): void {
  if (!SENTRY_ENABLED) {
    return;
  }

  Sentry.setUser(null);
}

/**
 * Start a performance transaction
 * Returns a transaction object or a no-op object if Sentry is disabled
 */
// Sentry Next.js does not support manual transactions in the same way as Sentry SDKs for Node/Browser.
// We'll provide a no-op transaction for API compatibility.
export function startTransaction(name: string, op: string): NoOpTransaction {
  return new NoOpTransaction();
}

/**
 * No-op transaction for when Sentry is disabled
 */
class NoOpTransaction {
  setStatus(_status: string): void {}
  setHttpStatus(_httpStatus: number): void {}
  setData(_key: string, _value: any): void {}
  setTag(_key: string, _value: string): void {}
  finish(): void {}
}

/**
 * Wrapper for API routes to automatically capture errors and track performance
 */
export function withMonitoring(handler: NextApiHandler): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const transaction = startTransaction(
      `${req.method} ${req.url}`,
      'http.server'
    );

    try {
      // Set transaction metadata
      if ('setHttpStatus' in transaction) {
        transaction.setTag?.('http.method', req.method || 'UNKNOWN');
        transaction.setTag?.('http.url', req.url || 'unknown');
      }

      await handler(req, res);

      // Set response status
      if ('setHttpStatus' in transaction) {
        transaction.setHttpStatus?.(res.statusCode);
      }
    } catch (error) {
      // Capture the error with request context
      captureError(error as Error, {
        url: req.url,
        method: req.method,
        query: req.query,
        headers: {
          'user-agent': req.headers['user-agent'],
          'content-type': req.headers['content-type'],
        },
      });

      // Mark transaction as failed
      if ('setStatus' in transaction) {
        transaction.setStatus?.('internal_error');
      }

      throw error;
    } finally {
      transaction.finish();
    }
  };
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info',
  data?: Record<string, any>
): void {
  if (!SENTRY_ENABLED) {
    return;
  }

  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Set custom tag for filtering in Sentry
 */
export function setTag(key: string, value: string): void {
  if (!SENTRY_ENABLED) {
    return;
  }

  Sentry.setTag(key, value);
}

/**
 * Set custom context data
 */
export function setContext(name: string, context: Record<string, any>): void {
  if (!SENTRY_ENABLED) {
    return;
  }

  Sentry.setContext(name, context);
}

// Export Sentry instance for advanced usage
export { Sentry };
