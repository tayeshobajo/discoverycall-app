/**
 * Starter plan conversation counter — backed by Supabase.
 * Replaces the Redis INCR/TTL pattern.
 * Queries the conversations table directly — no separate counter needed.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Get the current month conversation count for a host.
 * Only called for Starter hosts (Pro/Agency/Enterprise skip this).
 */
export async function getMonthConversations(
  hostId: string,
  periodStart: Date
): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('host_id', hostId)
    .gte('created_at', periodStart.toISOString());

  if (error) {
    console.error('[counter] Failed to count conversations:', error.message);
    return 0; // Fail open — don't block conversation on count error
  }

  return count ?? 0;
}

/**
 * Check if a Starter host is at or over their monthly cap.
 * Returns { allowed, count, approaching } where approaching = count >= 160 (80%).
 */
export async function checkConversationCap(
  hostId: string,
  periodStart: Date,
  cap: number = 200
): Promise<{ allowed: boolean; count: number; approaching: boolean }> {
  const count = await getMonthConversations(hostId, periodStart);
  return {
    allowed: count < cap,
    count,
    approaching: count >= Math.floor(cap * 0.8) && count < cap,
  };
}
