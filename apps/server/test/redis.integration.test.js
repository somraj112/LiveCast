import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient } from 'redis';
import { randomUUID } from 'node:crypto';
import { createStore } from '../src/infrastructure/store.js';

// Never flush Redis or use an existing app database. CI reserves database 15.
describe.skipIf(!process.env.TEST_REDIS_URL)('real Redis infrastructure', () => {
  let client, first, second;
  beforeAll(async () => {
    const url = new URL(process.env.TEST_REDIS_URL);
    if (url.pathname !== '/15') throw new Error('TEST_REDIS_URL must select isolated Redis database /15');
    client = createClient({ url: url.toString() });
    client.on('error', () => {});
    await client.connect();
    first = createStore(client);
    second = createStore(client);
  });
  afterAll(async () => { if (client?.isOpen) await client.quit(); });
  it('atomically enforces a limit shared by separate callers and expires it', async () => {
    const identity = randomUUID();
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => (i % 2 ? first : second).consume('integration', identity, 5, 60000)));
    expect(results.filter((r) => r.allowed)).toHaveLength(5);
    await first.consume('expiry', identity, 1, 100);
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect((await first.consume('expiry', identity, 1, 100)).allowed).toBe(true);
  });
  it('deduplicates viewers, removes leaves, and prunes expired leases', async () => {
    const stream = randomUUID();
    await first.touch(stream, 'creator', 'c');
    await first.touch(stream, 'viewer', 'a');
    await second.touch(stream, 'viewer', 'b');
    expect(await second.count(stream, 'creator')).toBe(1);
    await first.leave(stream, 'viewer', 'a');
    expect(await second.count(stream, 'creator')).toBe(1);
    const future = createStore(client, () => Date.now() + 46000);
    expect(await future.count(stream, 'creator')).toBe(0);
    await first.clearStream(stream);
  });
  it('caches public metadata for its TTL and reloads after expiry', async () => {
    const key = `integration:${randomUUID()}`;
    let loads = 0;
    const load = async () => ({ loads: ++loads });
    expect(await first.cached(key, 1, load)).toEqual({ loads: 1 });
    expect(await second.cached(key, 1, load)).toEqual({ loads: 1 });
    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect(await second.cached(key, 1, load)).toEqual({ loads: 2 });
  });
  it('keeps uncached public metadata available when Redis fails, but rejects rate-limit and presence operations', async () => {
    const dead = createClient({ url: process.env.TEST_REDIS_URL });
    dead.on('error', () => {});
    await dead.connect();
    const store = createStore(dead);
    dead.destroy();
    expect(await store.cached('failed-cache', 60, async () => ['category'])).toEqual(['category']);
    await expect(store.consume('test', 'id', 1, 100)).rejects.toThrow();
    await expect(store.touch('stream', 'user', 'socket')).rejects.toThrow();
  });
});
