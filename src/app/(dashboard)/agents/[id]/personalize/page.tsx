import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Palette } from 'lucide-react';

export default async function PersonalizePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: host } = await supabase.from('hosts').select('id').eq('user_id', user.id).maybeSingle();
  if (!host) redirect('/onboarding');

  const { data: agent } = await supabase.from('agents').select('*').eq('id', id).eq('host_id', host.id).maybeSingle();
  if (!agent) notFound();

  const { data: config } = await supabase.from('agent_config').select('*').eq('agent_id', id).maybeSingle();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Personalize</h1>
        <p className="text-gray-500 text-sm mt-1">Customize how {agent.display_name} looks and sounds.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Palette className="w-5 h-5 text-pink-600" />
            <CardTitle className="text-base">Personalization UI</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <p className="text-gray-400 text-sm mb-4">
            Full personalization interface (theme, logo, greeting, tone, button position) coming in Sprint 4.
          </p>
          <div className="grid grid-cols-2 gap-4 text-left max-w-sm mx-auto">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-600">Theme color</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: config?.theme_color ?? '#1783F1' }} />
                <code className="text-xs text-gray-500">{config?.theme_color ?? '#1783F1'}</code>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-600">Tone</p>
              <p className="text-xs text-gray-500 mt-1 capitalize">{config?.tone_preset ?? 'warm'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-600">Greeting</p>
              <p className="text-xs text-gray-500 mt-1">{config?.greeting_title ?? "Let's have coffee"}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-600">Position</p>
              <p className="text-xs text-gray-500 mt-1">{config?.button_position ?? 'bottom-right'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
