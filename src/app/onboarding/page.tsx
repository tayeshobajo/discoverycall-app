import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: host } = await supabase
    .from('hosts')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!host) redirect('/login');

  // If already completed onboarding, go to dashboard
  if (host.onboarding_step === 'complete' || host.onboarding_step === 'skipped') {
    redirect('/dashboard');
  }

  return <OnboardingFlow host={host} />;
}
