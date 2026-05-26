import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import EmbedCodePage from '@/components/embed/EmbedCodePage';

export default async function EmbedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: host } = await supabase
    .from('hosts')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!host) redirect('/onboarding');

  const { data: agent } = await supabase
    .from('agents')
    .select('id, embed_token, display_name, status')
    .eq('id', id)
    .eq('host_id', host.id)
    .maybeSingle();

  if (!agent) notFound();

  return <EmbedCodePage agent={agent} />;
}
