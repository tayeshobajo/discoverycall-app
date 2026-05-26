import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, TrendingUp, Filter } from 'lucide-react';

type SearchParams = {
  agent?: string;
  status?: string;
  intent?: string;
};

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const filters = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: host } = await supabase
    .from('hosts')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!host) redirect('/onboarding');

  // Fetch agents for filter dropdown
  const { data: agents } = await supabase
    .from('agents')
    .select('id, display_name')
    .eq('host_id', host.id)
    .order('created_at', { ascending: true });

  // Build conversation query
  let query = supabase
    .from('conversations')
    .select(
      `
      id, intent_score, status, started_at, last_message_at, message_count, host_action_status,
      agents!inner(id, display_name),
      visitors!inner(name, email, company, current_intent_score)
    `
    )
    .eq('host_id', host.id)
    .order('last_message_at', { ascending: false })
    .limit(100);

  // Apply filters
  if (filters.agent) {
    query = query.eq('agent_id', filters.agent);
  }
  if (filters.status && filters.status !== 'all') {
    query = query.eq('host_action_status', filters.status);
  }
  if (filters.intent === 'hot') {
    query = query.gte('intent_score', 70);
  } else if (filters.intent === 'warm') {
    query = query.gte('intent_score', 40).lt('intent_score', 70);
  } else if (filters.intent === 'cold') {
    query = query.lt('intent_score', 40);
  }

  const { data: conversations, count } = await query;

  const statusLabels: Record<string, string> = {
    new: 'New',
    contacted: 'Contacted',
    booked: 'Booked',
    dismissed: 'Dismissed',
  };

  const statusColors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-700',
    contacted: 'bg-purple-100 text-purple-700',
    booked: 'bg-green-100 text-green-700',
    dismissed: 'bg-gray-100 text-gray-500',
  };

  const buildFilterUrl = (params: Record<string, string>) => {
    const merged = { ...filters, ...params };
    const cleaned = Object.fromEntries(
      Object.entries(merged).filter(([, v]) => v && v !== 'all')
    );
    const qs = new URLSearchParams(cleaned).toString();
    return `/conversations${qs ? `?${qs}` : ''}`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conversations</h1>
          <p className="text-gray-500 text-sm mt-1">
            {conversations?.length ?? 0} conversations
            {filters.agent || filters.status || filters.intent ? ' (filtered)' : ''}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Filter className="w-3.5 h-3.5" />
          <span className="font-medium">Filter:</span>
        </div>

        {/* Agent filter */}
        {agents && agents.length > 1 && (
          <div className="flex gap-1">
            <Link
              href={buildFilterUrl({ agent: '' })}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                !filters.agent
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All agents
            </Link>
            {agents.map((a) => (
              <Link
                key={a.id}
                href={buildFilterUrl({ agent: a.id })}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filters.agent === a.id
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {a.display_name}
              </Link>
            ))}
          </div>
        )}

        {/* Status filter */}
        <div className="flex gap-1">
          {['all', 'new', 'contacted', 'booked', 'dismissed'].map((s) => (
            <Link
              key={s}
              href={buildFilterUrl({ status: s })}
              className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                (s === 'all' && !filters.status) || filters.status === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'all' ? 'All status' : statusLabels[s] || s}
            </Link>
          ))}
        </div>

        {/* Intent filter */}
        <div className="flex gap-1">
          {[
            { value: '', label: 'Any intent' },
            { value: 'hot', label: '🟢 Hot (70+)' },
            { value: 'warm', label: '🟡 Warm (40-69)' },
            { value: 'cold', label: '⚪ Cold (<40)' },
          ].map((opt) => (
            <Link
              key={opt.value}
              href={buildFilterUrl({ intent: opt.value })}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filters.intent === opt.value || (!filters.intent && !opt.value)
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      {!conversations || conversations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MessageSquare className="w-14 h-14 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {filters.agent || filters.status || filters.intent
                ? 'No conversations match these filters'
                : 'No conversations yet'}
            </h3>
            <p className="text-gray-400 text-sm text-center max-w-sm">
              {filters.agent || filters.status || filters.intent
                ? 'Try adjusting the filters above.'
                : 'Once your agent is embedded on your website, visitor conversations will appear here in real time.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv: Record<string, unknown>) => {
            const visitor = conv.visitors as Record<string, unknown>;
            const agent = conv.agents as Record<string, unknown>;
            const intentScore = conv.intent_score as number;
            const actionStatus = conv.host_action_status as string;

            return (
              <Link key={conv.id as string} href={`/conversations/${conv.id}`}>
                <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                        {(
                          (visitor?.name as string ||
                            visitor?.email as string ||
                            'V')[0]
                        ).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900">
                            {(visitor?.name as string) ||
                              (visitor?.email as string) ||
                              'Anonymous visitor'}
                          </p>
                          {actionStatus && actionStatus !== 'new' && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                statusColors[actionStatus] || 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {statusLabels[actionStatus] || actionStatus}
                            </span>
                          )}
                          {actionStatus === 'new' && (
                            <Badge variant="secondary" className="text-xs">
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {(visitor?.company as string) &&
                            `${visitor.company} · `}
                          via {agent?.display_name as string} ·{' '}
                          {conv.message_count as number} messages
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <p className="text-xs text-gray-400">
                          {new Date(conv.last_message_at as string).toLocaleDateString(
                            'en-US',
                            {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )}
                        </p>
                      </div>
                      <div
                        className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                          intentScore >= 70
                            ? 'bg-green-100 text-green-700'
                            : intentScore >= 40
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {intentScore >= 70 && <TrendingUp className="w-3 h-3" />}
                        {intentScore}/100
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
