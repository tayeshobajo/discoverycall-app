/**
 * POST /api/cron/complete-conversations
 *
 * Marks conversations idle for 30+ minutes as completed.
 * Fires the 'completed' report for each.
 *
 * Runs every 10 minutes via Vercel Cron.
 */

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendReport } from '@/lib/email/reports';

export const dynamic = 'force-dynamic';

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServiceClient();
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  // Find conversations that have been idle for 30+ minutes
  const { data: staleConversations } = await supabase
    .from('conversations')
    .select('id, host_id, message_count, started_at, last_message_at')
    .in('status', ['active', 'idle'])
    .lt('last_message_at', thirtyMinutesAgo);

  const results = {
    processed: staleConversations?.length ?? 0,
    completed: 0,
    errors: [] as string[],
  };

  for (const conv of staleConversations ?? []) {
    try {
      // Mark as completed
      await supabase
        .from('conversations')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
        })
        .eq('id', conv.id);

      // Send completed report (idempotent — won't double-send)
      await sendReport(conv.id, 'completed');
      results.completed++;
    } catch (err) {
      results.errors.push(`${conv.id}: ${String(err)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    results,
  });
}
