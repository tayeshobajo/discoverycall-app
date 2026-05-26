/**
 * History summarization — Haiku-powered rolling summary.
 *
 * Fires at message 40 (first threshold), then every 20 (60, 80, 100...).
 * Generates a summary of messages 1 through N-20.
 * Stored in conversations.history_summary.
 * Prepended to system prompt context when building message history for long conversations.
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { SUMMARIZATION_SYSTEM_PROMPT } from './system-prompt';
import { loadAllMessages } from './history';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Regenerate the history_summary for a conversation.
 * Summarizes all messages except the last 20 (which go verbatim to Sonnet).
 */
export async function regenerateHistorySummary(
  conversationId: string
): Promise<void> {
  try {
    // Load all messages except the last 20
    const messages = await loadAllMessages(conversationId, 20);

    if (messages.length === 0) {
      // Not enough history to summarize yet
      return;
    }

    const transcript = messages
      .map((m) => `${m.role === 'visitor' ? 'Visitor' : 'Agent'}: ${m.content}`)
      .join('\n\n');

    // Generate summary with Haiku
    const result = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: SUMMARIZATION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Summarize this conversation excerpt (messages 1 through ${messages.length}, before the most recent exchange):\n\n${transcript}`,
        },
      ],
    });

    const content = result.content[0];
    if (content.type !== 'text') return;

    const summary = content.text.trim();

    // Store in conversation
    await supabase
      .from('conversations')
      .update({ history_summary: summary })
      .eq('id', conversationId);

    // Save a system message for audit trail
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'system',
      content: `[History summary regenerated at ${messages.length} messages]`,
      metadata: {
        type: 'summary_refresh',
        reason: `Summarized ${messages.length} messages`,
      },
    });
  } catch (err) {
    console.error('[summarize] Failed to regenerate summary:', err);
    // Non-fatal — conversation continues without updated summary
  }
}
