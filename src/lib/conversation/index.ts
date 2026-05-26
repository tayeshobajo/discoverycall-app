/**
 * Conversation management — core helpers for the chat API.
 *
 * getOrCreateConversation() — resume rule: same agent + same visitor + last_message_at < 30min
 * handleConversationError() — marks conversation as error, streams fallback
 * paymentRequired() — SSE stream with "unavailable" message
 * capReached() — SSE stream with "unavailable" message
 * streamSingleMessage() — shared SSE formatter for system messages
 * maybeNotify* — idempotent notification helpers
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============ SSE HELPERS ============

/**
 * Format a single SSE event line.
 */
export function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

/**
 * Stream a single message as SSE.
 * Used for payment_required, cap_reached, and fallback responses.
 * Returns 200 (not 402) so the widget renders it as a normal agent message.
 */
export function streamSingleMessage(text: string, extraData?: Record<string, unknown>): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Stream tokens for the message
      controller.enqueue(
        encoder.encode(sseEvent({ type: 'token', content: text }))
      );
      // Done event
      controller.enqueue(
        encoder.encode(sseEvent({ type: 'done', ...extraData }))
      );
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

// ============ CONVERSATION HELPERS ============

export interface GetOrCreateResult {
  conversation: Database['public']['Tables']['conversations']['Row'];
  isNew: boolean;
}

/**
 * Get or create a conversation.
 *
 * Resume rule: same agent + same visitor + last_message_at within 30 minutes = same conversation.
 * Returns { conversation, isNew } so the caller can increment the Starter monthly counter.
 */
