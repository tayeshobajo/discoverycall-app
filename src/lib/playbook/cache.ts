/**
 * Playbook cache — lightweight in-memory cache per Vercel instance.
 * Replaces Upstash Redis for playbook caching.
 *
 * For MVP: in-memory is sufficient. If multi-instance cache coherence
 * becomes an issue at scale, swap to Supabase or a CDN cache layer.
 * TTL: 5 minutes (matches the original Redis spec).
 */

const cache = new Map<string, { value: string; expiresAt: number }>();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

export function getCachedPlaybook(agentId: string): string | null {
  const entry = cache.get(agentId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(agentId);
    return null;
  }
  return entry.value;
}

export function setCachedPlaybook(agentId: string, playbook: string): void {
  cache.set(agentId, { value: playbook, expiresAt: Date.now() + TTL_MS });
}

export function invalidatePlaybookCache(agentId: string): void {
  cache.delete(agentId);
}
