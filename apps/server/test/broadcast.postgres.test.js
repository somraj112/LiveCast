import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHmac, generateKeyPairSync, randomUUID } from 'node:crypto';
import { jwtVerify } from 'jose';
import request from 'supertest';

// Explicit opt-in: apply migrations to a disposable *_test database first. Never use the app database.
describe.skipIf(!process.env.TEST_DATABASE_URL)('broadcasting with PostgreSQL', () => {
  let db;
  let app;
  let owner;
  let viewer;
  let category;
  let stream;
  let remoteId;
  let ownerToken;
  let viewerToken;
  let providerFetch;
  let publicKey;
  let eventIds;
  const streamKey = 'test-ingest-key-not-a-real-credential';

  beforeAll(async () => {
    const url = new URL(process.env.TEST_DATABASE_URL);
    if (!url.pathname.endsWith('_test')) throw new Error('TEST_DATABASE_URL must name a disposable *_test database.');
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.JWT_ACCESS_SECRET = 'broadcast-access-secret-for-tests-only-32-characters';
    process.env.JWT_REFRESH_SECRET = 'broadcast-refresh-secret-for-tests-only-32-characters';
    process.env.MUX_TOKEN_ID = 'test-token';
    process.env.MUX_TOKEN_SECRET = 'test-secret';
    process.env.MUX_WEBHOOK_SECRET = 'test-webhook-secret';
    process.env.MUX_SIGNING_KEY_ID = 'test-signing-key';
    process.env.STREAM_KEY_ENCRYPTION_KEY = 'ab'.repeat(32);
    const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
    publicKey = pair.publicKey;
    process.env.MUX_SIGNING_PRIVATE_KEY = Buffer.from(pair.privateKey.export({ format: 'pem', type: 'pkcs8' })).toString('base64');
    ({ default: db } = await import('../src/config/db.js'));
    ({ default: app } = await import('../src/app.js'));
  });

  beforeEach(async () => {
    eventIds = [];
    owner = await db.user.create({ data: { username: `owner_${randomUUID()}`, email: `${randomUUID()}@example.test`, passwordHash: 'unused', role: 'CREATOR' } });
    viewer = await db.user.create({ data: { username: `viewer_${randomUUID()}`, email: `${randomUUID()}@example.test`, passwordHash: 'unused' } });
    category = await db.category.create({ data: { name: `test-${randomUUID()}` } });
    stream = await db.stream.create({ data: { creatorId: owner.id, categoryId: category.id, title: 'PostgreSQL broadcast test', status: 'SCHEDULED' } });
    remoteId = `mux-${randomUUID()}`;
    const { signAccessToken } = await import('../src/utils/tokens.js');
    ownerToken = await signAccessToken(owner);
    viewerToken = await signAccessToken(viewer);
    providerFetch = vi.fn(async (_url, options) => options.method === 'POST'
      ? new Response(JSON.stringify({ data: { id: remoteId, stream_key: streamKey, playback_ids: [{ id: 'live-playback', policy: 'signed' }] } }), { status: 201 })
      : new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', providerFetch);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await db.user.deleteMany({ where: { id: { in: [owner.id, viewer.id] } } });
    await db.category.delete({ where: { id: category.id } });
    await db.providerEvent.deleteMany({ where: { id: { in: eventIds } } });
  });

  afterAll(async () => { await db?.$disconnect(); });

  const setup = () => request(app).post(`/api/v1/creator/streams/${stream.id}/broadcast`).auth(ownerToken, { type: 'bearer' });
  const playback = (token = viewerToken) => request(app).get(`/api/v1/streams/${stream.id}/playback`).auth(token, { type: 'bearer' });
  function event(type, data = {}, createdAt = new Date()) {
    const id = randomUUID();
    eventIds.push(id);
    return { id, type, created_at: createdAt.toISOString(), data: { id: remoteId, ...data } };
  }
  function webhook(payload, timestamp = Math.floor(Date.now() / 1000)) {
    const body = JSON.stringify(payload);
    const signature = createHmac('sha256', process.env.MUX_WEBHOOK_SECRET).update(`${timestamp}.${body}`).digest('hex');
    return request(app).post('/api/v1/webhooks/mux').set('Content-Type', 'application/json')
      .set('mux-signature', `t=${timestamp},v1=${signature}`).send(body);
  }

  it('protects provisioning and serializes concurrent setup without duplicate provider creates', async () => {
    const denied = await request(app).post(`/api/v1/creator/streams/${stream.id}/broadcast`).auth(viewerToken, { type: 'bearer' });
    expect(denied.status).toBe(403);
    const otherOwnerToken = (await import('../src/utils/tokens.js')).signAccessToken;
    await db.user.update({ where: { id: viewer.id }, data: { role: 'CREATOR' } });
    const wrongOwner = await request(app).post(`/api/v1/creator/streams/${stream.id}/broadcast`).auth(await otherOwnerToken({ ...viewer, role: 'CREATOR' }), { type: 'bearer' });
    expect(wrongOwner.status).toBe(404);
    const results = await Promise.all([setup(), setup()]);
    expect(results.some((reply) => reply.status === 200)).toBe(true);
    expect(providerFetch).toHaveBeenCalledTimes(1);
    const repeat = await setup();
    expect(repeat.status).toBe(200);
    expect(repeat.body.data.streamKey).toBe(streamKey);
    expect(repeat.headers['cache-control']).toBe('no-store');
    const row = await db.broadcast.findUnique({ where: { streamId: stream.id } });
    expect(row.keyCiphertext).not.toContain(streamKey);
    const publicData = await request(app).get(`/api/v1/streams/${stream.id}`);
    expect(JSON.stringify(publicData.body)).not.toContain(streamKey);
    const [url, options] = providerFetch.mock.calls[0];
    expect(url).toBe('https://api.mux.com/video/v1/live-streams');
    expect(JSON.parse(options.body)).toMatchObject({ playback_policies: ['signed'], test: true });
  });

  it('keeps an ambiguous failed setup reserved so retries cannot create another resource', async () => {
    providerFetch.mockRejectedValueOnce(new Error('network timeout'));
    expect((await setup()).status).toBe(502);
    expect((await setup()).body.error.code).toBe('BROADCAST_SETUP_PENDING');
    expect(providerFetch).toHaveBeenCalledTimes(1);
  });

  it('rejects forged, stale, and invalid callbacks before changing status', async () => {
    await setup();
    const active = event('video.live_stream.active');
    expect((await request(app).post('/api/v1/webhooks/mux').send(active)).status).toBe(401);
    expect((await webhook(active, Math.floor(Date.now() / 1000) - 600)).status).toBe(401);
    expect((await webhook({ ...active, created_at: 'invalid' })).status).toBe(400);
    expect((await db.stream.findUnique({ where: { id: stream.id } })).status).toBe('SCHEDULED');
  });

  it('uses provider status, ignores stale events, and does not record unfinished assets', async () => {
    await setup();
    expect((await webhook(event('video.live_stream.idle', { active_asset_id: null }))).status).toBe(200);
    expect((await db.stream.findUnique({ where: { id: stream.id } })).status).toBe('SCHEDULED');
    expect((await request(app).post(`/api/v1/creator/streams/${stream.id}/start`).auth(ownerToken, { type: 'bearer' })).body.error.code).toBe('PROVIDER_MANAGED_STREAM');
    const at = new Date();
    const active = event('video.live_stream.active', {}, at);
    expect((await webhook(active)).status).toBe(200);
    expect((await webhook(active)).status).toBe(200);
    expect(await db.providerEvent.count({ where: { id: active.id } })).toBe(1);
    await webhook(event('video.live_stream.idle', { active_asset_id: 'recorded-asset' }, new Date(at.getTime() - 1000)));
    expect((await db.stream.findUnique({ where: { id: stream.id } })).status).toBe('LIVE');
    await webhook(event('video.asset.ready', { id: 'recorded-asset', live_stream_id: remoteId, duration: 10 }));
    expect(await db.recording.count({ where: { streamId: stream.id } })).toBe(0);
    const live = await playback();
    expect(live.body.data.source.kind).toBe('live');
    const jwt = new URL(live.body.data.source.url).searchParams.get('token');
    expect((await jwtVerify(jwt, publicKey, { audience: 'v' })).payload.sub).toBe('live-playback');
  });

  it('stores final recording metadata once, ends the stream, and serves signed replay', async () => {
    await setup();
    await webhook(event('video.live_stream.active'));
    const completed = event('video.asset.live_stream_completed', {
      id: 'recorded-asset', live_stream_id: remoteId, duration: 125.5,
      playback_ids: [{ id: 'recording-playback', policy: 'signed' }],
    });
    expect((await webhook(completed)).status).toBe(200);
    expect((await webhook(completed)).status).toBe(200);
    const saved = await db.recording.findUnique({ where: { streamId: stream.id } });
    expect(saved).toMatchObject({ muxAssetId: 'recorded-asset', playbackId: 'recording-playback', duration: 126 });
    expect((await playback()).body.data.source.kind).toBe('recording');
    await webhook(event('video.live_stream.active', {}, new Date(Date.now() + 1000)));
    expect((await db.stream.findUnique({ where: { id: stream.id } })).status).toBe('ENDED');
    await webhook(event('video.asset.deleted', { id: 'recorded-asset' }));
    expect((await playback()).body.data.source).toBeNull();
  });

  it('restricts private playback and bans without exposing ingest credentials', async () => {
    await setup();
    await webhook(event('video.live_stream.active'));
    await db.stream.update({ where: { id: stream.id }, data: { visibility: 'PRIVATE' } });
    expect((await playback()).status).toBe(404);
    expect((await playback(ownerToken)).status).toBe(200);
    await db.moderator.create({ data: { streamId: stream.id, userId: viewer.id } });
    const authorized = await playback();
    expect(authorized.status).toBe(200);
    expect(authorized.headers['cache-control']).toBe('no-store');
    expect(JSON.stringify(authorized.body)).not.toContain(streamKey);
    await db.ban.create({ data: { streamId: stream.id, userId: viewer.id } });
    expect((await playback()).body.error.code).toBe('STREAM_BANNED');
  });

  it('retries provider cleanup after a committed idle event without duplicating state', async () => {
    await setup();
    await webhook(event('video.live_stream.active'));
    const idle = event('video.live_stream.idle', { active_asset_id: 'recorded-asset' });
    providerFetch.mockRejectedValueOnce(new Error('provider unavailable'));
    expect((await webhook(idle)).status).toBe(502);
    expect((await db.stream.findUnique({ where: { id: stream.id } })).status).toBe('ENDED');
    expect((await webhook(idle)).status).toBe(200);
    expect((await db.broadcast.findUnique({ where: { streamId: stream.id } })).stopRequested).toBe(true);
    expect(await db.providerEvent.count({ where: { id: idle.id } })).toBe(1);
  });

  it('requests a real provider stop and waits for callbacks before ending', async () => {
    await setup();
    await webhook(event('video.live_stream.active'));
    const stop = await request(app).post(`/api/v1/creator/streams/${stream.id}/broadcast/stop`).auth(ownerToken, { type: 'bearer' });
    expect(stop.status).toBe(202);
    expect((await db.stream.findUnique({ where: { id: stream.id } })).status).toBe('LIVE');
    expect(providerFetch.mock.calls.at(-1)[0]).toContain('/disable');
    await webhook(event('video.live_stream.idle', { active_asset_id: 'recorded-asset' }));
    expect((await db.stream.findUnique({ where: { id: stream.id } })).status).toBe('ENDED');
  });
});
