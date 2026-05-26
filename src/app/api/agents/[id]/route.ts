/**
 * GET    /api/agents/[id] — get single agent
 * PATCH  /api/agents/[id] — update agent config
 * DELETE /api/agents/[id] — soft delete (set status = 'archived')
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { invalidatePlaybookCache } from '@/lib/playbook/cache';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
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

  const { data: agent, error } = await supabase
    .from('agents')
    .select('*, agent_config(*)')
    .eq('id', id)
    .eq('host_id', host.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

  return NextResponse.json({ agent });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
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

  const body = await request.json().catch(() => ({}));

  // Separate agent fields from config fields
  const agentFields: Record<string, unknown> = {};
  const configFields: Record<string, unknown> = {};

  const agentColumns = [
    'internal_name', 'display_name', 'status', 'completed_sections', 'parsed_content',
  ];
  const configColumns = [
    'theme_color', 'theme_color_accent', 'logo_url', 'agent_avatar_url',
    'button_position', 'button_shape', 'button_size', 'pulse_animation',
    'greeting_title', 'greeting_message', 'tone_preset', 'cta_type', 'cta_url',
    'calendar_provider', 'calendar_url', 'hours_of_operation', 'contact_capture_timing',
    'show_discoverycall_branding',
  ];

  for (const [key, value] of Object.entries(body)) {
    if (agentColumns.includes(key)) agentFields[key] = value;
    else if (configColumns.includes(key)) configFields[key] = value;
  }

  const supabaseAdmin = await createServiceClient();

  // Verify ownership
  const { data: existing } = await supabase
    .from('agents')
    .select('id')
    .eq('id', id)
    .eq('host_id', host.id)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

  let updatedAgent = null;

  if (Object.keys(agentFields).length > 0) {
    const { data, error } = await supabaseAdmin
      .from('agents')
      .update(agentFields)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    updatedAgent = data;

    // Invalidate playbook cache if content changed
    if (agentFields.parsed_content) {
      invalidatePlaybookCache(id);
    }
  }

  if (Object.keys(configFields).length > 0) {
    const { error } = await supabaseAdmin
      .from('agent_config')
      .upsert({ agent_id: id, ...configFields });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!updatedAgent) {
    const { data } = await supabase.from('agents').select('*').eq('id', id).single();
    updatedAgent = data;
  }

  return NextResponse.json({ agent: updatedAgent });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
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

  const supabaseAdmin = await createServiceClient();

  // Verify ownership then soft delete
  const { data: existing } = await supabase
    .from('agents')
    .select('id')
    .eq('id', id)
    .eq('host_id', host.id)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

  const { error } = await supabaseAdmin
    .from('agents')
    .update({ status: 'archived' as const })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  invalidatePlaybookCache(id);

  return NextResponse.json({ success: true });
}
