import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const isSignup = searchParams.get('signup') === '1';
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // If Google OAuth signup, create host record if it doesn't exist
      if (isSignup || data.user.app_metadata?.provider === 'google') {
        const { data: existingHost } = await supabase
          .from('hosts')
          .select('id')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (!existingHost) {
          const companyName =
            data.user.user_metadata?.company_name ||
            data.user.user_metadata?.full_name ||
            data.user.email?.split('@')[0] ||
            'My Company';

          await supabase.from('hosts').insert({
            user_id: data.user.id,
            company_name: companyName,
          });

          return NextResponse.redirect(`${origin}/onboarding`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
