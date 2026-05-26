/**
 * Haiku extraction pipeline — runs after every Sonnet response.
 * Background, non-blocking. Never delays the visitor response.
 *
 * Extracts: name, email, phone, company, intent signals, pain points, budget signals, timeline
 * Scores lead: 0-100 based on signals captured
 * Updates visitors table with extracted fields
 * Triggers report checks after each extraction
 *
 * Retry: retryCount parameter (not isRetry flag), max 3, exponential backoff (1s, 2s, 4s)
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { EXTRACTION_SYSTEM_PROMPT } from './system-prompt';
import { mergeProfileUpdates, updateVisitorProfile } from './visitor';
import { shouldSummarize } from './history';
import { regenerateHistorySummary } from './summarize';
import { sendReport } from '@/lib/email/reports';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ExtractionResult {
  profile_updates: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    role?: string | null;
    problem?: string | null;
    budget_signal?: string | null;
    urgency_signal?: string | null;
    decision_authority?: string | null;
  };
  intent_score: number;
  intent_reasoning: string;
  recommended_action: 'book_call' | 'send_resource' | 'continue_discovery' | 'nurture' | 'human_handoff';
}

/**
 * Build the extraction prompt from recent messages + current visitor context.
 */
function buildExtractionPrompt(
  messages: Array<{ role: string; content: string }>,
  visitor: Database['public']['Tables']['visitors']['Row']
): string {
  const transcript = messages
    .map((m) => `${m.role === 'visitor' ? 'Visitor' : 'Agent'}: ${m.content}`)
    .join('\n\n');

  const knownContext = [
    visitor.name ? `Known name: ${visitor.name}` : null,
    visitor.email ? `Known email: ${visitor.email}` : null,
    visitor.company ? `Known company: ${visitor.company}` : null,
    visitor.problem ? `Known problem: ${visitor.problem}` : null,
    visitor.current_intent_score > 0
      ? `Previous intent score: ${visitor.current_intent_score}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  return `${knownContext ? `EXISTING VISITOR CONTEXT:\n${knownContext}\n\n` : ''}RECENT CONVERSATION:\n\n${transcript}\n\nExtract signals from the recent conversation. Update the profile with any newly revealed information. Score intent based on the full picture.`;
}

/**
 * Main extraction pipeline.
 * Called after every Sonnet response completes (fire-and-forget from the chat API).
 */
export async function extractAndScore(
  conversationId: string,
  retryCount: number = 0
): Promise<void> {
  try {
    // Load conversation + visitor
    const { data: conversation } = await supabase
      .from('conversations')
      .select(`
        id,
        visitor_id,
        host_id,
        message_count,
        intent_score,
        visitors (*)
      `)
      .eq('id', conversationId)
      .single();

    if (!conversation) {
      console.error('[extract] Conversation not found:', conversationId);
      return;
    }

    const visitor = (conversation as unknown as { visitors: Database['public']['Tables']['visitors']['Row'] }).visitors;
    if (!visitor) {
      console.error('[extract] Visitor not found for conversation:', conversationId);
      return;
    }

    // Get last 6 messages (3 turns) for focused extraction
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .not('role', 'eq', 'system')
      .order('created_at', { ascending: false })
      .limit(6);

    if (!recentMessages || recentMessages.length === 0) return;

    const messagesForExtraction = [...recentMessages].reverse();

    // Call Haiku
    const result = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildExtractionPrompt(messagesForExtraction, visitor),
        },
      ],
    });

    const content = result.content[0];
    if (content.type !== 'text') return;

    let extracted: ExtractionResult;
    try {
      extracted = JSON.parse(content.text);
    } catch {
      console.error('[extract] Failed to parse extraction result:', content.text);
      return;
    }

    // Validate extracted data
    if (
      typeof extracted.intent_score !== 'number' ||
      !extracted.intent_reasoning ||
      !extracted.recommended_action
    ) {
      console.error('[extract] Invalid extraction result structure');
      return;
    }

    // Merge profile updates (never overwrite known fields with null)
    const mergedUpdates = mergeProfileUpdates(visitor, extracted.profile_updates || {});

    // Update visitor profile
    if (Object.keys(mergedUpdates).length > 0) {
      await updateVisitorProfile(visitor.id, {
        ...mergedUpdates,
        current_intent_score: extracted.intent_score,
        current_intent_reasoning: extracted.intent_reasoning,
      });
    } else {
      await updateVisitorProfile(visitor.id, {
        current_intent_score: extracted.intent_score,
        current_intent_reasoning: extracted.intent_reasoning,
      });
    }

    // Update conversation
    await supabase
      .from('conversations')
      .update({
        intent_score: extracted.intent_score,
        intent_reasoning: extracted.intent_reasoning,
        recommended_action: extracted.recommended_action,
      })
      .eq('id', conversationId);

    // Check report triggers
    await checkReportTriggers(conversationId, conversation.host_id, extracted, visitor, conversation);

    // Summarization trigger: fires at message 40, then every 20 (60, 80...)
    const currentCount = conversation.message_count;
    if (shouldSummarize(currentCount)) {
      // Fire-and-forget — don't await
      regenerateHistorySummary(conversationId).catch((err) => {
        console.error('[extract] Summarization failed:', err);
      });
    }
  } catch (err) {
    if (retryCount < 3) {
      const backoffMs = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
      await new Promise((r) => setTimeout(r, backoffMs));
      return extractAndScore(conversationId, retryCount + 1).catch((retryErr) => {
        console.error(
          `[extract] Retry ${retryCount + 1} failed for ${conversationId}:`,
          retryErr
        );
      });
    }
    console.error(
      `[extract] Exhausted retries for ${conversationId}:`,
      err
    );
  }
}

/**
 * Check whether any report triggers are met after an extraction.
 * Hot lead: intent >= 70 AND email captured.
 * Long conversation: handled by duration/message count checks elsewhere.
 */
async function checkReportTriggers(
  conversationId: string,
  hostId: string,
  extracted: ExtractionResult,
  visitor: Database['public']['Tables']['visitors']['Row'],
  conversation: Database['public']['Tables']['conversations']['Row']
): Promise<void> {
  // Hot lead: intent >= 70 AND email captured
  const hasEmail = !!visitor.email || !!extracted.profile_updates?.email;
  if (extracted.intent_score >= 70 && hasEmail) {
    await sendReportIfNotSent(conversationId, hostId, 'hot_lead');
  }

  // Long conversation: 50+ messages
  if (conversation.message_count >= 50) {
    await sendReportIfNotSent(conversationId, hostId, 'long_conversation');
  }

  // Long conversation: 30+ minutes duration
  const durationMinutes = (Date.now() - new Date(conversation.started_at).getTime()) / 60000;
  if (durationMinutes >= 30) {
    await sendReportIfNotSent(conversationId, hostId, 'long_conversation');
  }
}

/**
 * Send a report if it hasn't been sent yet for this conversation + type.
 * Idempotency via the events table.
 */
async function sendReportIfNotSent(
  conversationId: string,
  hostId: string,
  type: 'hot_lead' | 'completed' | 'long_conversation'
): Promise<void> {
  const eventType = `report_sent_${type}`;

  // Idempotency check
  const { data: existing } = await supabase
    .from('events')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('event_type', eventType)
    .limit(1)
    .maybeSingle();

  if (existing) return;

  // Send via Resend — sendReport handles idempotency internally as well
  await sendReport(conversationId, type);
}

/**
 * Queue extraction as a fire-and-forget background job.
 * Exported for use from the chat API route.
 */
export function queueExtractionJob(conversationId: string): void {
  // Run async without blocking. Errors are caught internally.
  extractAndScore(conversationId, 0).catch((err) => {
    console.error('[extract] Background job failed:', conversationId, err);
  });
}
