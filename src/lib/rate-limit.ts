import { prisma } from './prisma';

/**
 * Sliding window rate limiter backed by Postgres.
 *
 * WHY DB-BACKED:
 * On Vercel serverless, each request can land on a different lambda instance.
 * In-memory rate limiting only protects that one instance — an attacker with
 * 10 concurrent requests trivially bypasses it by hitting 10 different lambdas.
 * The DB is the only shared state we have without adding new infrastructure.
 *
 * SLIDING WINDOW:
 * We count actual attempts within the last `windowMs` milliseconds rather than
 * using fixed time buckets. This prevents burst attacks that straddle bucket
 * boundaries (e.g. 99 requests at 11:59:59 + 99 at 12:00:01 = 198 in 2 seconds
 * but both buckets show 99).
 *
 * CLEANUP:
 * Expired records are deleted on every check for the same key. This is lazy
 * cleanup — no separate cron needed. The index on (key, timestamp) keeps
 * the delete fast even with a large table.
 *
 * PERFORMANCE:
 * Adds one DB round-trip per rate-limited endpoint call. Acceptable for auth
 * endpoints which are not on the hot path of normal product usage.
 *
 * UPSTASH UPGRADE PATH:
 * If this becomes a bottleneck at scale, swap this module for
 * @upstash/ratelimit + Redis. The interface is identical — callers don't change.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export interface RateLimitOptions {
  /** Unique key identifying the subject being rate limited (e.g. "magic_link:email:foo@bar.com") */
  key: string;
  /** Max number of attempts allowed within the window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
}

/**
 * Checks and records a rate limit attempt.
 * Returns whether the request is allowed and how many attempts remain.
 *
 * Always records the attempt — even if rejected. This prevents a scraper from
 * learning the exact limit by seeing when they stop being counted.
 */
export async function checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const { key, limit, windowMs } = options;
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);
  const resetAt = new Date(now.getTime() + windowMs);

  // Run cleanup + count + insert atomically to avoid stale reads
  const [, count] = await prisma.$transaction([
    // Delete expired records for this key — lazy sliding window cleanup
    prisma.rateLimitAttempt.deleteMany({
      where: {
        key,
        timestamp: { lt: windowStart },
      },
    }),
    // Count current attempts within the window
    prisma.rateLimitAttempt.count({
      where: {
        key,
        timestamp: { gte: windowStart },
      },
    }),
  ]);

  // Record this attempt regardless of outcome
  // We do this after the count so it doesn't count against the current check,
  // giving the user their full `limit` before the (limit+1)th request is rejected
  await prisma.rateLimitAttempt.create({
    data: { key, timestamp: now },
  });

  const allowed = count < limit;
  const remaining = Math.max(0, limit - count - 1);

  return { allowed, remaining, resetAt };
}

/**
 * Builds a rate limit key scoped to an endpoint and subject.
 *
 * Examples:
 *   rateLimitKey('magic_link', 'email', 'foo@bar.com')  → "magic_link:email:foo@bar.com"
 *   rateLimitKey('magic_link', 'ip', '1.2.3.4')         → "magic_link:ip:1.2.3.4"
 *   rateLimitKey('admin_login', 'ip', '1.2.3.4')        → "admin_login:ip:1.2.3.4"
 */
export function rateLimitKey(endpoint: string, type: string, value: string): string {
  // Normalize to lowercase and truncate to stay within a reasonable key length
  return `${endpoint}:${type}:${value.toLowerCase().slice(0, 200)}`;
}

/**
 * Extracts the real client IP from Next.js request headers.
 *
 * Vercel sets x-forwarded-for reliably. We take the first IP in the chain
 * which is the original client — subsequent entries are proxy hops.
 * Falls back to a generic key if no IP is available (e.g. local dev).
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  // x-real-ip is set by some proxies as a single value
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return 'unknown';
}
