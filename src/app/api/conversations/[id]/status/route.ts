/**
 * PATCH /api/conversations/[id]/status
 * Update lead status for a conversation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: host } = await supabase
    .from('hosts')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!host) return NextResponse.json({ error: 'Host not found' }, { status: 404 });

  const body = await request.json();
  const { status } = body;

  const validStatuses = ['new', 'contacted', 'booked', 'dismissed'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  // Verify the conversation belongs to this host
  const { data: conv } = await supabase
    .from('conversations')
    .select('id, host_id')
    .eq('id', id)
    .eq('host_id', host.id)
    .maybeSingle();

  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { error } = await supabase
    .from('conversations')
    .update({ host_action_status: status })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log the action
  await supabase.from('lead_actions').insert({
    host_id: host.id,
    conversation_id: id,
    user_id: user.id,
    action_type: status === 'contacted' ? 'contacted' : status === 'booked' ? 'booked' : status === 'dismissed' ? 'dismissed' : 'contacted',
    notes: `Status changed to ${status}`,
  });

  return NextResponse.json({ ok: true, status });
}
