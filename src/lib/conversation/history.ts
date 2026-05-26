/**
 * Conversation history — load and format message history for Sonnet.
 *
 * Base case (≤20 messages): All messages verbatim.
 * Medium case (21-40): Last 20 messages verbatim.
 * Long case (>40): history_summary prepended + last 20 verbatim.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Load and format conversation history for Sonnet.
 * Returns messages in Anthropic format with role mapping:
 *   visitor → user
 *   agent → assistant
 *   system messages are excluded from the context window
 *
 * NOTE: history_summary is injected into the system prompt separately
 * via buildSystemPrompt() — not here. This function only returns the
 * message array for the `messages` param.
 */
export async function loadConversationHistory(
  conversationId: string
): Promise<AnthropicMessage[]> {
  const { data: messages, error } = await supabase
    .from('messages')
    .select('role, content, created_at')
    .eq('conversation_id', conversationId)
    .not('role', 'eq', 'system') // exclude system messages from context
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[history] Failed to load messages:', error.message);
    return [];
  }

  if (!messages || messages.length === 0) return [];

  // Reverse to chronological order (we fetched desc, limit 20 = last 20)
  return messages
    .reverse()
    .map((m) => ({
      role: m.role === 'visitor' ? 'user' : 'assistant',
      content: m.content,
    })) as AnthropicMessage[];
}

/**
 * Get the full message list for summarization (all messages).
 * Used by the summarization job to generate history_summary.
 */
export async function loadAllMessages(
  conversationId: string,
  excludeLastN: number = 20
): Promise<Array<{ role: string; content: string; created_at: string }>> {
  // Get total count first
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .not('role', 'eq', 'system');

  if (!count || count <= excludeLastN) return [];

  // Get all messages except the last N (those go verbatim)
  const { data, error } = await supabase
    .from('messages')
    .select('role, content, created_at')
    .eq('conversation_id', conversationId)
    .not('role', 'eq', 'system')
    .order('created_at', { ascending: true })
    .limit(count - excludeLastN);

  if (error) {
    console.error('[history] Failed to load all messages:', error.message);
    return [];
  }

  return data ?? [];
}

/**
 * Check if the message count is at a summarization threshold.
 * Fires at 40, then every 20 (60, 80, 100...).
 */
export function shouldSummarize(messageCount: number): boolean {
  return messageCount >= 40 && messageCount % 20 === 0;
}
