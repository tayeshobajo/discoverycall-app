/**
 * Visitor identity — fingerprinting and visitor management.
 *
 * Visitor ID: SHA-256 of IP + User-Agent, first 16 bytes as hex (32 hex chars).
 * Host-scoped: same fingerprint across different agents on same host = same visitor.
 */

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Generate a visitor fingerprint from IP + User-Agent.
 * SHA-256, first 16 bytes → 32 hex chars.
 */
export function generateFingerprint(ip: string, userAgent: string): string {
  const raw = `${ip}|${userAgent}`;
  const hash = createHash('sha256').update(raw).digest('hex');
  return hash.slice(0, 32); // first 16 bytes = 32 hex chars
}

/**
 * Extract the real IP from a request.
 * Handles Cloudflare / Vercel proxy headers.
 */
export function getClientIP(req: Request): string {
  const cfConnectingIp = (req as Request & { headers: Headers }).headers.get('cf-connecting-ip');
  const xForwardedFor = (req as Request & { headers: Headers }).headers.get('x-forwarded-for');
  const xRealIp = (req as Request & { headers: Headers }).headers.get('x-real-ip');

  if (cfConnectingIp) return cfConnectingIp.trim();
  if (xForwardedFor) return xForwardedFor.split(',')[0].trim();
  if (xRealIp) return xRealIp.trim();
  return '0.0.0.0';
}

/**
 * Get or create a visitor for this host + fingerprint.
 * Upserts on conflict (host_id, fingerprint).
 */
export async function getOrCreateVisitor(
  hostId: string,
  fingerprint: string
): Promise<Database['public']['Tables']['visitors']['Row']> {
  // First try to find existing
  const { data: existing } = await supabase
    .from('visitors')
    .select('*')
    .eq('host_id', hostId)
    .eq('fingerprint', fingerprint)
    .maybeSingle();

  if (existing) return existing;

  // Create new visitor
  const { data: created, error } = await supabase
    .from('visitors')
    .insert({
      host_id: hostId,
      fingerprint,
      current_intent_score: 0,
      custom_fields: {},
    })
    .select('*')
    .single();

  if (error) {
    // Race condition: another request may have created it. Try to fetch again.
    const { data: race } = await supabase
      .from('visitors')
      .select('*')
      .eq('host_id', hostId)
      .eq('fingerprint', fingerprint)
      .maybeSingle();

    if (race) return race;
    throw new Error(`Failed to create visitor: ${error.message}`);
  }

  return created;
}

/**
 * Merge profile updates into the visitor.
 * Never overwrite a non-null field with null.
 * Always overwrite enum signals (budget, urgency, decision_authority) with latest.
 */
export function mergeProfileUpdates(
  current: Database['public']['Tables']['visitors']['Row'],
  updates: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    role?: string | null;
    problem?: string | null;
    budget_signal?: string | null;
    urgency_signal?: string | null;
    decision_authority?: string | null;
  }
): Partial<Database['public']['Tables']['visitors']['Row']> {
  const merged: Partial<Database['public']['Tables']['visitors']['Row']> = {};

  // Non-null-safe fields: only update if incoming value is non-null
  const textFields = ['name', 'email', 'phone', 'company', 'role'] as const;
  for (const field of textFields) {
    if (updates[field] !== null && updates[field] !== undefined) {
      if (!current[field]) {
        // Only set if not already known
        (merged as Record<string, unknown>)[field] = updates[field];
      }
    }
  }

  // Problem: append if changed, preserve existing
  if (updates.problem && updates.problem !== current.problem) {
    merged.problem = current.problem
      ? `${current.problem} | ${updates.problem}`
      : updates.problem;
  }

  // Enum signals: always overwrite with latest non-null value
  if (updates.budget_signal !== null && updates.budget_signal !== undefined) {
    (merged as Record<string, unknown>).budget_signal = updates.budget_signal;
  }
  if (updates.urgency_signal !== null && updates.urgency_signal !== undefined) {
    (merged as Record<string, unknown>).urgency_signal = updates.urgency_signal;
  }
  if (updates.decision_authority !== null && updates.decision_authority !== undefined) {
    (merged as Record<string, unknown>).decision_authority = updates.decision_authority;
  }

  return merged;
}

/**
 * Apply merged profile updates to the visitor in the database.
 */
export async function updateVisitorProfile(
  visitorId: string,
  updates: Partial<Database['public']['Tables']['visitors']['Row']>
): Promise<void> {
  if (Object.keys(updates).length === 0) return;

  const { error } = await supabase
    .from('visitors')
    .update(updates)
    .eq('id', visitorId);

  if (error) {
    console.error('[visitor] Failed to update profile:', error.message);
  }
}
