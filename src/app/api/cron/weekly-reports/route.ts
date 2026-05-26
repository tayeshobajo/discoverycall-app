/**
 * POST /api/cron/weekly-reports
 *
 * Sends weekly summary reports to all active hosts.
 * Runs every Monday at 9am UTC (configured in vercel.json).
 *
 * Idempotent: each host gets at most one weekly summary per 7-day window.
 */

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendWeeklySummaryReport } from '@/lib/email/reports';

export const dynamic = 'force-dynamic';

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // Dev mode
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServiceClient();

  // Get all active hosts (trial active, or converted subscription)
  const { data: hosts } = await supabase
    .from('hosts')
    .select('id, company_name')
    .or('trial_status.eq.active,trial_status.eq.converted');

  const results = {
    total: hosts?.length ?? 0,
    sent: 0,
    errors: [] as string[],
  };

  for (const host of hosts ?? []) {
    try {
      await sendWeeklySummaryReport(host.id);
      results.sent++;
    } catch (err) {
      results.errors.push(`${host.id}: ${String(err)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    results,
  });
}
