/**
 * POST /api/widget/chat
 *
 * Main conversation endpoint. SSE streaming.
 * Auth: embed token (X-Embed-Token header). Not session cookies — this is a public endpoint.
 *
 * SSE Protocol:
 *   data: {"type":"token","content":"Hello"}\n\n
 *   data: {"type":"done","conversationId":"xxx"}\n\n
 *   data: {"type":"error","message":"..."}\n\n
 *   data: {"type":"unavailable","reason":"payment_required"}\n\n
 *   data: {"type":"unavailable","reason":"cap_reached"}\n\n
 */

import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { rateLimiters } from '@/lib/rate-limit';
import { getMonthConversations } from '@/lib/conversations/counter';
import {
  getOrCreateConversation,
  handleConversationError,
  paymentRequired,
  capReached,
  maybeNotifyStarterCapApproaching,
  maybeNotifyStarterCapReached,
  sseEvent,
  getCurrentBillingPeriodStart,
} from '@/lib/conversation';
import { generateFingerprint, getClientIP, getOrCreateVisitor } from '@/lib/conversation/visitor';
import { loadConversationHistory } from '@/lib/conversation/history';
import { getCachedPlaybook, setCachedPlaybook } from '@/lib/playbook/cache';
import { buildSystemPrompt } from '@/lib/conversation/system-prompt';
import { queueExtractionJob } from '@/lib/conversation/extract';
import { incrementMonthConversations } from '@/lib/conversations/counter';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============ HELPERS ============

function getIP(req: NextRequest): string {
  return getClientIP(req as unknown as Request);
}

/**
 * Fetch agent + host in a single query.
 */
async function getAgentByEmbedToken(
  token: string
): Promise<{
  agent: Database['public']['Tables']['agents']['Row'] & {
    agent_config: Database['public']['Tables']['agent_config']['Row'] | null;
  };
  host: Database['public']['Tables']['hosts']['Row'];
} | null> {
  const { data, error } = await supabase
    .from('agents')
    .select(`
      *,
      agent_config (*),
      hosts (*)
    `)
    .eq('embed_token', token)
    .single();

  if (error || !data) return null;

  const { hosts, agent_config, ...agent } = data as unknown as {
    hosts: Database['public']['Tables']['hosts']['Row'];
    agent_config: Database['public']['Tables']['agent_config']['Row'];
    [key: string]: unknown;
  };

  return {
    agent: { ...agent, agent_config } as Database['public']['Tables']['agents']['Row'] & {
      agent_config: Database['public']['Tables']['agent_config']['Row'] | null;
    },
    host: hosts,
  };
}

/**
 * Fetch and cache playbook for an agent.
 */
async function getPlaybook(
  agentId: string,
  googleDocId: string | null,
  hostId: string
): Promise<import('@/lib/conversation/system-prompt').ParsedPlaybook> {
  // Try in-memory cache first
  const cached = getCachedPlaybook(agentId);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // Cache corrupted — fall through
    }
  }

  // Try parsed_content from DB (last known good)
  const { data: agent } = await supabase
    .from('agents')
    .select('parsed_content')
    .eq('id', agentId)
    .single();

  if (agent?.parsed_content) {
    const playbook = agent.parsed_content as import('@/lib/conversation/system-prompt').ParsedPlaybook;
    setCachedPlaybook(agentId, JSON.stringify(playbook));
    return playbook;
  }

  // No playbook available — return empty (agent will use placeholder text)
  return {};
}

// ============ ROUTE HANDLER ============

