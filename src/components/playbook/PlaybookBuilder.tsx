'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Wand2, Loader2, CheckCircle2, Circle, Save, Rocket, ExternalLink,
  Globe, AlertCircle, ChevronDown, ChevronUp, Bot, Copy, Check,
} from 'lucide-react';

export interface PlaybookSection {
  key: string;
  title: string;
  description: string;
  placeholder: string;
}

export const SECTIONS: PlaybookSection[] = [
  {
    key: 'who_you_are',
    title: '1. Who You Are',
    description: 'Company background, founding story, mission',
    placeholder: 'E.g. We\'re a boutique operations consulting firm founded in 2019. We help mid-market SaaS companies build the internal systems they need to scale without chaos...',
  },
  {
    key: 'who_you_serve',
    title: '2. Who You Serve',
    description: 'Ideal client profile, industry, role, company stage',
    placeholder: 'E.g. Our clients are typically VP of Ops or COOs at B2B SaaS companies with 20-150 employees, $2-20M ARR, who have recently hit a scaling wall...',
  },
  {
    key: 'what_you_offer',
    title: '3. What You Offer',
    description: 'Services, products, packages',
    placeholder: 'E.g. We offer three engagement types: (1) The Ops Audit (2-week diagnostic), (2) The Scale Sprint (90-day implementation), (3) Fractional COO (ongoing monthly retainer)...',
  },
  {
    key: 'transformation',
    title: '4. The Transformation',
    description: 'Before → after. What changes for the client?',
    placeholder: 'Before: Founders spending 40% of their time firefighting operational issues, team unclear on priorities, processes breaking down every time you hire...\nAfter: Clear systems, empowered leadership team, founder back in the CEO seat...',
  },
  {
    key: 'common_objections',
    title: '5. Common Objections',
    description: 'The doubts visitors have and how to address them',
    placeholder: 'Objection: "We\'re not sure we need a consultant."\nResponse: Most clients say that before we do the audit. The audit often reveals 3-4 specific gaps they didn\'t know existed...',
  },
  {
    key: 'common_questions',
    title: '6. Common Questions',
    description: 'FAQs and your best answers',
    placeholder: 'Q: How long does an engagement typically last?\nA: The Ops Audit is 2 weeks. The Scale Sprint runs 90 days. Fractional COO is a 6-month minimum...',
  },
  {
    key: 'discovery_questions',
    title: '7. Discovery Questions',
    description: 'Questions the agent should ask to qualify visitors',
    placeholder: 'E.g.\n- What\'s your current team size and how fast are you growing?\n- Where do you feel the most friction in your operations right now?\n- What would solving that be worth to your business in the next 12 months?...',
  },
  {
    key: 'closing_approach',
    title: '8. Closing Approach',
    description: 'How to move toward the next step',
    placeholder: 'When the prospect has described a specific problem and shows urgency, offer to send a recap and schedule a 20-minute call. Use: "What\'s the best email to send a quick summary and a link to book time?"...',
  },
  {
    key: 'voice_and_tone',
    title: '9. Voice & Tone',
    description: 'How the agent should sound',
    placeholder: 'Warm but direct. Not corporate. Use the prospect\'s own words when possible. Ask one question at a time. Never use jargon unless the prospect introduces it first...',
  },
  {
    key: 'guardrails',
    title: '10. Guardrails',
    description: "What the agent should never say or promise",
    placeholder: 'Never quote specific prices (say "pricing is custom based on scope"). Never promise specific outcomes or timelines. Never compare directly to competitors. Never make commitments about availability...',
  },
];

interface SectionData {
  content: string;
  confidence?: 'high' | 'medium' | 'low';
  reviewed?: boolean;
}

interface Props {
  agentId: string;
  agentName: string;
  googleDocId: string | null;
  googleAuthStatus: string;
  initialSections: Record<string, SectionData>;
  companyName: string;
}

