import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRedis } from '@/lib/redis';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { data: host } = await supabase
    .from('hosts')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!host) {
    return NextResponse.redirect(new URL('/onboarding', request.url));
  }

  // Generate and store state token
  const state = crypto.randomUUID();
  const redis = getRedis();
  await redis.set(`google_oauth_state:${state}`, host.id, { ex: 600 }); // 10-min TTL

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/documents',
      'email',
      'profile',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params}`);
}
