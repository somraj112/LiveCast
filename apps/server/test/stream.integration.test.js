import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const ids = {
  creator: '10000000-0000-4000-8000-000000000001',
  otherCreator: '10000000-0000-4000-8000-000000000002',
  viewer: '10000000-0000-4000-8000-000000000003',
  category: '20000000-0000-4000-8000-000000000001',
};

const state = vi.hoisted(() => ({ users: new Map(), streams: new Map(), categories: new Map() }));

const prismaMock = vi.hoisted(() => {
  const project = (record, select) => {
    if (!record || !select) return record;
    return Object.fromEntries(Object.entries(select).map(([key, config]) => {
      if (key === 'category') {
        return [key, project(state.categories.get(record.categoryId), config.select)];
      }
      if (key === 'creator') {
        return [key, project(state.users.get(record.creatorId), config.select)];
      }
      return [key, record[key]];
    }));
  };

  const matches = (stream, where) => {
    if (where.id && stream.id !== where.id) return false;
    if (where.creatorId && stream.creatorId !== where.creatorId) return false;
    if (where.status?.in && !where.status.in.includes(stream.status)) return false;
    if (where.status?.not && stream.status === where.status.not) return false;
    if (where.visibility?.in && !where.visibility.in.includes(stream.visibility)) return false;
    return true;
  };

  return {
    user: {
      async findUnique({ where, select }) {
        const user = state.users.get(where.id);
        return project(user, select);
      },
    },
    category: {
      async findMany({ select }) {
        return [...state.categories.values()].map((category) => project(category, select));
      },
    },
    stream: {
      async findMany({ where, select }) {
        return [...state.streams.values()]
          .filter((stream) => matches(stream, where))
          .map((stream) => project(stream, select));
      },
      async findFirst({ where, select }) {
        const stream = [...state.streams.values()].find((candidate) => matches(candidate, where));
        return project(stream, select) || null;
      },
      async create({ data, select }) {
        if (!state.categories.has(data.categoryId)) {
          throw Object.assign(new Error('Foreign key constraint'), { code: 'P2003' });
        }
        const stream = {
          id: crypto.randomUUID(),
          ...data,
          description: data.description ?? null,
          visibility: data.visibility ?? 'PUBLIC',
          streamKey: crypto.randomUUID(),
          scheduledAt: null,
          startedAt: null,
          endedAt: null,
          createdAt: new Date(),
        };
        state.streams.set(stream.id, stream);
        return project(stream, select);
      },
      async updateMany({ where, data }) {
        const stream = [...state.streams.values()].find((candidate) => matches(candidate, where));
        if (!stream) return { count: 0 };
        state.streams.set(stream.id, { ...stream, ...data });
        return { count: 1 };
      },
      async deleteMany({ where }) {
        const stream = [...state.streams.values()].find((candidate) => matches(candidate, where));
        if (!stream) return { count: 0 };
        state.streams.delete(stream.id);
        return { count: 1 };
      },
    },
  };
});

vi.mock('../src/config/db.js', () => ({ default: prismaMock, prisma: prismaMock }));

let app;
let tokens;

beforeAll(async () => {
  process.env.JWT_ACCESS_SECRET = ['access', 'integration', 'test', 'secret', 'long', 'enough'].join('-');
  process.env.JWT_REFRESH_SECRET = ['refresh', 'integration', 'test', 'secret', 'long', 'enough'].join('-');
  ({ default: app } = await import('../src/app.js'));
  const { signAccessToken } = await import('../src/utils/tokens.js');
  tokens = {
    creator: await signAccessToken({ id: ids.creator, role: 'CREATOR' }),
    otherCreator: await signAccessToken({ id: ids.otherCreator, role: 'CREATOR' }),
    viewer: await signAccessToken({ id: ids.viewer, role: 'VIEWER' }),
  };
});

beforeEach(() => {
  state.users.clear();
  state.streams.clear();
  state.categories.clear();
  state.users.set(ids.creator, {
    id: ids.creator,
    username: 'creator_one',
    email: 'creator@example.com',
    role: 'CREATOR',
    profileImage: null,
    bio: null,
    createdAt: new Date(),
  });
  state.users.set(ids.otherCreator, {
    id: ids.otherCreator,
    username: 'creator_two',
    email: 'other@example.com',
    role: 'CREATOR',
    profileImage: null,
    bio: null,
    createdAt: new Date(),
  });
  state.users.set(ids.viewer, {
    id: ids.viewer,
    username: 'viewer_one',
    email: 'viewer@example.com',
    role: 'VIEWER',
    profileImage: null,
    bio: null,
    createdAt: new Date(),
  });
  state.categories.set(ids.category, { id: ids.category, name: 'Music', icon: 'music' });
});

