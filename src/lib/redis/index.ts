import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// Redis client (lazy singleton)
let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return _redis;
}

// Rate limiters
export const rateLimiters = {
  widgetChatPerIp: new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    prefix: 'rl:widget:chat:ip',
  }),
  widgetChatPerToken: new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(1000, '1 m'),
    prefix: 'rl:widget:chat:token',
  }),
  widgetConfig: new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    prefix: 'rl:widget:config',
  }),
  authSignin: new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    prefix: 'rl:auth:signin',
  }),
  dashboardRead: new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(120, '1 m'),
    prefix: 'rl:dash:read',
  }),
  dashboardWrite: new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    prefix: 'rl:dash:write',
  }),
  quickStartFetch: new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    prefix: 'rl:quickstart:host',
  }),
};

export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{ success: boolean; reset: number; remaining: number }> {
  try {
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      reset: result.reset,
      remaining: result.remaining,
    };
  } catch (err) {
    // If Redis is unavailable, fail open (don't block requests)
    console.error('Rate limit check failed:', err);
    return { success: true, reset: Date.now() + 60000, remaining: 1 };
  }
}

// Starter conversation counter
export async function getMonthConversations(hostId: string, periodStart: Date): Promise<number> {
  const redis = getRedis();
  const key = `host:${hostId}:conv_count:${periodStart.toISOString()}`;
  
  const cached = await redis.get<number>(key);
  if (cached !== null) return cached;
  
  // Return 0 on cache miss — caller should populate from DB
  return 0;
}

export async function incrementMonthConversations(
  hostId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<number> {
  const redis = getRedis();
  const key = `host:${hostId}:conv_count:${periodStart.toISOString()}`;
  
  const newCount = await redis.incr(key);
  
  if (newCount === 1) {
    const ttlSeconds = Math.floor((periodEnd.getTime() - Date.now()) / 1000);
    if (ttlSeconds > 0) {
      await redis.expire(key, ttlSeconds);
    }
  }
  
  return newCount;
}

export async function setMonthConversations(
  hostId: string,
  periodStart: Date,
  periodEnd: Date,
  count: number
): Promise<void> {
  const redis = getRedis();
  const key = `host:${hostId}:conv_count:${periodStart.toISOString()}`;
  const ttlSeconds = Math.floor((periodEnd.getTime() - Date.now()) / 1000);
  if (ttlSeconds > 0) {
    await redis.set(key, count, { ex: ttlSeconds });
  }
}

// Playbook cache (5-min TTL)
export async function getCachedPlaybook(agentId: string): Promise<string | null> {
  return getRedis().get<string>(`playbook:${agentId}`);
}

export async function setCachedPlaybook(agentId: string, playbook: string): Promise<void> {
  await getRedis().set(`playbook:${agentId}`, playbook, { ex: 300 });
}

export async function invalidatePlaybookCache(agentId: string): Promise<void> {
  await getRedis().del(`playbook:${agentId}`);
}
