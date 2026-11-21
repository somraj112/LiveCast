import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const db = vi.hoisted(() => ({ $queryRaw: vi.fn() }));
const store = vi.hoisted(() => ({ ping: vi.fn() }));
vi.mock('../src/config/db.js', () => ({ default: db, prisma: db }));
vi.mock('../src/infrastructure/store.js', () => ({ infrastructure: store }));
let app;
beforeAll(async () => { ({ default: app } = await import('../src/app.js')); });
beforeEach(() => { db.$queryRaw.mockResolvedValue([{ '?column?': 1 }]); store.ping.mockResolvedValue('PONG'); });

describe('health probes and metrics', () => {
  it('keeps liveness independent from dependencies and checks both dependencies for readiness', async () => {
    expect((await request(app).get('/api/health/live')).status).toBe(200);
    expect((await request(app).get('/api/health/ready')).status).toBe(200);
    expect(db.$queryRaw).toHaveBeenCalled();
    expect(store.ping).toHaveBeenCalled();
    db.$queryRaw.mockRejectedValueOnce(new Error('private-database-url'));
    const failed = await request(app).get('/api/health/ready');
    expect(failed.status).toBe(503);
    expect(JSON.stringify(failed.body)).not.toContain('private');
    store.ping.mockRejectedValueOnce(new Error('private-redis-url'));
    expect((await request(app).get('/api/health/ready')).status).toBe(503);
    expect((await request(app).get('/api/health/live')).status).toBe(200);
  });
  it('sends security headers and exposes metrics only to authenticated monitoring', async () => {
    const live = await request(app).get('/api/health/live');
    expect(live.headers['x-content-type-options']).toBe('nosniff');
    expect(live.headers['x-powered-by']).toBeUndefined();
    expect(live.headers['cache-control']).toBe('no-store');
    expect((await request(app).get('/internal/metrics')).status).toBe(401);
    vi.stubEnv('METRICS_TOKEN', 'test-monitoring-token');
    const metrics = await request(app).get('/internal/metrics').set('Authorization', 'Bearer test-monitoring-token');
    expect(metrics.status).toBe(200);
    expect(metrics.text).toContain('livecast_http_requests_total');
    expect(metrics.text).toContain('livecast_process_cpu_user_seconds_total');
    vi.unstubAllEnvs();
  });
});
