/**
 * Google OAuth token management.
 * Handles refresh, needs_reauth detection, and token encryption (base64 for Phase 1).
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface GoogleTokens {
  access_token: string;
  refresh_token: string | null;
  expires_at: Date;
}

/**
 * Ensure the host has a fresh Google access token.
 * Refreshes automatically if token is expiring within 5 minutes.
 * Sets google_auth_status = 'needs_reauth' on refresh failure.
 */
export async function ensureFreshToken(hostId: string): Promise<string> {
  const { data: host, error } = await supabaseAdmin
    .from('hosts')
    .select(
      'id, google_auth_status, google_oauth_access_token, google_oauth_refresh_token, google_oauth_expires_at, google_account_email'
    )
    .eq('id', hostId)
    .single();

  if (error || !host) {
    throw new Error(`Host not found: ${hostId}`);
  }

  if (host.google_auth_status !== 'connected' && host.google_auth_status !== 'needs_reauth') {
    throw new Error('Google not connected for this host');
  }

  if (!host.google_oauth_access_token) {
    await markNeedsReauth(hostId);
    throw new Error('No access token stored');
  }

  // Decode base64-stored token
  const accessToken = Buffer.from(host.google_oauth_access_token as string, 'base64').toString('utf-8');
  const expiresAt = host.google_oauth_expires_at ? new Date(host.google_oauth_expires_at) : null;

  // If token is still valid (with 5-min buffer), return it
  const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000);
  if (expiresAt && expiresAt > fiveMinFromNow) {
    return accessToken;
  }

  // Token expired — attempt refresh
  if (!host.google_oauth_refresh_token) {
    await markNeedsReauth(hostId);
    throw new Error('No refresh token available — reauth required');
  }

  const refreshToken = Buffer.from(host.google_oauth_refresh_token as string, 'base64').toString('utf-8');

  try {
    const newTokens = await refreshAccessToken(refreshToken);

    // Store new access token
    await supabaseAdmin
      .from('hosts')
      .update({
        google_oauth_access_token: Buffer.from(newTokens.access_token).toString('base64'),
        google_oauth_expires_at: newTokens.expires_at.toISOString(),
        google_auth_status: 'connected',
      })
      .eq('id', hostId);

    return newTokens.access_token;
  } catch (err) {
    console.error('[google/tokens] Refresh failed:', err);
    await markNeedsReauth(hostId);
    throw new Error('Token refresh failed — reauth required');
  }
}

/**
 * Refresh an access token using the refresh token.
 */
async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_at: Date }> {
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Token refresh HTTP ${resp.status}: ${body}`);
  }

  const data = await resp.json();

  if (!data.access_token) {
    throw new Error('No access_token in refresh response');
  }

  return {
    access_token: data.access_token,
    expires_at: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
  };
}

/**
 * Mark a host as needing reauth.
 * Also sends a notification email (fire-and-forget).
 */
async function markNeedsReauth(hostId: string): Promise<void> {
  await supabaseAdmin
    .from('hosts')
    .update({ google_auth_status: 'needs_reauth' })
    .eq('id', hostId);

  // TODO Sprint 4: send needs_reauth email via Resend
  console.warn(`[google/tokens] Host ${hostId} marked needs_reauth`);
}

/**
 * Check if a host needs to reauth Google.
 */
export async function checkNeedsReauth(hostId: string): Promise<boolean> {
  const { data: host } = await supabaseAdmin
    .from('hosts')
    .select('google_auth_status, google_oauth_expires_at')
    .eq('id', hostId)
    .single();

  if (!host) return false;
  if (host.google_auth_status === 'needs_reauth') return true;

  // Pre-emptive check: if expiring within 5 min and no refresh possible
  if (host.google_oauth_expires_at) {
    const expiresAt = new Date(host.google_oauth_expires_at);
    const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000);
    if (expiresAt <= fiveMinFromNow) {
      // Will try to refresh — only needs_reauth if refresh fails
      return false;
    }
  }

  return false;
}
