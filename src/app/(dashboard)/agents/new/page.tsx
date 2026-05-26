'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bot, Wand2 } from 'lucide-react';

export default function NewAgentPage() {
  const [internalName, setInternalName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Get host
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not authenticated'); setLoading(false); return; }

    const { data: host } = await supabase
      .from('hosts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!host) { setError('Host not found'); setLoading(false); return; }

    // Create agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .insert({
        host_id: host.id,
        internal_name: internalName,
        display_name: displayName || 'DiscoveryCall',
        status: 'draft',
        completed_sections: [],
      })
      .select()
      .single();

    if (agentError) {
      setError(agentError.message);
      setLoading(false);
      return;
    }

    // Create default agent config
    await supabase.from('agent_config').insert({
      agent_id: agent.id,
    });

    router.push(`/agents/${agent.id}/playbook`);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create new agent</h1>
        <p className="text-gray-500 text-sm mt-1">Give your agent a name to get started.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Bot className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Agent details</CardTitle>
              <CardDescription>You can change these anytime.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-3 py-2 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="internalName">Internal name</Label>
              <Input
                id="internalName"
                placeholder="e.g. Main website agent"
                value={internalName}
                onChange={(e) => setInternalName(e.target.value)}
                required
              />
              <p className="text-xs text-gray-400">Only visible to you in the dashboard.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Agent display name</Label>
              <Input
                id="displayName"
                placeholder="DiscoveryCall"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <p className="text-xs text-gray-400">Visible to visitors in the chat widget.</p>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#1783F1] hover:bg-[#1468C8]"
              disabled={loading || !internalName}
            >
              <Wand2 className="w-4 h-4 mr-2" />
              {loading ? 'Creating...' : 'Create agent & build playbook →'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
