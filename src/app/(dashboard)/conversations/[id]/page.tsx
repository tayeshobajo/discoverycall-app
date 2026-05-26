import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, Clock, MessageSquare, ExternalLink, User } from 'lucide-react';
import ConversationActions from '@/components/conversations/ConversationActions';

export default async function ConversationDetailPage({
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

  // Fetch conversation with related data
  const { data: conv } = await supabase
    .from('conversations')
    .select(
      `
      id, intent_score, intent_reasoning, recommended_action, status, host_action_status,
      message_count, started_at, last_message_at, ended_at, source_page_url, summary,
      agents!inner(id, display_name),
      visitors!inner(id, name, email, phone, company, role, problem, budget_signal, urgency_signal, decision_authority, current_intent_score)
    `
    )
    .eq('id', id)
    .eq('host_id', host.id)
    .maybeSingle();

  if (!conv) notFound();

  // Fetch messages
  const { data: messages } = await supabase
    .from('messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true });

  const visitor = conv.visitors as Record<string, unknown>;
  const agent = conv.agents as Record<string, unknown>;

  const intentColor =
    conv.intent_score >= 70
      ? 'bg-green-100 text-green-700'
      : conv.intent_score >= 40
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-gray-100 text-gray-600';

  const durationMinutes = Math.round(
    (new Date(conv.last_message_at).getTime() - new Date(conv.started_at).getTime()) / 60000
  );

  const statusLabels: Record<string, string> = {
    new: 'New',
    contacted: 'Contacted',
    booked: 'Booked',
    dismissed: 'Dismissed',
  };

  const signalBadgeClass: Record<string, string> = {
    high: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-red-100 text-red-700',
    unknown: 'bg-gray-100 text-gray-500',
    decision_maker: 'bg-blue-100 text-blue-700',
    influencer: 'bg-purple-100 text-purple-700',
    researcher: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/conversations">
          <Button variant="ghost" size="sm" className="text-gray-500">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Conversations
          </Button>
        </Link>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-600">
            {(
              (visitor?.name as string || visitor?.email as string || 'V')[0]
            ).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {(visitor?.name as string) || (visitor?.email as string) || 'Anonymous visitor'}
            </h1>
            <p className="text-sm text-gray-400">
              via {agent?.display_name as string} · {new Date(conv.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold px-3 py-1 rounded-full flex items-center gap-1 ${intentColor}`}>
            {conv.intent_score >= 70 && <TrendingUp className="w-3 h-3" />}
            {conv.intent_score}/100
          </span>
          <Badge variant="outline" className="capitalize text-xs">
            {statusLabels[conv.host_action_status] || conv.host_action_status}
          </Badge>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Transcript (60%) */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Conversation transcript</CardTitle>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {conv.message_count} messages
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {durationMinutes} min
                  </span>
                  {conv.source_page_url && (
                    <a
                      href={conv.source_page_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-500 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Source page
                    </a>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!messages || messages.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No messages recorded.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.role === 'agent' ? 'flex-row-reverse' : ''}`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          msg.role === 'visitor'
                            ? 'bg-gray-200 text-gray-600'
                            : msg.role === 'agent'
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {msg.role === 'visitor' ? 'V' : msg.role === 'agent' ? 'A' : '⚙'}
                      </div>
                      <div className={`flex-1 max-w-[85%] ${msg.role === 'agent' ? 'items-end' : ''}`}>
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                            msg.role === 'visitor'
                              ? 'bg-gray-100 text-gray-900 rounded-tl-sm'
                              : msg.role === 'agent'
                              ? 'bg-blue-600 text-white rounded-tr-sm'
                              : 'bg-gray-50 text-gray-500 italic border border-gray-200 rounded-lg'
                          }`}
                        >
                          {msg.content}
                        </div>
                        <p className={`text-xs text-gray-400 mt-1 ${msg.role === 'agent' ? 'text-right' : ''}`}>
                          {new Date(msg.created_at).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar (40%) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Visitor Profile */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                Visitor profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {visitor?.name && (
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-0.5">Name</p>
                  <p className="text-sm text-gray-900">{visitor.name as string}</p>
                </div>
              )}
              {visitor?.email && (
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-0.5">Email</p>
                  <a
                    href={`mailto:${visitor.email as string}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {visitor.email as string}
                  </a>
                </div>
              )}
              {visitor?.phone && (
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-0.5">Phone</p>
                  <p className="text-sm text-gray-900">{visitor.phone as string}</p>
                </div>
              )}
              {visitor?.company && (
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-0.5">Company</p>
                  <p className="text-sm text-gray-900">{visitor.company as string}</p>
                </div>
              )}
              {visitor?.role && (
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-0.5">Role</p>
                  <p className="text-sm text-gray-900">{visitor.role as string}</p>
                </div>
              )}
              {visitor?.problem && (
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-0.5">Problem</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{visitor.problem as string}</p>
                </div>
              )}

              {/* Signals */}
              {(visitor?.budget_signal || visitor?.urgency_signal || visitor?.decision_authority) && (
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-1.5">Signals</p>
                  <div className="flex flex-wrap gap-1.5">
                    {visitor?.budget_signal && visitor.budget_signal !== 'unknown' && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${signalBadgeClass[visitor.budget_signal as string] || 'bg-gray-100 text-gray-600'}`}>
                        Budget: {visitor.budget_signal as string}
                      </span>
                    )}
                    {visitor?.urgency_signal && visitor.urgency_signal !== 'unknown' && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${signalBadgeClass[visitor.urgency_signal as string] || 'bg-gray-100 text-gray-600'}`}>
                        Urgency: {visitor.urgency_signal as string}
                      </span>
                    )}
                    {visitor?.decision_authority && visitor.decision_authority !== 'unknown' && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${signalBadgeClass[visitor.decision_authority as string] || 'bg-gray-100 text-gray-600'}`}>
                        {visitor.decision_authority as string}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* View full visitor profile */}
              <Link href={`/visitors/${visitor?.id as string}`}>
                <Button variant="outline" size="sm" className="w-full mt-2 text-xs">
                  View full visitor profile →
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Intent + Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Intent score</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className={`text-center py-3 rounded-xl ${intentColor}`}>
                <div className="text-3xl font-black">{conv.intent_score}/100</div>
                {conv.intent_reasoning && (
                  <p className="text-xs mt-1 opacity-80 px-2">{conv.intent_reasoning}</p>
                )}
              </div>
              {conv.recommended_action && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-600 font-medium mb-0.5">Recommended action</p>
                  <p className="text-sm font-semibold text-blue-900 capitalize">
                    {conv.recommended_action.replace(/_/g, ' ')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lead Actions (client component) */}
          <ConversationActions
            conversationId={id}
            currentStatus={conv.host_action_status}
            visitorEmail={visitor?.email as string | null}
            agentId={agent?.id as string}
          />
        </div>
      </div>
    </div>
  );
}
