/**
 * GET  /api/agents/[id]/playbook — fetch & parse the agent's playbook from Google Docs
 * POST /api/agents/[id]/playbook — save sections back to Google Doc
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { fetchAndParseDoc, writePlaybookToDoc, CompletedSection } from '@/lib/google/docs';
import { getCachedPlaybook, setCachedPlaybook } from '@/lib/playbook/cache';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: host } = await supabase
    .from('hosts')
    .select('id, google_auth_status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!host) return NextResponse.json({ error: 'Host not found' }, { status: 404 });

  const { data: agent } = await supabase
    .from('agents')
    .select('id, google_doc_id, parsed_content, completed_sections, last_fetched_at')
    .eq('id', id)
    .eq('host_id', host.id)
    .maybeSingle();

  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

  // If no Google Doc, return sections from parsed_content (Quick Start draft) or empty
  if (!agent.google_doc_id) {
    return NextResponse.json({
      source: 'local',
      playbook: agent.parsed_content ?? {},
      sections: agent.completed_sections ?? [],
    });
  }

  // Check in-memory cache first
  const cacheKey = id;
  const cached = getCachedPlaybook(cacheKey);
  if (cached) {
    return NextResponse.json({ source: 'cache', playbook: JSON.parse(cached) });
  }

  try {
    const { playbook, revisionId } = await fetchAndParseDoc(id, agent.google_doc_id);

    // Cache the result
    setCachedPlaybook(cacheKey, JSON.stringify(playbook));

    // Persist to DB
    const supabaseAdmin = await createServiceClient();
    await supabaseAdmin
      .from('agents')
      .update({
        parsed_content: playbook as Record<string, unknown>,
        last_fetched_at: new Date().toISOString(),
        doc_version: revisionId,
      })
      .eq('id', id);

    return NextResponse.json({ source: 'google', playbook });
  } catch (err) {
    console.error('[playbook/GET] Failed to fetch from Google:', err);

    // Fall back to cached parsed_content in DB
    if (agent.parsed_content) {
      return NextResponse.json({
        source: 'fallback',
        playbook: agent.parsed_content,
        error: 'Using cached version — Google Docs temporarily unavailable',
      });
    }

    return NextResponse.json(
      { error: "We're having a brief issue loading your playbook. Please try again in a moment." },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: host } = await supabase
    .from('hosts')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!host) return NextResponse.json({ error: 'Host not found' }, { status: 404 });

  const { data: agent } = await supabase
    .from('agents')
    .select('id, google_doc_id, completed_sections')
    .eq('id', id)
    .eq('host_id', host.id)
    .maybeSingle();

  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  if (!agent.google_doc_id) {
    return NextResponse.json(
      { error: 'No Google Doc linked to this agent. Create the playbook doc first.' },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const sections: CompletedSection[] = body.sections;

  if (!sections || !Array.isArray(sections)) {
    return NextResponse.json({ error: 'sections array required' }, { status: 400 });
  }

  try {
    await writePlaybookToDoc(id, agent.google_doc_id, sections);

    // Update completed_sections and clear cache
    const supabaseAdmin = await createServiceClient();
    await supabaseAdmin
      .from('agents')
      .update({ completed_sections: sections })
      .eq('id', id);

    // Invalidate cache so next GET fetches fresh
    const { invalidatePlaybookCache } = await import('@/lib/playbook/cache');
    invalidatePlaybookCache(id);

    return NextResponse.json({ success: true });
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[playbook/POST] Write failed:', errMessage);
    return NextResponse.json(
      { error: 'Failed to save to Google Docs. Please try again.', details: errMessage },
      { status: 500 }
    );
  }
}
