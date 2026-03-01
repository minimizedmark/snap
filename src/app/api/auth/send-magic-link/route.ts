import { NextRequest, NextResponse } from 'next/server';
import { createMagicLink } from '@/lib/auth';
import { checkRateLimit, rateLimitKey, getClientIp } from '@/lib/rate-limit';

/**
 * Rate limit configuration for magic link requests.
 *
 * TWO INDEPENDENT LIMITS:
 *
 * 1. Per-email: 5 requests per 15 minutes
 *    Prevents spamming a known address or enumerating valid emails.
 *    Generous enough that a real user who typos their email is not locked out.
 *
 * 2. Per-IP: 10 requests per 15 minutes
 *    Catches tools hammering different addresses from the same origin.
 *    Higher than per-email to avoid penalising shared IPs (office NAT, VPNs).
 *
 * Both limits must pass — failing either rejects the request.
 *
 * RESPONSE STRATEGY: always return 200 {"success":true} when rate limited.
 * Returning 429 would let an attacker enumerate valid emails by observing
 * whether per-email limits trigger. Silent success gives zero signal.
 * Real users see "check your email" either way — no UX impact.
 */
const RATE_LIMITS = {
  perEmail: { limit: 5,  windowMs: 15 * 60 * 1000 },
  perIp:    { limit: 10, windowMs: 15 * 60 * 1000 },
} as const;

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const clientIp = getClientIp(request);

    // Check both limits concurrently — parallel DB round-trips
    const [emailLimit, ipLimit] = await Promise.all([
      checkRateLimit({
        key: rateLimitKey('magic_link', 'email', email),
        ...RATE_LIMITS.perEmail,
      }),
      checkRateLimit({
        key: rateLimitKey('magic_link', 'ip', clientIp),
        ...RATE_LIMITS.perIp,
      }),
    ]);

    if (!emailLimit.allowed || !ipLimit.allowed) {
      console.warn('Rate limit exceeded on magic link:', {
        email,
        ip: clientIp,
        emailAllowed: emailLimit.allowed,
        ipAllowed: ipLimit.allowed,
      });
      // Silent success — attacker gets no useful signal
      return NextResponse.json({ success: true });
    }

    const token = await createMagicLink(email);

    if (!token) {
      return NextResponse.json(
        { error: 'Failed to send magic link' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in send-magic-link route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
