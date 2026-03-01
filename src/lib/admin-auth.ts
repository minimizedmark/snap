import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

/**
 * Admin authentication utilities.
 *
 * Auth flow:
 *   1. POST /api/admin/auth with {password}
 *   2. Server hashes it and compares against ADMIN_PASSWORD_HASH env var
 *   3. On match: sets httpOnly cookie containing the hash
 *   4. Subsequent requests validated here by re-comparing cookie to ADMIN_PASSWORD_HASH
 *
 * The cookie stores the HASH, never the plaintext password.
 * Old approach stored plaintext in cookie — that's gone.
 */
export function isAdminAuthenticated(req: NextRequest): boolean {
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminPasswordHash) {
    console.error('⚠️ ADMIN_PASSWORD_HASH not set in environment');
    return false;
  }

  // Check hash cookie set by /api/admin/auth
  const adminAuth = req.cookies.get('admin_auth')?.value;
  if (adminAuth && adminAuth === adminPasswordHash) {
    return true;
  }

  // Check Authorization header (Bearer <plaintext password> — hashed here for comparison)
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const providedPassword = authHeader.slice(7);
    const providedHash = createHash('sha256').update(providedPassword).digest('hex');
    if (providedHash === adminPasswordHash) {
      return true;
    }
  }

  return false;
}

/**
 * Middleware to protect admin API routes
 */
export function requireAdmin(handler: (req: NextRequest) => Promise<Response>) {
  return async (req: NextRequest) => {
    if (!isAdminAuthenticated(req)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return handler(req);
  };
}

