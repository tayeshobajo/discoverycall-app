/**
 * Redis compatibility shim — all functionality now backed by Supabase.
 * Upstash Redis dependency removed. No UPSTASH_* env vars needed.
 *
 * Re-exports everything from the purpose-built Supabase modules.
 */

export { rateLimiters, checkRateLimit } from '@/lib/rate-limit';
export {
  getMonthConversations,
  checkConversationCap,
} from '@/lib/conversations/counter';
export {
  getCachedPlaybook,
  setCachedPlaybook,
  invalidatePlaybookCache,
} from '@/lib/playbook/cache';
