import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, MessageSquare, TrendingUp, Plus, ArrowRight } from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: host } = await supabase
    .from('hosts')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!host) redirect('/onboarding');

  // Fetch stats
  const { data: agents } = await supabase
    .from('agents')
    .select('id, display_name, status, created_at, updated_at')
    .eq('host_id', host.id)
    .order('created_at', { ascending: false });

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { count: weekConversations } = await supabase
    .from('conversations')
    .select('id', { count: 'exact', head: true })
    .eq('host_id', host.id)
    .gte('started_at', weekAgo);

  const { count: hotLeads } = await supabase
    .from('conversations')
    .select('id', { count: 'exact', head: true })
    .eq('host_id', host.id)
    .gte('started_at', weekAgo)
    .gte('intent_score', 70);

  const { data: recentConversations } = await supabase
    .from('conversations')
    .select(`
      id, intent_score, status, started_at, host_action_status,
      agents!inner(display_name),
      visitors!inner(name, email, company)
    `)
    .eq('host_id', host.id)
    .order('started_at', { ascending: false })
    .limit(10);

  const hasAgents = agents && agents.length > 0;
  const firstName = (user.user_metadata?.full_name as string || user.email || '').split(' ')[0];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back{firstName ? `, ${firstName}` : ''} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">Here&apos;s what&apos;s happening with your agents.</p>
        </div>
        <Link href="/agents/new">
          <Button className="bg-[#1783F1] hover:bg-[#1468C8]">
            <Plus className="w-4 h-4 mr-2" />
            New agent
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Conversations this week</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{weekConversations ?? 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Hot leads this week</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{hotLeads ?? 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Active agents</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {agents?.filter(a => a.status === 'ready').length ?? 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                <Bot className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent conversations */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent conversations</CardTitle>
                <CardDescription>Latest activity across all agents</CardDescription>
              </div>
              <Link href="/conversations">
                <Button variant="ghost" size="sm" className="text-[#1783F1]">
                  View all <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {!recentConversations || recentConversations.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No conversations yet.</p>
                  <p className="text-gray-400 text-xs mt-1">
                    Once your agent is embedded and live, conversations will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentConversations.map((conv: Record<string, unknown>) => {
                    const visitor = conv.visitors as Record<string, unknown>;
                    const agent = conv.agents as Record<string, unknown>;
                    return (
                      <Link
                        key={conv.id as string}
                        href={`/conversations/${conv.id}`}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                            {((visitor?.name as string || visitor?.email as string || 'V')[0]).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {visitor?.name as string || visitor?.email as string || 'Anonymous visitor'}
                            </p>
                            <p className="text-xs text-gray-400">
                              via {agent?.display_name as string} · {new Date(conv.started_at as string).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            (conv.intent_score as number) >= 70 
                              ? 'bg-green-100 text-green-700' 
                              : (conv.intent_score as number) >= 40 
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {conv.intent_score as number}/100
                          </span>
                          {conv.host_action_status === 'new' && (
                            <Badge variant="secondary" className="text-xs">New</Badge>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Agents */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Your agents</CardTitle>
              <CardDescription>
                {hasAgents ? `${agents.length} agent${agents.length !== 1 ? 's' : ''} configured` : 'No agents yet'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!hasAgents ? (
                <div className="text-center py-8">
                  <Bot className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm mb-4">Create your first agent to get started.</p>
                  <Link href="/agents/new">
                    <Button className="w-full bg-[#1783F1] hover:bg-[#1468C8]">
                      <Plus className="w-4 h-4 mr-2" />
                      Create your first agent
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {agents.slice(0, 5).map((agent) => (
                    <Link
                      key={agent.id}
                      href={`/agents/${agent.id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                          <Bot className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{agent.display_name}</p>
                          <p className="text-xs text-gray-400 capitalize">{agent.status}</p>
                        </div>
                      </div>
                      <span className={`w-2 h-2 rounded-full ${
                        agent.status === 'ready' ? 'bg-green-400' :
                        agent.status === 'paused' ? 'bg-gray-300' :
                        'bg-yellow-400'
                      }`} />
                    </Link>
                  ))}
                  <Link href="/agents/new">
                    <Button variant="outline" className="w-full text-sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add another agent
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
