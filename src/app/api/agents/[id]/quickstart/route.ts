/**
 * POST /api/agents/[id]/quickstart
 * Quick Start: fetch URL content, draft all 10 playbook sections with Haiku.
 * Rate limited: 5 per host per hour.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { rateLimiters } from '@/lib/rate-limit/index';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

type RouteContext = { params: Promise<{ id: string }> };

const CANDIDATE_PATHS = [
  '/', '/about', '/about-us', '/services', '/work', '/what-we-do', '/solutions',
  '/pricing', '/packages', '/plans', '/faq', '/frequently-asked-questions', '/contact',
];

const PLAYBOOK_SECTIONS = [
  {
    key: 'who_you_are',
    title: '1. Who You Are',
    prompt: `Extract who this company is: their background, mission, founding story. Write in first person, 2-3 sentences. Be specific, not generic. Return only the section content.`,
  },
  {
    key: 'who_you_serve',
    title: '2. Who You Serve',
    prompt: `Extract who this company's ideal client is: industry, role, company stage. Be specific. If not clear from the website, say what can be inferred. Return only the section content.`,
  },
  {
    key: 'what_you_offer',
    title: '3. What You Offer',
    prompt: `Extract what services, products, or packages this company offers. List them clearly with brief descriptions. Return only the section content.`,
  },
  {
    key: 'transformation',
    title: '4. The Transformation',
    prompt: `Extract the before/after transformation this company delivers. Format as "Before: [pain state] → After: [result state]". Make it specific. Return only the section content.`,
  },
  {
    key: 'common_objections',
    title: '5. Common Objections',
    prompt: `Based on this website, infer the 3-4 most likely objections a prospect would have and draft responses. Format as "Objection: [X] → Response: [Y]". Return only the section content.`,
  },
  {
    key: 'common_questions',
    title: '6. Common Questions',
    prompt: `Extract or infer 5-7 frequently asked questions from this website with clear answers. Format as Q&A pairs. Return only the section content.`,
  },
  {
    key: 'discovery_questions',
    title: '7. Discovery Questions',
    prompt: `Write 5 discovery questions an AI sales agent for this company should ask to qualify prospects. Use SPIN methodology (Situation, Problem, Implication, Need-payoff). Return only the questions.`,
  },
  {
    key: 'closing_approach',
    title: '8. Closing Approach',
    prompt: `Based on this company's offering, write a closing approach for their AI agent: when to ask for contact info and how to frame the next step (call, proposal, demo). Keep it natural. Return only the section content.`,
  },
  {
    key: 'voice_and_tone',
    title: '9. Voice & Tone',
    prompt: `Based on the website's writing style, describe how the AI agent should sound: tone, personality, words to use, words to avoid. Return only the section content.`,
  },
  {
    key: 'guardrails',
    title: '10. Guardrails',
    prompt: `Based on this company's offering, list 3-5 guardrails — things the AI agent should never say, promise, or commit to. Be specific. Return only the section content.`,
  },
];

interface DraftedSection {
  key: string;
  content: string;
  confidence: 'high' | 'medium' | 'low';
  reviewed: boolean;
}

// Sections that commonly come back low-confidence from website content
const LOW_CONFIDENCE_SECTIONS = new Set([
  'common_objections', 'discovery_questions', 'closing_approach', 'guardrails',
]);

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: host } = await supabase
    .from('hosts')
    .select('id, company_name')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!host) return NextResponse.json({ error: 'Host not found' }, { status: 404 });

  // Rate limit: 5 per host per hour
  const rl = await rateLimiters.quickStartFetch(host.id);
  if (!rl.success) {
    return NextResponse.json(
      {
        error: "You've used your Quick Start fetches for the hour. Try again later, or Build from scratch in the meantime.",
        code: 'RATE_LIMIT',
      },
      { status: 429 }
    );
  }

  // Verify agent ownership
  const { data: agent } = await supabase
    .from('agents')
    .select('id, internal_name')
    .eq('id', id)
    .eq('host_id', host.id)
    .maybeSingle();

  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const { url, linkedin_url } = body;

  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Invalid protocol');
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  // Fetch pages
  const pagesToFetch = CANDIDATE_PATHS.map(
    (path) => new URL(path, parsedUrl.origin).toString()
  );
  if (linkedin_url) pagesToFetch.push(linkedin_url);

  const fetchedContent = await fetchPages(pagesToFetch, parsedUrl.origin);

  if (!fetchedContent.trim()) {
    return NextResponse.json(
      {
        error: "We couldn't extract content from this URL. The site may require JavaScript or block automated access. Try building from scratch.",
        code: 'NO_CONTENT',
      },
      { status: 422 }
    );
  }

  // Limit to 100KB
  const consolidatedContent = fetchedContent.slice(0, 100 * 1024);

  // Draft all 10 sections in parallel with Haiku
  const sectionDrafts = await Promise.allSettled(
    PLAYBOOK_SECTIONS.map((section) =>
      draftSection(section.key, section.prompt, consolidatedContent, host.company_name)
    )
  );

  const sections: Record<string, DraftedSection> = {};
  for (let i = 0; i < PLAYBOOK_SECTIONS.length; i++) {
    const sectionDef = PLAYBOOK_SECTIONS[i];
    const result = sectionDrafts[i];

    const content =
      result.status === 'fulfilled'
        ? result.value
        : `(Could not generate this section — please fill in manually)`;

    const isEmpty = content.trim().length < 20;
    const isLowConfidence = LOW_CONFIDENCE_SECTIONS.has(sectionDef.key);

    sections[sectionDef.key] = {
      key: sectionDef.key,
      content,
      confidence: isEmpty ? 'low' : isLowConfidence ? 'medium' : 'high',
      reviewed: false,
    };
  }

  // Store in agents.parsed_content
  const parsedContent = {
    draft_source: 'quick_start',
    draft_metadata: {
      source_url: url,
      linkedin_url: linkedin_url ?? null,
      pages_fetched: pagesToFetch,
      drafted_at: new Date().toISOString(),
    },
    sections,
  };

  const supabaseAdmin = await createServiceClient();
  await supabaseAdmin
    .from('agents')
    .update({ parsed_content: parsedContent as unknown as Record<string, unknown> })
    .eq('id', id);

  return NextResponse.json({ success: true, sections, draft_metadata: parsedContent.draft_metadata });
}

async function fetchPages(urls: string[], origin: string): Promise<string> {
  // Check robots.txt first
  const disallowed = await getRobotsDisallowed(origin);

  const results = await Promise.allSettled(
    urls.map(async (url) => {
      // Check robots.txt
      const path = new URL(url).pathname;
      if (disallowed.some((d) => path.startsWith(d))) {
        return '';
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const resp = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'DiscoveryCall-Bot/1.0 (+https://discoverycall.ai/bot)',
            Accept: 'text/html',
          },
        });

        clearTimeout(timeout);

        if (!resp.ok) return '';

        const html = await resp.text();
        return extractTextFromHtml(html).slice(0, 50 * 1024); // Max 50KB per page
      } catch {
        return '';
      }
    })
  );

  const texts: string[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.trim().length > 50) {
      texts.push(result.value.trim());
    }
  }

  return texts.join('\n\n---\n\n');
}

async function getRobotsDisallowed(origin: string): Promise<string[]> {
  try {
    const resp = await fetch(`${origin}/robots.txt`, {
      headers: { 'User-Agent': 'DiscoveryCall-Bot/1.0' },
    });
    if (!resp.ok) return [];

    const text = await resp.text();
    const disallowed: string[] = [];
    let inRelevantBlock = false;

    for (const line of text.split('\n')) {
      const trimmed = line.trim().toLowerCase();
      if (trimmed.startsWith('user-agent:')) {
        const agent = trimmed.replace('user-agent:', '').trim();
        inRelevantBlock = agent === '*' || agent === 'discoverycall-bot';
      } else if (inRelevantBlock && trimmed.startsWith('disallow:')) {
        const path = line.trim().replace(/^disallow:\s*/i, '');
        if (path) disallowed.push(path);
      }
    }

    return disallowed;
  } catch {
    return [];
  }
}

function extractTextFromHtml(html: string): string {
  // Simple HTML-to-text: strip tags, decode entities
  return html
    // Remove scripts and styles
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    // Convert block elements to newlines
    .replace(/<(?:p|div|h[1-6]|li|br|section|article)[^>]*>/gi, '\n')
    // Strip remaining tags
    .replace(/<[^>]+>/g, '')
    // Decode common entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Clean up whitespace
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

async function draftSection(
  key: string,
  sectionPrompt: string,
  content: string,
  companyName: string
): Promise<string> {
  const result = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: sectionPrompt,
    messages: [
      {
        role: 'user',
        content: `COMPANY: ${companyName}\n\nWEBSITE CONTENT:\n\n${content}`,
      },
    ],
  });

  return result.content[0].type === 'text' ? result.content[0].text.trim() : '';
}