export async function getOrCreateConversation(
  agentId: string,
  hostId: string,
  visitorId: string,
  sourcePageUrl: string | null
): Promise<GetOrCreateResult> {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  // Check for a recent conversation to resume
  const { data: recent } = await supabase
    .from('conversations')
    .select('*')
    .eq('agent_id', agentId)
    .eq('visitor_id', visitorId)
    .in('status', ['active', 'idle'])
    .gte('last_message_at', thirtyMinutesAgo)
    .order('last_message_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recent) {
    // Resume — update source_page_url if changed (page navigation tracking)
    if (recent.source_page_url !== sourcePageUrl) {
      await supabase
        .from('conversations')
        .update({
          source_page_url: sourcePageUrl,
          status: 'active',
        })
        .eq('id', recent.id);
    }
    return { conversation: recent, isNew: false };
  }

  // Create new conversation
  const { data: conversation, error } = await supabase
    .from('conversations')
    .insert({
      agent_id: agentId,
      host_id: hostId,
      visitor_id: visitorId,
      source_page_url: sourcePageUrl,
      status: 'active',
      intent_score: 0,
      message_count: 0,
      host_action_status: 'new',
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to create conversation: ${error.message}`);
  }

  return { conversation, isNew: true };
}

// ============ ERROR HANDLING ============

/**
 * Handle a conversation flow error.
 * Marks the conversation as errored, logs to console (Sentry in production),
 * and streams a graceful fallback message to the visitor.
 *
 * Returns 200 (not 500) so the widget renders the fallback message gracefully.
 * This function only fires for errors BEFORE streaming has started.
 */
export async function handleConversationError(
  err: unknown,
  conversationId: string
): Promise<Response> {
  // Mark conversation as errored
  await supabase
    .from('conversations')
    .update({ status: 'error' })
    .eq('id', conversationId)
    .catch(() => {}); // Don't let cleanup failure mask the original error

  // Log with context
  const errorMessage = err instanceof Error ? err.message : String(err);
  console.error('[conversation] Error in conversation flow:', {
    conversationId,
    error: errorMessage,
    error_type: 'conversation_flow',
  });

  // Stream fallback message via SSE
  const fallbackMessage =
    "I'm having trouble responding right now. If you leave your email below, we'll reach out as soon as we're back online.";

  return streamSingleMessage(fallbackMessage);
}

// ============ PAYMENT / CAP RESPONSES ============

/**
 * Return SSE stream with payment required message.
 * Also notifies the host (idempotent).
 */
export async function paymentRequired(
  host: Database['public']['Tables']['hosts']['Row']
): Promise<Response> {
  // Notify host (idempotent — only first widget hit after expiry sends)
  await maybeNotifyTrialExpiredOnWidgetHit(host).catch(() => {});

  return streamSingleMessage(
    'This agent is currently unavailable. The owner has been notified.',
    { reason: 'payment_required' }
  );
}

/**
 * Return SSE stream with cap reached message.
 * The 100% notification was already fired in handleChatMessage Step 4b.
 */
export async function capReached(): Promise<Response> {
  return streamSingleMessage(
    'This agent is currently unavailable. The owner has been notified.',
    { reason: 'cap_reached' }
  );
}

// ============ IDEMPOTENT NOTIFICATIONS ============

/**
 * Get the current billing period start for a host.
 * For trial hosts: use start of current month.
 * For Stripe hosts: use subscription period start.
 */
export async function getCurrentBillingPeriodStart(
  host: Database['public']['Tables']['hosts']['Row']
): Promise<Date> {
  // For trial hosts or hosts without Stripe subscription, use start of current month
  if (!host.stripe_subscription_id) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  // TODO: get period_start from Stripe subscription
  // For now, use start of current month as fallback
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

async function maybeNotifyTrialExpiredOnWidgetHit(
  host: Database['public']['Tables']['hosts']['Row']
): Promise<void> {
  const eventType = 'trial_expired_widget_hit_notified';

  const { data: existing } = await supabase
    .from('events')
    .select('id')
    .eq('host_id', host.id)
    .eq('event_type', eventType)
    .limit(1)
    .maybeSingle();

  if (existing) return;

  // TODO Sprint 4: send trial expired email via Resend
  console.log(`[notify] Trial expired widget hit for host ${host.id}`);

  await supabase.from('events').insert({
    host_id: host.id,
    event_type: eventType,
    event_data: {
      triggered_at: new Date().toISOString(),
      host_plan: host.plan,
    },
  });
}

export async function maybeNotifyStarterCapApproaching(
  host: Database['public']['Tables']['hosts']['Row'],
  currentCount: number
): Promise<void> {
  const periodStart = await getCurrentBillingPeriodStart(host);
  const eventType = 'starter_cap_approaching_notified';

  const { data: existing } = await supabase
    .from('events')
    .select('id')
    .eq('host_id', host.id)
    .eq('event_type', eventType)
    .gte('created_at', periodStart.toISOString())
    .limit(1)
    .maybeSingle();

  if (existing) return;

  // TODO Sprint 4: send cap approaching email via Resend
  console.log(`[notify] Starter cap approaching for host ${host.id}: ${currentCount}/200`);

  await supabase.from('events').insert({
    host_id: host.id,
    event_type: eventType,
    event_data: {
      period_start: periodStart.toISOString(),
      count_at_trigger: currentCount,
    },
  });
}

export async function maybeNotifyStarterCapReached(
  host: Database['public']['Tables']['hosts']['Row']
): Promise<void> {
  const periodStart = await getCurrentBillingPeriodStart(host);
  const eventType = 'starter_cap_reached_notified';

  const { data: existing } = await supabase
    .from('events')
    .select('id')
    .eq('host_id', host.id)
    .eq('event_type', eventType)
    .gte('created_at', periodStart.toISOString())
    .limit(1)
    .maybeSingle();

  if (existing) return;

  // TODO Sprint 4: send cap reached email via Resend
  console.log(`[notify] Starter cap reached for host ${host.id}`);

  await supabase.from('events').insert({
    host_id: host.id,
    event_type: eventType,
    event_data: { period_start: periodStart.toISOString() },
  });
}

// ============ CONVERSATION COMPLETION ============

/**
 * Mark a conversation as completed.
 * Called from the Beacon API endpoint when a visitor closes the widget.
 */
export async function markConversationCompleted(
  conversationId: string,
  reason: 'close' | 'unload' | 'idle'
): Promise<void> {
  await supabase
    .from('conversations')
    .update({
      status: 'completed',
      ended_at: new Date().toISOString(),
    })
    .eq('id', conversationId)
    .in('status', ['active', 'idle']); // Only complete if not already errored/abandoned

  // Queue completed report (Sprint 4 will implement the actual email)
  // For now, log the event
  const { data: conversation } = await supabase
    .from('conversations')
    .select('host_id')
    .eq('id', conversationId)
    .single();

  if (conversation) {
    // Send completed report — sendReport handles idempotency
    const { sendReport } = await import('@/lib/email/reports');
    sendReport(conversationId, 'completed').catch((err) => {
      console.error('[markConversationCompleted] Report send failed:', err);
    });
  }
}
