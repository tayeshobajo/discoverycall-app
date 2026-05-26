import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Wand2, ExternalLink } from 'lucide-react';

const PLAYBOOK_SECTIONS = [
  { key: 'who_you_are', title: '1. Who you are', description: 'Company background, founding story, mission' },
  { key: 'who_you_serve', title: '2. Who you serve', description: 'Ideal client profile, industry, role, company stage' },
  { key: 'what_you_offer', title: '3. What you offer', description: 'Services, products, packages' },
  { key: 'transformation', title: '4. The transformation', description: 'Before → after. What changes for the client?' },
  { key: 'common_objections', title: '5. Common objections', description: 'The doubts visitors have and how to address them' },
  { key: 'common_questions', title: '6. Common questions', description: 'FAQs and your best answers' },
  { key: 'discovery_questions', title: '7. Discovery questions', description: 'Questions the agent should ask to qualify' },
  { key: 'closing_approach', title: '8. Closing approach', description: 'How to move toward the next step' },
  { key: 'voice_and_tone', title: '9. Voice & tone', description: 'How the agent should sound. Custom tone instructions.' },
  { key: 'guardrails', title: '10. Guardrails', description: "What the agent should never say or promise" },
];

export default async function PlaybookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: host } = await supabase
    .from('hosts')
    .select('id, google_auth_status')
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

  const isBuilding = agent.status === 'draft' || agent.status === 'building';
  const completedSections = (agent.completed_sections as string[]) ?? [];
  const parsedContent = agent.parsed_content as Record<string, Record<string, unknown>> ?? {};

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Playbook</h1>
          <p className="text-gray-500 text-sm mt-1">
            {agent.display_name} · {completedSections.length}/10 sections complete
          </p>
        </div>
        {agent.google_doc_id && (
          <a
            href={`https://docs.google.com/document/d/${agent.google_doc_id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm">
              <ExternalLink className="w-3.5 h-3.5 mr-2" />
              Open in Google Docs
            </Button>
          </a>
        )}
      </div>

      {host.google_auth_status !== 'connected' && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <p className="text-sm text-amber-800">
              Connect your Google account to create a playbook doc.{' '}
              <a href="/api/google/connect" className="font-medium underline">Connect Google →</a>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Section grid */}
      <div className="space-y-3">
        {PLAYBOOK_SECTIONS.map((section) => {
          const isComplete = completedSections.includes(section.key);
          const content = parsedContent?.[section.key];

          return (
            <Card key={section.key} className={isComplete ? 'border-green-200' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isComplete ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {isComplete ? '✓' : section.key[0].toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-sm">{section.title}</CardTitle>
                      <CardDescription className="text-xs">{section.description}</CardDescription>
                    </div>
                  </div>
                  <Button
                    variant={isComplete ? 'ghost' : 'outline'}
                    size="sm"
                    className="text-xs"
                  >
                    <Wand2 className="w-3 h-3 mr-1" />
                    {isComplete ? 'Edit' : 'Build'}
                  </Button>
                </div>
              </CardHeader>
              {content && (
                <CardContent>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {(content as { content?: string }).content || String(content)}
                  </p>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {completedSections.length === 10 && !agent.google_doc_id && (
        <Card className="border-[#1783F1]">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-700 mb-4">All sections complete! Save to Google Docs to activate your agent.</p>
            <Button className="bg-[#1783F1] hover:bg-[#1468C8]">
              <FileText className="w-4 h-4 mr-2" />
              Save to Google Docs & activate
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
