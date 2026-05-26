import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default async function IntegrationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: host } = await supabase
    .from('hosts')
    .select('google_auth_status, google_account_email')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!host) redirect('/onboarding');

  const isGoogleConnected = host?.google_auth_status === 'connected';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-gray-500 text-sm mt-1">Connect your tools to power your agents.</p>
      </div>

      {/* Google */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <div>
                <CardTitle className="text-base">Google Workspace</CardTitle>
                <CardDescription>Playbooks live in your Google Docs. Required for agents.</CardDescription>
              </div>
            </div>
            {isGoogleConnected ? (
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Connected</Badge>
            ) : (
              <Badge variant="secondary">Not connected</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isGoogleConnected ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Connected as {host.google_account_email}</p>
              <Button variant="outline" size="sm">Disconnect</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Connect Google to create playbook docs in your Drive. We only access files we create — nothing else.
              </p>
              <a href="/api/google/connect">
                <Button className="bg-[#1783F1] hover:bg-[#1468C8]">
                  Connect Google →
                </Button>
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendar — Phase 1.5 */}
      <Card className="opacity-60">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center text-gray-400">
                📅
              </div>
              <div>
                <CardTitle className="text-base text-gray-500">Calendar Integrations</CardTitle>
                <CardDescription>Cal.com · Calendly</CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">Phase 1.5</Badge>
          </div>
        </CardHeader>
      </Card>

      {/* CRM — Phase 2 */}
      <Card className="opacity-60">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center text-gray-400">
                🔗
              </div>
              <div>
                <CardTitle className="text-base text-gray-500">CRM Webhooks</CardTitle>
                <CardDescription>HubSpot · Notion · Airtable · Zapier</CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">Phase 2</Badge>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
