/**
 * POST /api/agents/[id]/playbook/create
 * Creates a Google Doc for this agent using completed_sections.
 * Stores doc ID in agents.google_doc_id and sets status = 'ready'.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createPlaybookDoc, CompletedSection } from '@/lib/google/docs';
import { invalidatePlaybookCache } from '@/lib/playbook/cache';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: host } = await supabase
    .from('hosts')
    .select('id, company_name, google_auth_status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!host) return NextResponse.json({ error: 'Host not found' }, { status: 404 });

  if (host.google_auth_status !== 'connected') {
    return NextResponse.json(
      { error: 'Google account not connected. Connect Google first.', code: 'GOOGLE_NOT_CONNECTED' },
      { status: 400 }
    );
  }

  // Verify agent ownership
  const { data: agent } = await supabase
    .from('agents')
    .select('id, status, completed_sections, google_doc_id')
    .eq('id', id)
    .eq('host_id', host.id)
    .maybeSingle();

  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

  if (agent.google_doc_id) {
    return NextResponse.json(
      { error: 'Playbook doc already exists', google_doc_id: agent.google_doc_id },
      { status: 400 }
    );
  }

  // Parse completed sections from request body (overrides stored sections if provided)
  const body = await request.json().catch(() => ({}));
  const sectionsFromBody: CompletedSection[] | null = body.sections ?? null;

  const completedSections: CompletedSection[] = sectionsFromBody ??
    ((agent.completed_sections as unknown as CompletedSection[]) ?? []);

  if (!completedSections || completedSections.length === 0) {
    return NextResponse.json(
      { error: 'No sections to write. Complete at least one playbook section first.' },
      { status: 400 }
    );
  }

  // Set status to 'building' while we create the doc
  const supabaseAdmin = await createServiceClient();
  await supabaseAdmin
    .from('agents')
    .update({ status: 'building' })
    .eq('id', id);

  try {
    const { documentId, revisionId } = await createPlaybookDoc(
      id,
      host.company_name,
      completedSections
    );

    // Update agent with doc info and set to ready
    await supabaseAdmin
      .from('agents')
      .update({
        google_doc_id: documentId,
        doc_version: revisionId,
        status: 'ready',
        completed_sections: completedSections,
      })
      .eq('id', id);

    invalidatePlaybookCache(id);

    return NextResponse.json({
      success: true,
      google_doc_id: documentId,
      doc_version: revisionId,
    });
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : 'Unknown error';

    // Agent status was already reset to 'building' in createPlaybookDoc on failure
    // Ensure it's set correctly
    await supabaseAdmin
      .from('agents')
      .update({ status: 'building' })
      .eq('id', id);

    return NextResponse.json(
      {
        error: "We couldn't save your playbook to Google Docs. Please try again.",
        details: errMessage,
      },
      { status: 500 }
    );
  }
}
