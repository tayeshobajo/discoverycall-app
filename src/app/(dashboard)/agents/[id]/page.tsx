import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, Copy, ExternalLink, FileText, Palette, Code2 } from 'lucide-react';

export default async function AgentOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: host } = await supabase
    .from('hosts')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!host) redirect('/onboarding');

  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('id', id)
    .eq('host_id', host.id)
    .maybeSingle();

  if (!agent) notFound();

  const STATUS_CONFIG = {
    ready: { label: 'Live', color: 'bg-green-100 text-green-700' },
    draft: { label: 'Draft', color: 'bg-gray-100 text-gray-600' },
    building: { label: 'Building', color: 'bg-yellow-100 text-yellow-700' },
    paused: { label: 'Paused', color: 'bg-red-100 text-red-600' },
  };
  const status = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.draft;

  const embedCode = `<script src="https://embed.discoverycall.ai/loader.js"
  data-token="${agent.embed_token}"
  async></script>`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
            <Bot className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{agent.display_name}</h1>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>
                {status.label}
              </span>
            </div>
            <p className="text-gray-400 text-sm">{agent.internal_name}</p>
          </div>
        </div>
      </div>

      {/* Quick action tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href={`/agents/${id}/playbook`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer group">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Playbook</p>
                <p className="text-xs text-gray-400">Build or edit</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/agents/${id}/personalize`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer group">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 bg-pink-50 rounded-lg flex items-center justify-center group-hover:bg-pink-100 transition-colors">
                <Palette className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Personalize</p>
                <p className="text-xs text-gray-400">Look & feel</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/agents/${id}/embed`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer group">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center group-hover:bg-green-100 transition-colors">
                <Code2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Embed</p>
                <p className="text-xs text-gray-400">Install on your site</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Embed token */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Embed token</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <code className="text-xs bg-gray-50 border border-gray-200 rounded px-3 py-2 flex-1 font-mono text-gray-600 truncate">
              {agent.embed_token}
            </code>
            <Button variant="outline" size="sm">
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="bg-gray-900 rounded-lg p-4">
            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">{embedCode}</pre>
          </div>
          {agent.google_doc_id && (
            <a
              href={`https://docs.google.com/document/d/${agent.google_doc_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-[#1783F1] hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              Open playbook in Google Docs
            </a>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
