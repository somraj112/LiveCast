import { describe, expect, it, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { loadEnvironment } from '../src/config/environment.js';
import { createStore } from '../src/infrastructure/store.js';
import { rateLimit, protectCookieActions, requireMetricsToken, requestContext } from '../src/middleware/production.js';
import { errorHandler } from '../src/middleware/error.js';

const valid = () => ({ NODE_ENV: 'production', DATABASE_URL: 'postgresql://db.example.com/livecast', REDIS_URL: 'rediss://cache.example.com:6379', FRONTEND_URL: 'https://livecast.example.com', JWT_ACCESS_SECRET: 'a'.repeat(48), JWT_REFRESH_SECRET: 'b'.repeat(48), METRICS_TOKEN: 'c'.repeat(48) });

describe('startup validation', () => {
  it('accepts production configuration and bounds proxy/replica settings', () => {
    expect(loadEnvironment(valid())).toMatchObject({ production: true, port: 3001, trustProxy: 0 });
    expect(() => loadEnvironment({ ...valid(), TRUST_PROXY_HOPS: 'true', API_REPLICAS: '2' })).toThrow('API_REPLICAS');
  });
  it('rejects proxy database URLs, insecure origins, absent Redis and placeholder secrets without revealing their values', () => {
    const input = { ...valid(), DATABASE_URL: 'prisma+postgres://localhost:51213/?api_key=private-value', FRONTEND_URL: 'http://site.example', REDIS_URL: '', JWT_ACCESS_SECRET: 'replace-example-secret-that-is-long-enough' };
    let message;
    try { loadEnvironment(input); } catch (error) { message = error.message; }
    for (const field of ['DATABASE_URL', 'FRONTEND_URL', 'REDIS_URL', 'JWT_ACCESS_SECRET']) expect(message).toContain(field);
    expect(message).not.toContain('private-value');
    expect(message).not.toContain(input.JWT_ACCESS_SECRET);
  });
  it('rejects duplicate JWT secrets, partial Mux configuration and invalid TTLs', () => {
    expect(() => loadEnvironment({ ...valid(), JWT_REFRESH_SECRET: valid().JWT_ACCESS_SECRET, MUX_TOKEN_ID: 'id', ACCESS_TOKEN_TTL: '0m' })).toThrow('JWT secrets must be different');
    expect(() => loadEnvironment({ ...valid(), MUX_TOKEN_ID: 'id' })).toThrow('Configure all Mux');
    expect(() => loadEnvironment({ ...valid(), NODE_ENV: 'prodution' })).toThrow('NODE_ENV');
    expect(() => loadEnvironment({ ...valid(), MUX_SIGNING_PRIVATE_KEY: 'invalid' })).toThrow('RSA private PEM');
  });
});

describe('leased presence and bounded local rate limiting', () => {
  it('counts unique viewers across tabs, excludes the creator and expires crashed connections', async () => {
    let now = 1000;
    const store = createStore(null, () => now);
    await store.touch('stream', 'creator', 'c');
    await store.touch('stream', 'viewer', 'a');
    await store.touch('stream', 'viewer', 'b');
    expect(await store.count('stream', 'creator')).toBe(1);
    await store.leave('stream', 'viewer', 'a');
    expect(await store.count('stream', 'creator')).toBe(1);
    now += 45001;
    expect(await store.count('stream', 'creator')).toBe(0);
  });
  it('limits across callers, resets after expiry and isolates scopes', async () => {
    let now = 1000;
    const store = createStore(null, () => now);
    expect((await store.consume('login', 'ip', 1, 1000)).allowed).toBe(true);
    expect(await store.consume('login', 'ip', 1, 1000)).toMatchObject({ allowed: false, retryAfter: 1 });
    expect((await store.consume('api', 'ip', 1, 1000)).allowed).toBe(true);
    now += 1001;
    expect((await store.consume('login', 'ip', 1, 1000)).allowed).toBe(true);
  });
});

describe('HTTP operational boundaries', () => {
  let app;
  beforeEach(() => { app = express(); app.use(requestContext); });
  it('returns consistent 429 errors with Retry-After and a request ID', async () => {
    const store = createStore();
    app.get('/limited', rateLimit('test', 1, 60000, () => store), (_req, res) => res.json({ ok: true }));
    app.use(errorHandler);
    expect((await request(app).get('/limited')).status).toBe(200);
    const blocked = await request(app).get('/limited');
    expect(blocked.status).toBe(429);
    expect(blocked.headers['retry-after']).toBeDefined();
    expect(blocked.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
  });
  it('fails closed when the shared limiter fails', async () => {
    app.get('/', rateLimit('test', 1, 1000, () => ({ consume: async () => { throw new Error('redis://secret'); } })), (_req, res) => res.send('unexpected'));
    app.use(errorHandler);
    const result = await request(app).get('/');
    expect(result.status).toBe(503);
    expect(JSON.stringify(result.body)).not.toContain('secret');
  });
  it('rejects cross-site cookie operations while allowing same-origin requests', async () => {
    vi.stubEnv('FRONTEND_URL', 'https://livecast.example.com');
    app.post('/', protectCookieActions, (_req, res) => res.sendStatus(204));
    app.use(errorHandler);
    expect((await request(app).post('/').set('Origin', 'https://evil.example')).status).toBe(403);
    expect((await request(app).post('/').set('Sec-Fetch-Site', 'cross-site')).status).toBe(403);
    expect((await request(app).post('/').set('Origin', 'https://livecast.example.com')).status).toBe(204);
    vi.unstubAllEnvs();
  });
  it('requires a bearer secret for metrics, including non-ASCII inputs', async () => {
    vi.stubEnv('METRICS_TOKEN', 'metrics-test-secret');
    app.get('/', requireMetricsToken, (_req, res) => res.send('metrics'));
    expect((await request(app).get('/')).status).toBe(401);
    expect((await request(app).get('/').set('Authorization', 'Bearer metrics-test-secret')).status).toBe(200);
    expect((await request(app).get('/').set('Authorization', 'Bearer métrics-test-secre')).status).toBe(401);
    vi.unstubAllEnvs();
  });
  it('handles malformed and oversized JSON without exposing parser errors', async () => {
    app.use(express.json({ limit: '20b' }));
    app.post('/', (_req, res) => res.sendStatus(204));
    app.use(errorHandler);
    expect((await request(app).post('/').set('Content-Type', 'application/json').send('{bad')).body.error.code).toBe('INVALID_JSON');
    expect((await request(app).post('/').send({ data: 'x'.repeat(30) })).status).toBe(413);
  });
});
