import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, Plus, Copy, Settings, BarChart3, MessageSquare } from 'lucide-react';

const STATUS_CONFIG = {
  ready: { label: 'Live', color: 'bg-green-100 text-green-700' },
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-600' },
  building: { label: 'Building', color: 'bg-yellow-100 text-yellow-700' },
  paused: { label: 'Paused', color: 'bg-red-100 text-red-600' },
};

export default async function AgentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: host } = await supabase
    .from('hosts')
    .select('id, plan')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!host) redirect('/onboarding');

  const { data: agents } = await supabase
    .from('agents')
    .select('*')
    .eq('host_id', host.id)
    .order('created_at', { ascending: false });

  const { data: planLimits } = await supabase
    .from('plan_limits')
    .select('max_agents')
    .eq('plan', host.plan)
    .maybeSingle();

  const maxAgents = planLimits?.max_agents ?? 1;
  const agentCount = agents?.length ?? 0;
  const atLimit = agentCount >= maxAgents;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
          <p className="text-gray-500 text-sm mt-1">
            {agentCount} of {maxAgents} agents used
          </p>
        </div>
        {atLimit ? (
          <Link href="/billing">
            <Button variant="outline" className="border-[#1783F1] text-[#1783F1]">
              Upgrade to add more
            </Button>
          </Link>
        ) : (
          <Link href="/agents/new">
            <Button className="bg-[#1783F1] hover:bg-[#1468C8]">
              <Plus className="w-4 h-4 mr-2" />
              New agent
            </Button>
          </Link>
        )}
      </div>

      {!agents || agents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Bot className="w-14 h-14 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No agents yet</h3>
            <p className="text-gray-400 text-sm text-center max-w-sm mb-6">
              Create your first AI discovery agent and get it live on your website in 30 minutes.
            </p>
            <Link href="/agents/new">
              <Button className="bg-[#1783F1] hover:bg-[#1468C8]">
                <Plus className="w-4 h-4 mr-2" />
                Create your first agent
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map((agent) => {
            const status = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.draft;
            return (
              <Card key={agent.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                        <Bot className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{agent.display_name}</CardTitle>
                        <p className="text-xs text-gray-400 mt-0.5">{agent.internal_name}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 flex-1 truncate font-mono text-gray-500">
                      {agent.embed_token.slice(0, 20)}...
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      title="Copy embed token"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/agents/${agent.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full text-xs">
                        <Settings className="w-3.5 h-3.5 mr-1" />
                        Manage
                      </Button>
                    </Link>
                    <Link href={`/conversations?agent=${agent.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full text-xs">
                        <MessageSquare className="w-3.5 h-3.5 mr-1" />
                        Convos
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
