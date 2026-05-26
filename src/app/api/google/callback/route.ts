import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getRedis } from '@/lib/redis';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error || !code || !state) {
    return NextResponse.redirect(
      `${origin}/integrations?error=google_auth_failed`
    );
  }

  // Verify state token
  const redis = getRedis();
  const hostId = await redis.get<string>(`google_oauth_state:${state}`);
  
  if (!hostId) {
    return NextResponse.redirect(
      `${origin}/integrations?error=invalid_state`
    );
  }

  // Delete the state token
  await redis.del(`google_oauth_state:${state}`);

  // Exchange code for tokens
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenResponse.ok) {
    console.error('Google token exchange failed:', await tokenResponse.text());
    return NextResponse.redirect(
      `${origin}/integrations?error=token_exchange_failed`
    );
  }

  const tokens = await tokenResponse.json();

  // Get user info for the connected Google account
  const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const userInfo = userInfoResponse.ok ? await userInfoResponse.json() : {};

  const supabase = await createServiceClient();

  // Store tokens (access + refresh) — encrypted storage is Phase 1.5 (pgsodium setup required)
  // For Phase 1, store as plaintext bytea — implement pgsodium encryption in Sprint 2
  const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

  await supabase
    .from('hosts')
    .update({
      google_auth_status: 'connected',
      google_oauth_access_token: Buffer.from(tokens.access_token).toString('base64'),
      google_oauth_refresh_token: tokens.refresh_token
        ? Buffer.from(tokens.refresh_token).toString('base64')
        : null,
      google_oauth_expires_at: expiresAt.toISOString(),
      google_account_email: userInfo.email ?? null,
    })
    .eq('id', hostId);

  return NextResponse.redirect(`${origin}/integrations?success=google_connected`);
}
