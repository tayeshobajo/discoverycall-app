import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, TrendingUp } from 'lucide-react';

export default async function ConversationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: host } = await supabase
    .from('hosts')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!host) redirect('/onboarding');

  const { data: conversations } = await supabase
    .from('conversations')
    .select(`
      id, intent_score, status, started_at, last_message_at, message_count, host_action_status,
      agents!inner(display_name),
      visitors!inner(name, email, company, current_intent_score)
    `)
    .eq('host_id', host.id)
    .order('started_at', { ascending: false })
    .limit(50);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Conversations</h1>
        <p className="text-gray-500 text-sm mt-1">
          {conversations?.length ?? 0} total conversations
        </p>
      </div>

      {!conversations || conversations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MessageSquare className="w-14 h-14 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No conversations yet</h3>
            <p className="text-gray-400 text-sm text-center max-w-sm">
              Once your agent is embedded on your website, visitor conversations will appear here in real time.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv: Record<string, unknown>) => {
            const visitor = conv.visitors as Record<string, unknown>;
            const agent = conv.agents as Record<string, unknown>;
            const intentScore = conv.intent_score as number;

            return (
              <Link
                key={conv.id as string}
                href={`/conversations/${conv.id}`}
              >
                <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                        {((visitor?.name as string || visitor?.email as string || 'V')[0]).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900">
                            {visitor?.name as string || visitor?.email as string || 'Anonymous visitor'}
                          </p>
                          {conv.host_action_status === 'new' && (
                            <Badge variant="secondary" className="text-xs">New</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {visitor?.company as string && `${visitor.company} · `}
                          via {agent?.display_name as string} · {conv.message_count as number} messages
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <p className="text-xs text-gray-400">
                          {new Date(conv.started_at as string).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                        intentScore >= 70
                          ? 'bg-green-100 text-green-700'
                          : intentScore >= 40
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
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
