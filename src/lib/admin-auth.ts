import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple admin authentication
 * In production, use a proper auth system
 */
export function isAdminAuthenticated(req: NextRequest): boolean {
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminPasswordHash) {
    console.error('⚠️ ADMIN_PASSWORD_HASH not set in environment');
    return false;
  }

  // Check cookie
  const adminToken = req.cookies.get('admin_auth')?.value;
  if (adminToken === adminPasswordHash) {
    return true;
  }

  return false;
}

/**
 * Middleware to protect admin routes
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
