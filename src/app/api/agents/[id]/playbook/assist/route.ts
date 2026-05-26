/**
 * POST /api/agents/[id]/playbook/assist
 * AI-assist: generate or improve a single playbook section using Claude Sonnet.
 * Streams the response.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

type RouteContext = { params: Promise<{ id: string }> };

const SECTION_PROMPTS: Record<string, string> = {
  who_you_are: `You are helping a business consultant write the "Who You Are" section of their AI sales agent playbook.

This section tells the agent about the company's background, founding story, and mission.
Write this section in first person (as if the company is speaking).
Keep it authentic, not corporate. 2-4 sentences is ideal.
Focus on what makes them credible and who they are at their core.`,

  who_you_serve: `You are helping a business consultant write the "Who You Serve" section of their AI sales agent playbook.

This section defines their ideal client profile — industry, role, company stage, and key characteristics.
Be specific. Generic descriptions make bad sales agents.
Write it as a clear profile the agent can use to qualify visitors.`,

  what_you_offer: `You are helping a business consultant write the "What You Offer" section of their AI sales agent playbook.

This section describes their services, products, or packages clearly.
Include specific deliverables, timelines if relevant, and what sets them apart.
Write it so a visitor immediately understands what they'd be buying.`,

  transformation: `You are helping a business consultant write the "The Transformation" section of their AI sales agent playbook.

This is the most powerful section. It describes the before/after transformation clients experience.
Format it as: Before (their current pain) → After (what changes after working with this company).
Make the transformation specific and emotionally resonant, not generic.`,

  common_objections: `You are helping a business consultant write the "Common Objections" section of their AI sales agent playbook.

List the 3-5 most common objections prospects raise, with natural responses to each.
Objections are real concerns, not just questions. Address them honestly.
Format as: Objection: [what they say] → Response: [how to address it]`,

  common_questions: `You are helping a business consultant write the "Common Questions" section of their AI sales agent playbook.

List 5-8 frequently asked questions with clear, direct answers.
Include questions about process, pricing signals, timeline, and qualifications.
Format as Q&A pairs.`,

  discovery_questions: `You are helping a business consultant write the "Discovery Questions" section of their AI sales agent playbook.

These are questions the AI agent will ask visitors to qualify them using SPIN methodology:
- Situation: current setup, context
- Problem: what isn't working
- Implication: cost of the problem
- Need-payoff: value of solving it

Write 5-8 discovery questions that naturally surface these signals.`,

  closing_approach: `You are helping a business consultant write the "Closing Approach" section of their AI sales agent playbook.

This guides how the agent moves toward the next step (booking a call, sending a proposal, etc.).
Include: when to ask for contact info, how to frame the CTA, and what a good close sounds like.
Keep it natural — not pushy, not passive.`,

  voice_and_tone: `You are helping a business consultant write the "Voice & Tone" section of their AI sales agent playbook.

This defines how the agent should sound. It's the personality guide.
Include: overall tone, words to use, words to avoid, examples of good responses, and what to stay away from.
Think about the company's brand voice — is it warm? Direct? Technical? Empathetic?`,

  guardrails: `You are helping a business consultant write the "Guardrails" section of their AI sales agent playbook.

These are hard limits — things the agent should NEVER say, promise, or commit to.
Common guardrails: specific pricing, guarantees, competitor comparisons, out-of-scope services.
List them clearly. These protect the business from the agent going off-rails.`,
};

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

  // Verify agent ownership
  const { data: agent } = await supabase
    .from('agents')
    .select('id, internal_name, display_name')
    .eq('id', id)
    .eq('host_id', host.id)
    .maybeSingle();

  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const { section_key, current_content, context: additionalContext } = body;

  if (!section_key) {
    return NextResponse.json({ error: 'section_key required' }, { status: 400 });
  }

  const sectionPrompt = SECTION_PROMPTS[section_key];
  if (!sectionPrompt) {
    return NextResponse.json({ error: `Unknown section: ${section_key}` }, { status: 400 });
  }

  const userMessage = [
    `Company: ${host.company_name}`,
    `Agent name: ${agent.display_name}`,
    additionalContext ? `Additional context: ${additionalContext}` : '',
    current_content ? `Current draft (improve this):\n${current_content}` : 'Write this section from scratch.',
  ].filter(Boolean).join('\n\n');

  try {
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: sectionPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(chunk.delta.text));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new NextResponse(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    console.error('[playbook/assist] Anthropic error:', err);
    return NextResponse.json({ error: 'AI assist unavailable. Please try again.' }, { status: 500 });
  }
}
