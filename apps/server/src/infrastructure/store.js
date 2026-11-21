import { createHash } from 'node:crypto';
import { createClient } from 'redis';
import { logger } from '../config/logger.js';

const RATE_SCRIPT = `local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end; return {n,redis.call('PTTL',KEYS[1])}`;
const COUNT_SCRIPT = `redis.call('ZREMRANGEBYSCORE',KEYS[1],'-inf',ARGV[1]); local users={}; local count=0; for _,m in ipairs(redis.call('ZRANGE',KEYS[1],0,-1)) do local u=string.match(m,'^([^:]+):'); if u~=ARGV[2] and not users[u] then users[u]=true; count=count+1 end end; return count`;
const hash = (value) => createHash('sha256').update(String(value)).digest('hex');
const prefix = 'livecast:v1:';
const leaseMs = 45000;

export function createStore(client = null, now = Date.now) {
  if (client) client = client.withCommandOptions({ timeout: 2000 });
  const windows = new Map();
  const members = new Map();
  const cleanup = () => {
    for (const [key, value] of windows) if (value.expires <= now()) windows.delete(key);
    for (const [key, value] of members) if (value.expires <= now()) members.delete(key);
  };
  return {
    client,
    async ping() { if (client) await client.ping(); },
    async consume(scope, identity, limit, windowMs) {
      const key = `${prefix}rate:${scope}:${hash(identity)}`;
      let count, ttl;
      if (client) {
        [count, ttl] = await client.eval(RATE_SCRIPT, { keys: [key], arguments: [String(windowMs)] });
      } else {
        cleanup();
        const entry = windows.get(key) || { count: 0, expires: now() + windowMs };
        // Bound development-only memory usage under changing IPs/users.
        if (!windows.has(key) && windows.size >= 10000) return { allowed: false, retryAfter: 60 };
        count = ++entry.count;
        windows.set(key, entry);
        ttl = entry.expires - now();
      }
      return { allowed: Number(count) <= limit, retryAfter: Math.max(1, Math.ceil(Number(ttl) / 1000)) };
    },
    async cached(key, seconds, loader) {
      if (!client) return loader();
      const cacheKey = `${prefix}cache:${key}`;
      try { const value = await client.get(cacheKey); if (value) return JSON.parse(value); }
      catch { logger.warn('Public metadata cache unavailable'); }
      const value = await loader();
      try { await client.set(cacheKey, JSON.stringify(value), { EX: seconds }); }
      catch { logger.warn('Public metadata cache write failed'); }
      return value;
    },
    async touch(streamId, userId, socketId) {
      if (client) {
        await client.multi().zAdd(`${prefix}presence:${streamId}`, { score: now() + leaseMs, value: `${userId}:${socketId}` })
          .pExpire(`${prefix}presence:${streamId}`, leaseMs * 2).exec();
      } else members.set(`${streamId}:${socketId}`, { streamId, userId, expires: now() + leaseMs });
    },
    async leave(streamId, userId, socketId) {
      if (client) await client.zRem(`${prefix}presence:${streamId}`, `${userId}:${socketId}`);
      else members.delete(`${streamId}:${socketId}`);
    },
    async count(streamId, creatorId) {
      if (client) return Number(await client.eval(COUNT_SCRIPT, { keys: [`${prefix}presence:${streamId}`], arguments: [String(now()), creatorId] }));
      cleanup();
      return new Set([...members.values()].filter((v) => v.streamId === streamId && v.userId !== creatorId).map((v) => v.userId)).size;
    },
    async clearStream(streamId) {
      if (client) await client.del(`${prefix}presence:${streamId}`);
      else for (const [key, value] of members) if (value.streamId === streamId) members.delete(key);
    },
    async close() { if (client) client.destroy(); },
  };
}

// Tests and local development use bounded memory; production always connects Redis.
export let infrastructure = createStore();
export async function connectInfrastructure(url = process.env.REDIS_URL) {
  if (!url) {
    if (process.env.NODE_ENV === 'production') throw new Error('REDIS_URL is required');
    logger.warn('Using in-memory infrastructure for local development');
    return infrastructure;
  }
  const client = createClient({ url, disableOfflineQueue: true, commandsQueueMaxLength: 1000, socket: { connectTimeout: 3000, reconnectStrategy: (retries) => Math.min(100 * 2 ** Math.min(retries, 5), 3000) } });
  client.on('error', () => logger.error('Redis connection error'));
  // Startup must fail promptly; reconnects after startup are handled by the client.
  const timeout = setTimeout(() => { if (!client.isReady) client.destroy(); }, 5000);
  try { await client.connect(); infrastructure = createStore(client); }
  finally { clearTimeout(timeout); }
  return infrastructure;
}