const authorized = (token) => ({ Authorization: `Bearer ${token}` });

async function createDraft(token = tokens.creator, overrides = {}) {
  return request(app)
    .post('/api/v1/creator/streams')
    .set(authorized(token))
    .send({
      title: 'Late night session',
      description: 'A live studio set.',
      categoryId: ids.category,
      visibility: 'PUBLIC',
      ...overrides,
    });
}

describe('creator stream management', () => {
  it('requires the creator role', async () => {
    const response = await createDraft(tokens.viewer);
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('creates and lists drafts without leaking stream keys', async () => {
    const created = await createDraft();
    expect(created.status).toBe(201);
    expect(created.body.data.stream).toMatchObject({ status: 'DRAFT', title: 'Late night session' });
    expect(created.body.data.stream).not.toHaveProperty('streamKey');

    const listed = await request(app)
      .get('/api/v1/creator/streams')
      .set(authorized(tokens.creator));
    expect(listed.status).toBe(200);
    expect(listed.body.data.streams).toHaveLength(1);
    expect(listed.body.data.streams[0]).not.toHaveProperty('streamKey');

    const streamId = created.body.data.stream.id;
    const key = await request(app)
      .get(`/api/v1/creator/streams/${streamId}/stream-key`)
      .set(authorized(tokens.creator));
    expect(key.status).toBe(200);
    expect(key.body.data.streamKey).toBeTruthy();
    expect(key.headers['cache-control']).toBe('no-store');

    const otherCreator = await request(app)
      .get(`/api/v1/creator/streams/${streamId}/stream-key`)
      .set(authorized(tokens.otherCreator));
    expect(otherCreator.status).toBe(404);
  });

  it('enforces ownership and valid status transitions', async () => {
    const created = await createDraft();
    const streamId = created.body.data.stream.id;
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const denied = await request(app)
      .patch(`/api/v1/creator/streams/${streamId}`)
      .set(authorized(tokens.otherCreator))
      .send({ title: 'Taken over' });
    expect(denied.status).toBe(404);

    const updated = await request(app)
      .patch(`/api/v1/creator/streams/${streamId}`)
      .set(authorized(tokens.creator))
      .send({ title: 'Updated session' });
    expect(updated.status).toBe(200);

    const scheduled = await request(app)
      .post(`/api/v1/creator/streams/${streamId}/schedule`)
      .set(authorized(tokens.creator))
      .send({ scheduledAt: future });
    expect(scheduled.body.data.stream.status).toBe('SCHEDULED');

    const started = await request(app)
      .post(`/api/v1/creator/streams/${streamId}/start`)
      .set(authorized(tokens.creator));
    expect(started.body.data.stream.status).toBe('LIVE');

    const liveUpdate = await request(app)
      .patch(`/api/v1/creator/streams/${streamId}`)
      .set(authorized(tokens.creator))
      .send({ title: 'Too late' });
    expect(liveUpdate.status).toBe(409);

    const liveDelete = await request(app)
      .delete(`/api/v1/creator/streams/${streamId}`)
      .set(authorized(tokens.creator));
    expect(liveDelete.status).toBe(409);

    const ended = await request(app)
      .post(`/api/v1/creator/streams/${streamId}/end`)
      .set(authorized(tokens.creator));
    expect(ended.body.data.stream.status).toBe('ENDED');

    const secondEnd = await request(app)
      .post(`/api/v1/creator/streams/${streamId}/end`)
      .set(authorized(tokens.creator));
    expect(secondEnd.status).toBe(409);

    const removed = await request(app)
      .delete(`/api/v1/creator/streams/${streamId}`)
      .set(authorized(tokens.creator));
    expect(removed.status).toBe(204);
  });

  it('publishes safe details only for non-draft, non-private streams', async () => {
    const created = await createDraft();
    const streamId = created.body.data.stream.id;

    expect((await request(app).get(`/api/v1/streams/${streamId}`)).status).toBe(404);

    await request(app)
      .post(`/api/v1/creator/streams/${streamId}/schedule`)
      .set(authorized(tokens.creator))
      .send({ scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() });

    const published = await request(app).get(`/api/v1/streams/${streamId}`);
    expect(published.status).toBe(200);
    expect(published.body.data.stream.creator.username).toBe('creator_one');
    expect(published.body.data.stream).not.toHaveProperty('streamKey');

    const privateDraft = await createDraft(tokens.creator, { title: 'Private room', visibility: 'PRIVATE' });
    const privateId = privateDraft.body.data.stream.id;
    await request(app)
      .post(`/api/v1/creator/streams/${privateId}/start`)
      .set(authorized(tokens.creator));
    expect((await request(app).get(`/api/v1/streams/${privateId}`)).status).toBe(404);
  });
});
