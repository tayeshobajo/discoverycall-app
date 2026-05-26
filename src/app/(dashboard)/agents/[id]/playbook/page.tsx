import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import PlaybookBuilder from '@/components/playbook/PlaybookBuilder';

export default async function PlaybookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: host } = await supabase
    .from('hosts')
    .select('id, company_name, google_auth_status')
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

  // Parse sections from parsed_content or completed_sections
  type ParsedContent = {
    sections?: Record<string, { content: string; confidence?: string; reviewed?: boolean }>;
    [key: string]: unknown;
  };

  const parsedContent = agent.parsed_content as ParsedContent | null;
  const initialSections: Record<string, { content: string; confidence?: 'high' | 'medium' | 'low'; reviewed?: boolean }> = {};

  // Priority: sections from Quick Start draft > completed_sections from DB
  if (parsedContent?.sections) {
    for (const [key, val] of Object.entries(parsedContent.sections)) {
      initialSections[key] = {
        content: val.content ?? '',
        confidence: val.confidence as 'high' | 'medium' | 'low' | undefined,
        reviewed: val.reviewed,
      };
    }
  } else if (Array.isArray(agent.completed_sections)) {
    for (const section of agent.completed_sections as Array<{ key: string; content: string }>) {
      if (section.key) {
        initialSections[section.key] = { content: section.content ?? '' };
      }
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/agents/${id}`}>
          <Button variant="ghost" size="sm" className="text-gray-500">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Playbook Builder</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {agent.display_name} — Build your agent's sales playbook
          </p>
        </div>
      </div>

      <PlaybookBuilder
        agentId={id}
        agentName={agent.display_name}
        googleDocId={agent.google_doc_id}
        googleAuthStatus={host.google_auth_status}
        initialSections={initialSections}
        companyName={host.company_name}
      />
    </div>
  );
}
