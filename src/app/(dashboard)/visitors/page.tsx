import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';

export default async function VisitorsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: host } = await supabase
    .from('hosts')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!host) redirect('/onboarding');

  const { data: visitors, count } = await supabase
    .from('visitors')
    .select('*', { count: 'exact' })
    .eq('host_id', host.id)
    .order('last_seen_at', { ascending: false })
    .limit(50);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Visitors</h1>
        <p className="text-gray-500 text-sm mt-1">{count ?? 0} unique visitors</p>
      </div>

      {!visitors || visitors.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="w-14 h-14 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No visitors yet</h3>
            <p className="text-gray-400 text-sm text-center max-w-sm">
              Visitor profiles are built from widget conversations. Once your agent is live, profiles appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {visitors.map((visitor) => (
            <Link key={visitor.id} href={`/visitors/${visitor.id}`}>
              <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                      {((visitor.name || visitor.email || 'V')[0]).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {visitor.name || visitor.email || `Visitor ${visitor.fingerprint.slice(0, 8)}`}
                      </p>
                      <p className="text-xs text-gray-400">
                        {visitor.company && `${visitor.company} · `}
                        Last seen {new Date(visitor.last_seen_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                    visitor.current_intent_score >= 70 ? 'bg-green-100 text-green-700' :
                    visitor.current_intent_score >= 40 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    Intent {visitor.current_intent_score}/100
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
