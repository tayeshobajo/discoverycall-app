/**
 * POST /api/agents — create agent
 * GET  /api/agents — list agents for host
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: host } = await supabase
    .from('hosts')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!host) return NextResponse.json({ error: 'Host not found' }, { status: 404 });

  const { data: agents, error } = await supabase
    .from('agents')
    .select('*, agent_config(*)')
    .eq('host_id', host.id)
    .neq('status', 'archived')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ agents });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { internal_name, display_name } = body;

  if (!internal_name?.trim()) {
    return NextResponse.json({ error: 'internal_name is required' }, { status: 400 });
  }

  const { data: host } = await supabase
    .from('hosts')
    .select('id, plan')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!host) return NextResponse.json({ error: 'Host not found' }, { status: 404 });

  // Plan enforcement check (application layer — DB trigger is the final guard)
  const { data: planLimits } = await supabase
    .from('plan_limits')
    .select('max_agents')
    .eq('plan', host.plan)
    .maybeSingle();

  const { count: agentCount } = await supabase
    .from('agents')
    .select('id', { count: 'exact', head: true })
    .eq('host_id', host.id)
    .neq('status', 'archived');

  const maxAgents = planLimits?.max_agents ?? 1;
  if ((agentCount ?? 0) >= maxAgents) {
    return NextResponse.json(
      {
        error: `Agent limit reached for your plan (${agentCount}/${maxAgents}). Upgrade to add more agents.`,
        code: 'AGENT_LIMIT_REACHED',
      },
      { status: 403 }
    );
  }

  // Create agent
  const supabaseAdmin = await createServiceClient();
  const { data: agent, error: agentError } = await supabaseAdmin
    .from('agents')
    .insert({
      host_id: host.id,
      internal_name: internal_name.trim(),
      display_name: (display_name ?? 'DiscoveryCall').trim(),
      status: 'draft',
      completed_sections: [],
    })
    .select()
    .single();

  if (agentError) {
    if (agentError.message.includes('Agent limit reached')) {
      return NextResponse.json({ error: 'Agent limit reached for current plan', code: 'AGENT_LIMIT_REACHED' }, { status: 403 });
    }
    return NextResponse.json({ error: agentError.message }, { status: 500 });
  }

  // Create default agent_config
  await supabaseAdmin.from('agent_config').insert({ agent_id: agent.id });

  return NextResponse.json({ agent }, { status: 201 });
}
