import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const state = vi.hoisted(() => ({ users: new Map(), sessions: new Map() }));

const publicUser = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.role,
  profileImage: user.profileImage,
  bio: user.bio,
  createdAt: user.createdAt,
});

const prismaMock = vi.hoisted(() => {
  const selectUser = (user, select) => {
    if (!select) return user;
    return Object.fromEntries(Object.keys(select).map((key) => [key, user[key]]));
  };

  const db = {
    user: {
      async create({ data, select }) {
        if ([...state.users.values()].some((user) => user.email === data.email || user.username === data.username)) {
          throw Object.assign(new Error('Unique constraint'), { code: 'P2002' });
        }
        const user = {
          id: crypto.randomUUID(),
          ...data,
          role: 'VIEWER',
          profileImage: null,
          bio: null,
          createdAt: new Date(),
        };
        state.users.set(user.id, user);
        return selectUser(user, select);
      },
      async findUnique({ where, select }) {
        const user = [...state.users.values()].find((candidate) =>
          where.id ? candidate.id === where.id : candidate.email === where.email);
        return user ? selectUser(user, select) : null;
      },
    },
    refreshSession: {
      async create({ data }) {
        const session = { ...data, createdAt: new Date(), revokedAt: null };
        state.sessions.set(session.id, session);
        return session;
      },
      async findUnique({ where, include }) {
        const session = state.sessions.get(where.id);
        if (!session) return null;
        return include?.user
          ? { ...session, user: publicUser(state.users.get(session.userId)) }
          : session;
      },
      async updateMany({ where, data }) {
        const session = state.sessions.get(where.id);
        if (!session || (where.tokenHash && session.tokenHash !== where.tokenHash)
          || (where.revokedAt === null && session.revokedAt !== null)) return { count: 0 };
        state.sessions.set(session.id, { ...session, ...data });
        return { count: 1 };
      },
    },
    async $transaction(callback) {
      return callback(db);
    },
  };
  return db;
});

vi.mock('../src/config/db.js', () => ({ default: prismaMock, prisma: prismaMock }));

let app;

beforeAll(async () => {
  process.env.JWT_ACCESS_SECRET = 'access-secret-that-is-longer-than-thirty-two-characters';
  process.env.JWT_REFRESH_SECRET = 'refresh-secret-that-is-different-and-long-enough';
  process.env.ACCESS_TOKEN_TTL = '15m';
  process.env.REFRESH_TOKEN_TTL = '7d';
  ({ default: app } = await import('../src/app.js'));
});

beforeEach(() => {
  state.users.clear();
  state.sessions.clear();
});

describe('authentication API', () => {
  it('registers a user, returns /me, rotates the session, and logs out', async () => {
    const agent = request.agent(app);
    const registered = await agent.post('/api/v1/auth/register').send({
      username: 'studio_host',
      email: 'host@example.com',
      password: 'correct-horse-battery-staple',
    });

    expect(registered.status).toBe(201);
    expect(registered.body.data.user).toMatchObject({ username: 'studio_host', role: 'VIEWER' });
    expect(registered.body.data.user).not.toHaveProperty('passwordHash');
    expect(registered.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(state.sessions.size).toBe(1);

    const me = await agent
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${registered.body.data.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe('host@example.com');

    const refreshed = await agent.post('/api/v1/auth/refresh');
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.accessToken).not.toBe(registered.body.data.accessToken);
    expect([...state.sessions.values()].filter((session) => !session.revokedAt)).toHaveLength(1);

    expect((await agent.post('/api/v1/auth/logout')).status).toBe(200);
    const afterLogout = await agent.post('/api/v1/auth/refresh');
    expect(afterLogout.status).toBe(401);
    expect(afterLogout.body.error.code).toBe('REFRESH_TOKEN_REQUIRED');
  });

  it('logs in an existing user and rejects an incorrect password', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send({
      username: 'viewer_one',
      email: 'viewer@example.com',
      password: 'a-strong-password',
    });

    expect((await request(app).post('/api/v1/auth/login').send({
      email: 'viewer@example.com',
      password: 'a-strong-password',
    })).status).toBe(200);

    const rejected = await request(app).post('/api/v1/auth/login').send({
      email: 'viewer@example.com',
      password: 'wrong-password',
    });
    expect(rejected.status).toBe(401);
    expect(rejected.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns consistent validation and duplicate-account errors', async () => {
    const invalid = await request(app).post('/api/v1/auth/register').send({
      username: 'x',
      email: 'not-an-email',
      password: 'short',
    });
    expect(invalid.status).toBe(400);
    expect(invalid.body).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } });
    expect(invalid.body.error.details.length).toBeGreaterThan(0);

    const account = { username: 'duplicate', email: 'same@example.com', password: 'valid-password' };
    expect((await request(app).post('/api/v1/auth/register').send(account)).status).toBe(201);
    const duplicate = await request(app).post('/api/v1/auth/register').send(account);
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('ACCOUNT_EXISTS');
  });

  it('requires a valid Bearer token for protected endpoints', async () => {
    const missing = await request(app).get('/api/v1/auth/me');
    expect(missing.status).toBe(401);
    expect(missing.body.error.code).toBe('AUTHENTICATION_REQUIRED');

    const invalid = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid');
    expect(invalid.status).toBe(401);
    expect(invalid.body.error.code).toBe('INVALID_TOKEN');
  });
});

describe('role authorization', () => {
  it('allows configured roles and rejects all others', async () => {
    const { authorize } = await import('../src/middleware/auth.js');
    const allowedNext = vi.fn();
    authorize('CREATOR')({ user: { role: 'CREATOR' } }, {}, allowedNext);
    expect(allowedNext).toHaveBeenCalledWith();

    const deniedNext = vi.fn();
    authorize('CREATOR')({ user: { role: 'VIEWER' } }, {}, deniedNext);
    expect(deniedNext.mock.calls[0][0]).toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });
});
