import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const ids = {
  creator: '10000000-0000-4000-8000-000000000001',
  viewer: '10000000-0000-4000-8000-000000000002',
  category: '20000000-0000-4000-8000-000000000001',
  stream: '30000000-0000-4000-8000-000000000001',
  history: '40000000-0000-4000-8000-000000000001',
};

const creator = {
  id: ids.creator,
  username: 'signal_studio',
  email: 'creator@example.com',
  role: 'CREATOR',
  profileImage: null,
  bio: 'Independent sound and image.',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};
const viewer = {
  id: ids.viewer,
  username: 'viewer_one',
  email: 'viewer@example.com',
  role: 'VIEWER',
  profileImage: null,
  bio: null,
  createdAt: new Date('2026-01-02T00:00:00.000Z'),
};
const publicStream = {
  id: ids.stream,
  title: 'Late frequency',
  description: 'A studio transmission.',
  status: 'LIVE',
  scheduledAt: null,
  startedAt: new Date('2026-11-14T10:00:00.000Z'),
  createdAt: new Date('2026-11-14T09:00:00.000Z'),
  category: { id: ids.category, name: 'Music', icon: 'music' },
  creator: { id: creator.id, username: creator.username, profileImage: null, bio: creator.bio },
  tags: [{ tag: { id: '50000000-0000-4000-8000-000000000001', name: 'vinyl' } }],
};

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), findFirst: vi.fn() },
  stream: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
  streamTag: { findMany: vi.fn() },
  follow: { count: vi.fn(), findUnique: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
  viewHistory: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
}));

vi.mock('../src/config/db.js', () => ({ default: prismaMock, prisma: prismaMock }));

let app;
let viewerToken;

beforeAll(async () => {
  process.env.JWT_ACCESS_SECRET = ['access', 'discovery', 'integration', 'secret', 'long', 'enough'].join('-');
  process.env.JWT_REFRESH_SECRET = ['refresh', 'discovery', 'integration', 'secret', 'long', 'enough'].join('-');
  ({ default: app } = await import('../src/app.js'));
  const { signAccessToken } = await import('../src/utils/tokens.js');
  viewerToken = await signAccessToken({ id: ids.viewer, role: 'VIEWER' });
});

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.findUnique.mockResolvedValue(viewer);
  prismaMock.user.findFirst.mockImplementation(async ({ select }) => Object.fromEntries(
    Object.keys(select).map((key) => [key, creator[key]])
  ));
  prismaMock.stream.count.mockResolvedValue(1);
  prismaMock.stream.findMany.mockResolvedValue([publicStream]);
  prismaMock.streamTag.findMany.mockResolvedValue([{ id: 'tag-id', name: 'vinyl' }]);
  prismaMock.follow.count.mockResolvedValue(8);
  prismaMock.follow.findUnique.mockResolvedValue(null);
  prismaMock.follow.upsert.mockResolvedValue({ followedAt: new Date('2026-11-14T12:00:00.000Z') });
  prismaMock.follow.deleteMany.mockResolvedValue({ count: 1 });
  prismaMock.viewHistory.count.mockResolvedValue(1);
  prismaMock.viewHistory.findMany.mockResolvedValue([{
    id: ids.history,
    watchDuration: 45,
    watchedAt: new Date('2026-11-14T12:30:00.000Z'),
    stream: publicStream,
  }]);
  prismaMock.viewHistory.findFirst.mockResolvedValue(null);
  prismaMock.viewHistory.create.mockResolvedValue({
    id: ids.history,
    watchDuration: 45,
    watchedAt: new Date('2026-11-14T12:30:00.000Z'),
  });
});

const authorization = () => ({ Authorization: `Bearer ${viewerToken}` });

describe('discovery and profiles', () => {
  it('lists filtered public streams with pagination and no stream key', async () => {
    const response = await request(app)
      .get(`/api/v1/discovery/streams?status=LIVE&categoryId=${ids.category}&tags=vinyl&search=late&page=1&limit=9`);

    expect(response.status).toBe(200);
    expect(response.body.data.pagination).toMatchObject({ page: 1, limit: 9, total: 1, hasNextPage: false });
    expect(response.body.data.streams[0].tags).toEqual([{ id: expect.any(String), name: 'vinyl' }]);
    expect(response.body.data.streams[0]).not.toHaveProperty('streamKey');
    expect(prismaMock.stream.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 9, skip: 0 }));
  });

  it('returns a public creator profile with counts and safe streams', async () => {
    const response = await request(app).get('/api/v1/creators/signal_studio');

    expect(response.status).toBe(200);
    expect(response.body.data.creator).toMatchObject({
      username: 'signal_studio',
      followerCount: 8,
      streamCount: 1,
    });
    expect(response.body.data.creator).not.toHaveProperty('email');
    expect(response.body.data.creator.streams[0]).not.toHaveProperty('streamKey');
  });

  it('follows and unfollows creators while preventing self-follow', async () => {
    const followed = await request(app)
      .post(`/api/v1/creators/${ids.creator}/follow`)
      .set(authorization());
    expect(followed.status).toBe(200);
    expect(followed.body.data.following).toBe(true);

    const unfollowed = await request(app)
      .delete(`/api/v1/creators/${ids.creator}/follow`)
      .set(authorization());
    expect(unfollowed.status).toBe(200);
    expect(unfollowed.body.data.following).toBe(false);

    const selfFollow = await request(app)
      .post(`/api/v1/creators/${ids.viewer}/follow`)
      .set(authorization());
    expect(selfFollow.status).toBe(400);
    expect(selfFollow.body.error.code).toBe('SELF_FOLLOW_NOT_ALLOWED');
  });

  it('records and paginates authenticated viewer history', async () => {
    prismaMock.stream.findFirst.mockResolvedValue({ id: ids.stream });
    const recorded = await request(app)
      .post('/api/v1/viewer/history')
      .set(authorization())
      .send({ streamId: ids.stream, watchDuration: 45 });
    expect(recorded.status).toBe(200);
    expect(recorded.body.data.history.watchDuration).toBe(45);

    const listed = await request(app)
      .get('/api/v1/viewer/history?page=1&limit=12')
      .set(authorization());
    expect(listed.status).toBe(200);
    expect(listed.body.data.history[0].stream.tags[0].name).toBe('vinyl');

    const unauthenticated = await request(app).get('/api/v1/viewer/history');
    expect(unauthenticated.status).toBe(401);
  });
});