export async function POST(req: NextRequest): Promise<Response> {
  // 1. Parse and validate request
  const embedToken = req.headers.get('X-Embed-Token');
  const sourcePageUrl = req.headers.get('X-Source-Page');

  let message: string;
  let sessionId: string;

  try {
    const body = await req.json();
    message = body.message;
    sessionId = body.sessionId || req.headers.get('X-Session-Id') || '';
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  if (!embedToken || !message || !sessionId) {
    return new Response('Bad request', { status: 400 });
  }

  // Trim message
  const trimmedMessage = String(message).trim();
  if (!trimmedMessage || trimmedMessage.length > 4000) {
    return new Response('Bad request', { status: 400 });
  }

  // 2. Rate limit check (per IP + per embed token)
  const ip = getIP(req);
  const [ipLimit, tokenLimit] = await Promise.all([
    rateLimiters.widgetChatPerIp(ip),
    rateLimiters.widgetChatPerToken(embedToken),
  ]);

  if (!ipLimit.success || !tokenLimit.success) {
    return new Response('Rate limit exceeded', {
      status: 429,
      headers: {
        'Retry-After': String(
          Math.ceil(((!ipLimit.success ? ipLimit.reset : tokenLimit.reset) - Date.now()) / 1000)
        ),
      },
    });
  }

  // 3. Resolve agent + host
  const result = await getAgentByEmbedToken(embedToken);
  if (!result) {
    return new Response('Agent not found', { status: 404 });
  }

  const { agent, host } = result;

  // Check agent is active
  if (agent.status !== 'ready') {
    // Return a user-friendly SSE message rather than raw HTTP error
    const { streamSingleMessage } = await import('@/lib/conversation');
    return streamSingleMessage(
      'This agent is not currently active.'
    );
  }

  // 4. Check host status (trial / billing)
  if (
    (host.trial_status === 'expired' || host.trial_status === 'cancelled') &&
    !host.stripe_subscription_id
  ) {
    return paymentRequired(host);
  }

  // 4b. Check Starter conversation cap
  if (host.plan === 'starter') {
    const periodStart = await getCurrentBillingPeriodStart(host);
    const count = await getMonthConversations(host.id, periodStart);

    if (count >= 200) {
      await maybeNotifyStarterCapReached(host);
      return capReached();
    }

    if (count >= 160 && count < 200) {
      // Fire nudge (non-blocking) — does NOT block the conversation
      maybeNotifyStarterCapApproaching(host, count).catch(() => {});
    }
  }

  // 5. Get or create visitor (host-scoped fingerprint)
  const userAgent = req.headers.get('user-agent') || '';
  const fingerprint = generateFingerprint(ip, userAgent);
  const visitor = await getOrCreateVisitor(host.id, fingerprint);

  // 6. Get or create conversation
  const { conversation, isNew } = await getOrCreateConversation(
    agent.id,
    host.id,
    visitor.id,
    sourcePageUrl
  );

  // 6b. Increment Starter counter for new conversations only
  if (isNew && host.plan === 'starter') {
    incrementMonthConversations(host.id).catch(() => {});
  }

  // 7. Persist visitor message
  const { error: msgError } = await supabase.from('messages').insert({
    conversation_id: conversation.id,
    role: 'visitor',
    content: trimmedMessage,
    metadata: null,
  });

  if (msgError) {
    console.error('[chat] Failed to save visitor message:', msgError.message);
    return handleConversationError(new Error(msgError.message), conversation.id);
  }

  // 8. Load context for Sonnet
  const [messageHistory, playbook] = await Promise.all([
    loadConversationHistory(conversation.id),
    getPlaybook(agent.id, agent.google_doc_id, host.id),
  ]);

  // Get agent config (already joined above)
  const agentConfig = agent.agent_config;
  const tonePreset = (agentConfig?.tone_preset ?? 'warm') as 'warm' | 'direct' | 'spirit_first' | 'custom';

  // 9. Build system prompt
  const systemPrompt = buildSystemPrompt({
    playbook,
    tonePreset,
    agentDisplayName: agent.display_name,
    companyName: host.company_name,
    visitorProfile: {
      name: visitor.name,
      email: visitor.email,
      phone: visitor.phone,
      company: visitor.company,
      role: visitor.role,
      problem: visitor.problem,
      budget_signal: visitor.budget_signal,
      urgency_signal: visitor.urgency_signal,
      decision_authority: visitor.decision_authority,
      current_intent_score: visitor.current_intent_score,
    },
    historySummary: conversation.history_summary,
  });

  // 10. Stream Sonnet response
  const encoder = new TextEncoder();
  const conversationId = conversation.id;
  let fullResponse = '';
  const startTime = Date.now();

  try {
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messageHistory,
    });

    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              const text = chunk.delta.text;
              fullResponse += text;
              // SSE token event
              controller.enqueue(
                encoder.encode(sseEvent({ type: 'token', content: text }))
              );
            }
          }

          // Get usage from the final message
          const finalMessage = await stream.finalMessage();
          const latencyMs = Date.now() - startTime;

          // SSE done event
          controller.enqueue(
            encoder.encode(
              sseEvent({
                type: 'done',
                conversationId,
              })
            )
          );
          controller.close();

          // 11. Persist agent response
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            role: 'agent',
            content: fullResponse,
            metadata: {
              model: 'claude-sonnet-4-6',
              input_tokens: finalMessage.usage?.input_tokens,
              output_tokens: finalMessage.usage?.output_tokens,
              latency_ms: latencyMs,
              stop_reason: finalMessage.stop_reason,
              tool_calls: [],
            },
          });

          // 12. Fire-and-forget extraction job (background, non-blocking)
          queueExtractionJob(conversationId);
        } catch (streamErr) {
          console.error('[chat] Stream error mid-response:', streamErr);

          // Notify client of error
          try {
            controller.enqueue(
              encoder.encode(
                sseEvent({
                  type: 'error',
                  message: 'Connection interrupted. Please try again.',
                })
              )
            );
          } catch {
            // Controller may already be closed
          }
          controller.close();

          // Mark conversation as errored
          await supabase
            .from('conversations')
            .update({ status: 'error' })
            .eq('id', conversationId)
            .catch(() => {});
        }
      },
    });

    return new Response(responseStream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
        // CORS: allow any origin (embed runs on customer sites)
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-Embed-Token, X-Session-Id, X-Source-Page',
      },
    });
  } catch (err) {
    return handleConversationError(err, conversationId);
  }
}

// Handle CORS preflight
export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, X-Embed-Token, X-Session-Id, X-Source-Page',
      'Access-Control-Max-Age': '86400',
    },
  });
}
