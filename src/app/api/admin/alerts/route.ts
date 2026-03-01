import { NextRequest, NextResponse } from 'next/server';
import { checkSystemAlerts } from '@/lib/alerts';
import { isAdminAuthenticated } from '@/lib/admin-auth';

/**
 * Get current system alerts
 * GET /api/admin/alerts
 */
export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const alerts = await checkSystemAlerts();
    
    return NextResponse.json({
      alerts,
      count: alerts.length,
      critical: alerts.filter(a => a.level === 'critical').length,
      warning: alerts.filter(a => a.level === 'warning').length,
      info: alerts.filter(a => a.level === 'info').length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}
