import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageSquare, TrendingUp, Clock } from 'lucide-react';

export default async function VisitorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  // Fetch visitor
  const { data: visitor } = await supabase
    .from('visitors')
    .select('*')
    .eq('id', id)
    .eq('host_id', host.id)
    .maybeSingle();

  if (!visitor) notFound();

  // Fetch all conversations for this visitor
  const { data: conversations } = await supabase
    .from('conversations')
    .select(`
      id, intent_score, status, host_action_status, message_count,
      started_at, last_message_at, source_page_url,
      agents!inner(display_name)
    `)
    .eq('visitor_id', id)
    .eq('host_id', host.id)
    .order('started_at', { ascending: false });

  const signalBadgeClass: Record<string, string> = {
    high: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-red-100 text-red-700',
    unknown: 'bg-gray-100 text-gray-500',
    decision_maker: 'bg-blue-100 text-blue-700',
    influencer: 'bg-purple-100 text-purple-700',
    researcher: 'bg-gray-100 text-gray-600',
  };

  const statusLabels: Record<string, string> = {
    new: 'New',
    contacted: 'Contacted',
    booked: 'Booked',
    dismissed: 'Dismissed',
  };

  const displayName = visitor.name || visitor.email || `Visitor ${visitor.fingerprint.slice(0, 8)}`;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/visitors">
          <Button variant="ghost" size="sm" className="text-gray-500">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Visitors
          </Button>
        </Link>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-lg font-bold text-gray-600">
            {displayName[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
            <p className="text-sm text-gray-400">
              First seen {new Date(visitor.first_seen_at).toLocaleDateString()} ·{' '}
              {conversations?.length ?? 0} conversation{conversations?.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div
          className={`text-sm font-semibold px-3 py-1 rounded-full ${
            visitor.current_intent_score >= 70
              ? 'bg-green-100 text-green-700'
              : visitor.current_intent_score >= 40
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          Intent {visitor.current_intent_score}/100
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {visitor.name && (
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-0.5">Name</p>
                  <p className="text-sm text-gray-900">{visitor.name}</p>
                </div>
              )}
              {visitor.email && (
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-0.5">Email</p>
                  <a
                    href={`mailto:${visitor.email}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {visitor.email}
                  </a>
                </div>
              )}
              {visitor.phone && (
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-0.5">Phone</p>
                  <p className="text-sm text-gray-900">{visitor.phone}</p>
                </div>
              )}
              {visitor.company && (
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-0.5">Company</p>
                  <p className="text-sm text-gray-900">{visitor.company}</p>
                </div>
              )}
              {visitor.role && (
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-0.5">Role</p>
                  <p className="text-sm text-gray-900">{visitor.role}</p>
                </div>
              )}
              {visitor.problem && (
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-0.5">Problem</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{visitor.problem}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Signals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Budget</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    signalBadgeClass[visitor.budget_signal ?? 'unknown'] || 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {visitor.budget_signal || 'Unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Urgency</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    signalBadgeClass[visitor.urgency_signal ?? 'unknown'] || 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {visitor.urgency_signal || 'Unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Authority</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    signalBadgeClass[visitor.decision_authority ?? 'unknown'] || 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {visitor.decision_authority || 'Unknown'}
                </span>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Intent score</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      visitor.current_intent_score >= 70
                        ? 'bg-green-100 text-green-700'
                        : visitor.current_intent_score >= 40
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {visitor.current_intent_score}/100
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conversation timeline */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conversation history</CardTitle>
            </CardHeader>
            <CardContent>
              {!conversations || conversations.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No conversations yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conversations.map((conv: Record<string, unknown>) => {
                    const agent = conv.agents as Record<string, unknown>;
                    const durationMinutes = Math.round(
                      (new Date(conv.last_message_at as string).getTime() -
                        new Date(conv.started_at as string).getTime()) /
                        60000
                    );
                    return (
                      <Link
                        key={conv.id as string}
                        href={`/conversations/${conv.id as string}`}
                        className="block p-4 rounded-xl border border-gray-200 hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900">
                              {agent?.display_name as string}
                            </p>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                (conv.intent_score as number) >= 70
                                  ? 'bg-green-100 text-green-700'
                                  : (conv.intent_score as number) >= 40
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {conv.intent_score as number}/100
                            </span>
                          </div>
                          <span className="text-xs text-gray-400 group-hover:text-blue-500 transition-colors">
                            View →
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(conv.started_at as string).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {conv.message_count as number} messages
                          </span>
                          <span>{durationMinutes} min</span>
                          <span className="capitalize text-gray-500">
                            {statusLabels[conv.host_action_status as string] || conv.host_action_status as string}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
