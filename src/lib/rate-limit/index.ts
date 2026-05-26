/**
 * Supabase-based rate limiting — replaces Upstash Redis.
 * Uses the rate_limit_windows table for sliding window checks.
 * Falls open on DB errors (don't block users if rate limit check fails).
 */

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

/**
 * Sliding window rate limiter backed by Supabase.
 * @param key      Unique identifier (e.g. "rl:widget:chat:ip:1.2.3.4")
 * @param limit    Max requests allowed in the window
 * @param windowMs Window duration in milliseconds
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  try {
    const now = Date.now();
    const windowStart = new Date(now - windowMs).toISOString();
    const windowEnd = new Date(now + windowMs).toISOString();

    // Atomic upsert + count via Postgres function
    const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
      p_key: key,
      p_limit: limit,
      p_window_ms: windowMs,
    });

    if (error) {
      console.error('[rate-limit] DB error, failing open:', error.message);
      return { success: true, remaining: 1, reset: now + windowMs };
    }

    return {
      success: data.allowed,
      remaining: Math.max(0, limit - data.count),
      reset: new Date(data.window_end).getTime(),
    };
  } catch (err) {
    console.error('[rate-limit] Unexpected error, failing open:', err);
    return { success: true, remaining: 1, reset: Date.now() + windowMs };
  }
}

// Pre-configured limiters matching the original Redis spec
export const rateLimiters = {
  widgetChatPerIp: (ip: string) =>
    checkRateLimit(`rl:widget:chat:ip:${ip}`, 10, 60_000),

  widgetChatPerToken: (token: string) =>
    checkRateLimit(`rl:widget:chat:token:${token}`, 1000, 60_000),

  widgetConfig: (token: string) =>
    checkRateLimit(`rl:widget:config:${token}`, 60, 60_000),

  authSignin: (ip: string) =>
    checkRateLimit(`rl:auth:signin:${ip}`, 5, 15 * 60_000),

  dashboardRead: (userId: string) =>
    checkRateLimit(`rl:dash:read:${userId}`, 120, 60_000),

  dashboardWrite: (userId: string) =>
    checkRateLimit(`rl:dash:write:${userId}`, 60, 60_000),

  quickStartFetch: (hostId: string) =>
    checkRateLimit(`rl:quickstart:${hostId}`, 5, 60 * 60_000),
};
