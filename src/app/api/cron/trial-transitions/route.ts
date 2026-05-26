/**
 * Trial State Machine Cron
 * 
 * Runs hourly via Vercel Cron (configured in vercel.json)
 * Manages trial expiry, grace period, agent pausing, and account deletion.
 * 
 * Timeline:
 * Day 0:    Trial starts (trial_status = 'active')
 * Day 14:   Trial expires (trial_status = 'expired')
 * Day 15-21: Grace period — agent stays live, banner shows
 * Day 22-30: Agent paused — widget shows "unavailable"
 * Day 31-90: Account suspended — dashboard locked
 * Day 91+:  Account deleted
 */

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Verify this is coming from Vercel Cron or our own secret
function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) return true; // Dev mode: allow all
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServiceClient();
  const now = new Date();
  
  const results = {
    expired: 0,
    agentsPaused: 0,
    accountsSuspended: 0,
    accountsDeleted: 0,
    errors: [] as string[],
  };

  try {
    // 1. Expire active trials that have passed their end date
    const { data: expiredTrials, error: expireError } = await supabase
      .from('hosts')
      .update({ trial_status: 'expired' })
      .eq('trial_status', 'active')
      .lt('trial_ends_at', now.toISOString())
      .is('stripe_subscription_id', null) // Only expire if no paid subscription
      .select('id, company_name, trial_ends_at');

    if (expireError) {
      results.errors.push(`Expire error: ${expireError.message}`);
    } else {
      results.expired = expiredTrials?.length ?? 0;

      // Log expiry events
      for (const host of expiredTrials ?? []) {
        await supabase.from('events').insert({
          host_id: host.id,
          event_type: 'trial_expired',
          event_data: { trial_ends_at: host.trial_ends_at },
        });
        // TODO: Send trial expired email (Sprint 4 — Resend)
      }
    }

    // 2. Pause agents for hosts in grace period that ended (Day 22+)
    const day22Ago = new Date(now.getTime() - (22 * 24 * 60 * 60 * 1000));
    
    const { data: hostsToSuspend } = await supabase
      .from('hosts')
      .select('id, company_name, trial_ends_at')
      .eq('trial_status', 'expired')
      .is('stripe_subscription_id', null)
      .lt('trial_ends_at', day22Ago.toISOString());

    for (const host of hostsToSuspend ?? []) {
      // Check if agents already paused
      const { data: activeAgents } = await supabase
        .from('agents')
        .select('id')
        .eq('host_id', host.id)
        .neq('status', 'paused')
        .neq('status', 'draft');

      if (activeAgents && activeAgents.length > 0) {
        const { error: pauseError } = await supabase
          .from('agents')
          .update({ status: 'paused' })
          .eq('host_id', host.id)
          .neq('status', 'draft');

        if (!pauseError) {
          results.agentsPaused += activeAgents.length;

          await supabase.from('events').insert({
            host_id: host.id,
            event_type: 'agents_paused_trial_expired',
            event_data: { agents_paused: activeAgents.map(a => a.id) },
          });
          // TODO: Send "Your agent has been paused" email (Sprint 4)
        }
      }
    }

    // 3. Delete accounts that have been expired for 91+ days
    const day91Ago = new Date(now.getTime() - (91 * 24 * 60 * 60 * 1000));
    
    const { data: hostsToDelete } = await supabase
      .from('hosts')
      .select('id, company_name')
      .eq('trial_status', 'expired')
      .is('stripe_subscription_id', null)
      .lt('trial_ends_at', day91Ago.toISOString());

    for (const host of hostsToDelete ?? []) {
      // Log before deletion
      await supabase.from('events').insert({
        host_id: host.id,
        event_type: 'account_deleted_trial_expired',
        event_data: { deleted_at: now.toISOString() },
      });

      // Delete the host (cascades to all associated data via FK)
      const { error: deleteError } = await supabase
        .from('hosts')
        .delete()
        .eq('id', host.id);

      if (!deleteError) {
        results.accountsDeleted++;
        // TODO: Send "Your account has been closed" email (Sprint 4)
      } else {
        results.errors.push(`Delete error for ${host.id}: ${deleteError.message}`);
      }
    }

    // 4. Reset Starter conversation counters for hosts whose billing period rolled over
    // This is handled by Redis TTL expiry (keys auto-expire at period end)
    // No explicit action needed here — the counter simply misses on next request
    // and gets rewarmed from the DB. Belt-and-suspenders: documented in spec.

  } catch (err) {
    results.errors.push(`Unexpected error: ${String(err)}`);
  }

  return NextResponse.json({
    ok: true,
    timestamp: now.toISOString(),
    results,
  });
}
