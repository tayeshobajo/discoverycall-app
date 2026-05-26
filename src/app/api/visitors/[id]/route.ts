/**
 * PATCH /api/visitors/[id]
 * Update visitor profile fields (manual override from dashboard).
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

  // Verify visitor belongs to this host
  const { data: visitor } = await supabase
    .from('visitors')
    .select('id, host_id')
    .eq('id', id)
    .eq('host_id', host.id)
    .maybeSingle();

  if (!visitor) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json();

  // Only allow updating specific visitor fields
  const allowedFields = ['name', 'email', 'phone', 'company', 'role', 'problem',
    'budget_signal', 'urgency_signal', 'decision_authority', 'custom_fields'];
  
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('visitors')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, visitor: data });
}