export default function PlaybookBuilder({
  agentId,
  agentName,
  googleDocId: initialDocId,
  googleAuthStatus,
  initialSections,
  companyName,
}: Props) {
  const router = useRouter();
  const [sections, setSections] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const s of SECTIONS) {
      const data = initialSections[s.key];
      initial[s.key] = (typeof data === 'string' ? data : data?.content) ?? '';
    }
    return initial;
  });

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(SECTIONS.slice(0, 3).map((s) => s.key))
  );
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [googleDocId, setGoogleDocId] = useState(initialDocId);
  const [deployed, setDeployed] = useState(false);

  // Quick Start state
  const [quickStartUrl, setQuickStartUrl] = useState('');
  const [quickStartLoading, setQuickStartLoading] = useState(false);
  const [quickStartError, setQuickStartError] = useState('');
  const [quickStartDone, setQuickStartDone] = useState(false);
  const [showQuickStart, setShowQuickStart] = useState(!initialDocId && Object.values(initialSections).every(v => !v || !(typeof v === 'string' ? v : v?.content)));

  // Embed code copy
  const [copied, setCopied] = useState(false);

  const completedCount = SECTIONS.filter((s) => sections[s.key]?.trim().length > 0).length;

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const updateSection = (key: string, value: string) => {
    setSections((prev) => ({ ...prev, [key]: value }));
  };

  const aiAssist = async (sectionKey: string) => {
    setAiLoading((prev) => ({ ...prev, [sectionKey]: true }));
    setError('');

    try {
      const resp = await fetch(`/api/agents/${agentId}/playbook/assist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section_key: sectionKey,
          current_content: sections[sectionKey],
          context: `Company: ${companyName}, Agent: ${agentName}`,
        }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error ?? 'AI assist failed');
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error('No stream');

      const decoder = new TextDecoder();
      let accumulated = '';

      // Start streaming into the textarea
      setSections((prev) => ({ ...prev, [sectionKey]: '' }));

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        accumulated += text;
        setSections((prev) => ({ ...prev, [sectionKey]: accumulated }));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI assist unavailable';
      setError(msg);
    } finally {
      setAiLoading((prev) => ({ ...prev, [sectionKey]: false }));
    }
  };

  const runQuickStart = async () => {
    if (!quickStartUrl.trim()) return;
    setQuickStartLoading(true);
    setQuickStartError('');

    try {
      const resp = await fetch(`/api/agents/${agentId}/quickstart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: quickStartUrl.trim() }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.error ?? 'Quick Start failed');
      }

      // Populate sections with drafted content
      const newSections: Record<string, string> = { ...sections };
      for (const [key, draft] of Object.entries(data.sections as Record<string, SectionData>)) {
        if (draft.content && draft.content.length > 20) {
          newSections[key] = draft.content;
        }
      }
      setSections(newSections);
      setQuickStartDone(true);
      setShowQuickStart(false);

      // Expand all sections for review
      setExpandedSections(new Set(SECTIONS.map((s) => s.key)));
      setSuccess('✓ All 10 sections drafted from your website. Review and edit each one, then save your playbook.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Quick Start failed';
      setQuickStartError(msg);
    } finally {
      setQuickStartLoading(false);
    }
  };

  const savePlaybook = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    const completedSections = SECTIONS
      .filter((s) => sections[s.key]?.trim())
      .map((s) => ({ key: s.key, content: sections[s.key].trim() }));

    if (completedSections.length === 0) {
      setError('Complete at least one section before saving.');
      setSaving(false);
      return;
    }

    try {
      if (!googleDocId) {
        // First save: create the Google Doc
        const resp = await fetch(`/api/agents/${agentId}/playbook/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sections: completedSections }),
        });

        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error ?? 'Failed to create playbook doc');

        setGoogleDocId(data.google_doc_id);
        setSuccess('✓ Playbook saved to Google Docs!');
      } else {
        // Update existing doc
        const resp = await fetch(`/api/agents/${agentId}/playbook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sections: completedSections }),
        });

        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error ?? 'Failed to save playbook');

        setSuccess('✓ Playbook updated!');
      }

      // Refresh page data
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const deployAgent = async () => {
    if (!googleDocId) {
      // Save first
      await savePlaybook();
      if (error) return;
    }

    setDeploying(true);
    setError('');

    try {
      const resp = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ready' }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? 'Deploy failed');

      setDeployed(true);
      setSuccess('🚀 Agent is live! Copy your embed code and install it on your site.');
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Deploy failed';
      setError(msg);
    } finally {
      setDeploying(false);
    }
  };

  const copyEmbedCode = async (embedToken: string) => {
    const code = `<script src="https://embed.discoverycall.ai/loader.js"\n  data-token="${embedToken}"\n  async></script>`;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex gap-6">
      {/* Main builder — 60% */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Google not connected warning */}
        {googleAuthStatus !== 'connected' && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-4 flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800">
                Connect your Google account to save your playbook to Google Docs.{' '}
                <a href="/api/google/connect" className="font-semibold underline">
                  Connect Google →
                </a>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Quick Start */}
        {showQuickStart && (
          <Card className="border-[#1783F1] bg-blue-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#1783F1]" />
                    Quick Start — Draft from your website
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Enter your website URL and we'll draft all 10 sections in ~30 seconds.
                  </CardDescription>
                </div>
                <button
                  onClick={() => setShowQuickStart(false)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Build from scratch
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="https://yourcompany.com"
                  value={quickStartUrl}
                  onChange={(e) => setQuickStartUrl(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && runQuickStart()}
                />
                <Button
                  onClick={runQuickStart}
                  disabled={quickStartLoading || !quickStartUrl.trim()}
                  className="bg-[#1783F1] hover:bg-[#1468C8] whitespace-nowrap"
                >
                  {quickStartLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Drafting...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Draft playbook
                    </>
                  )}
                </Button>
              </div>
              {quickStartError && (
                <p className="text-sm text-red-600">{quickStartError}</p>
              )}
              <p className="text-xs text-blue-600">
                We fetch your public pages (homepage, /about, /services, etc.) and use AI to draft each section.
                You review and edit everything before going live.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Progress */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{completedCount}</span> / 10 sections complete
            </div>
            <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1783F1] rounded-full transition-all"
                style={{ width: `${(completedCount / 10) * 100}%` }}
              />
            </div>
          </div>
          {!showQuickStart && !quickStartDone && (
            <button
              onClick={() => setShowQuickStart(true)}
              className="text-xs text-[#1783F1] hover:underline"
            >
              Quick Start from URL
            </button>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Sections */}
        {SECTIONS.map((section) => {
          const isExpanded = expandedSections.has(section.key);
          const content = sections[section.key] ?? '';
          const isFilled = content.trim().length > 0;
          const isAiLoading = aiLoading[section.key];

          return (
            <Card
              key={section.key}
              className={`transition-all ${isFilled ? 'border-green-200' : ''}`}
            >
              <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleSection(section.key)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                        isFilled
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {isFilled ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-sm">{section.title}</CardTitle>
                      <CardDescription className="text-xs">{section.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isFilled && <Badge className="bg-green-100 text-green-700 text-xs hover:bg-green-100">Filled</Badge>}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="space-y-2 pt-0">
                  <Textarea
                    value={content}
                    onChange={(e) => updateSection(section.key, e.target.value)}
                    placeholder={section.placeholder}
                    className="min-h-[120px] text-sm resize-y font-mono leading-relaxed"
                  />
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => aiAssist(section.key)}
                      disabled={isAiLoading}
                      className="text-xs border-[#1783F1] text-[#1783F1] hover:bg-blue-50"
                    >
                      {isAiLoading ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                          Writing...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-3 h-3 mr-1.5" />
                          AI assist
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}

        {/* Action buttons */}
        <div className="flex gap-3 pt-2 pb-6">
          <Button
            variant="outline"
            onClick={savePlaybook}
            disabled={saving || deploying || completedCount === 0}
            className="flex-1"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {googleDocId ? 'Save changes' : 'Save to Google Docs'}
              </>
            )}
          </Button>

          <Button
            onClick={deployAgent}
            disabled={deploying || saving || completedCount === 0 || googleAuthStatus !== 'connected'}
            className="flex-1 bg-[#1783F1] hover:bg-[#1468C8]"
          >
            {deploying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deploying...
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4 mr-2" />
                {deployed ? 'Agent is live ✓' : 'Deploy agent'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Preview panel — 40% */}
      <div className="w-80 shrink-0 space-y-4 sticky top-6 self-start">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Preview</CardTitle>
            <CardDescription className="text-xs">How visitors will experience this agent</CardDescription>
          </CardHeader>
          <CardContent>
            <WidgetPreview
              agentName={agentName}
              greeting={sections['who_you_are']?.slice(0, 100) || 'Hi! I\'m here to answer your questions and help you take the next step.'}
            />
          </CardContent>
        </Card>

        {googleDocId && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Google Doc</CardTitle>
            </CardHeader>
            <CardContent>
              <a
                href={`https://docs.google.com/document/d/${googleDocId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-[#1783F1] hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open in Google Docs
              </a>
            </CardContent>
          </Card>
        )}

        {/* Completion checklist */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {SECTIONS.map((s) => (
              <div key={s.key} className="flex items-center gap-2">
                <div
                  className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                    sections[s.key]?.trim() ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
                <span className={`text-xs ${sections[s.key]?.trim() ? 'text-gray-700' : 'text-gray-400'}`}>
                  {s.title}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Minimal widget preview
function WidgetPreview({ agentName, greeting }: { agentName: string; greeting: string }) {
  const [open, setOpen] = useState(true);
  const [message, setMessage] = useState('');

  const shortGreeting = greeting.length > 120 ? greeting.slice(0, 120) + '...' : greeting;

  return (
    <div className="relative h-80 bg-gray-50 rounded-lg border overflow-hidden">
      {/* Fake site */}
      <div className="p-3 space-y-2 opacity-30">
        <div className="h-3 bg-gray-200 rounded w-3/4" />
        <div className="h-2 bg-gray-100 rounded w-full" />
        <div className="h-2 bg-gray-100 rounded w-5/6" />
        <div className="h-2 bg-gray-100 rounded w-4/5" />
      </div>

      {/* Widget button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="absolute bottom-3 right-3 w-10 h-10 bg-[#1783F1] rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
        >
          <Bot className="w-5 h-5 text-white" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="absolute bottom-0 right-0 w-full bg-white border-t rounded-t-xl shadow-xl flex flex-col h-64">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b bg-[#1783F1] rounded-t-xl">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <span className="text-white text-xs font-medium">{agentName}</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white text-xs">✕</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="bg-gray-100 rounded-lg px-3 py-2 text-xs max-w-[85%]">
              {shortGreeting}
            </div>
          </div>

          {/* Input */}
          <div className="p-2 border-t">
            <div className="flex gap-1.5">
              <input
                className="flex-1 text-xs border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1783F1]"
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button className="bg-[#1783F1] text-white text-xs px-2 rounded hover:bg-[#1468C8]">
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
