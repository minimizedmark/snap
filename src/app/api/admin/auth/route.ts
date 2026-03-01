import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { checkRateLimit, rateLimitKey, getClientIp } from '@/lib/rate-limit';

/**
 * Admin authentication endpoint
 * POST /api/admin/auth
 *
 * Rate limited aggressively — this endpoint is the keys to the kingdom.
 * 5 attempts per 15 minutes per IP. On the 6th attempt the request is
 * rejected with 429 (unlike magic link, we DO reveal the rate limit here
 * because admin login is not email-enumeration sensitive — there is only
 * one admin and they know they exist).
 */
const ADMIN_RATE_LIMIT = { limit: 5, windowMs: 15 * 60 * 1000 } as const;

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);

    const ipLimit = await checkRateLimit({
      key: rateLimitKey('admin_login', 'ip', clientIp),
      ...ADMIN_RATE_LIMIT,
    });

    if (!ipLimit.allowed) {
      console.warn('Admin login rate limit exceeded:', { ip: clientIp });
      return NextResponse.json(
        { error: 'Too many attempts. Try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(ADMIN_RATE_LIMIT.windowMs / 1000)),
          },
        }
      );
    }

    const { password } = await req.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Password required' },
        { status: 400 }
      );
    }

    const hash = createHash('sha256').update(password).digest('hex');
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!adminPasswordHash) {
      console.error('ADMIN_PASSWORD_HASH not set in environment');
      return NextResponse.json(
        { error: 'Admin authentication not configured' },
        { status: 500 }
      );
    }

    if (hash !== adminPasswordHash) {
      console.warn('Failed admin login attempt from IP:', clientIp);
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Set secure httpOnly cookie containing the hash
    const response = NextResponse.json({ success: true });

    response.cookies.set('admin_auth', hash, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/admin',
    });

    return response;
  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

/**
 * Logout endpoint
 * DELETE /api/admin/auth
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('admin_auth');
  return response;
}
