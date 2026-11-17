import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer } from 'node:http';
import { io as client } from 'socket.io-client';
import { randomUUID } from 'node:crypto';
vi.mock('../src/config/db.js', () => ({ default: {} }));
import { createRealtimeServer } from '../src/realtime/index.js';
import { signAccessToken } from '../src/utils/tokens.js';

const creator = randomUUID();
const viewer = randomUUID();
const moderator = randomUUID();
const stranger = randomUUID();
const streamId = randomUUID();
const otherStream = randomUUID();
let io;
let server;
let url;
let db;
let sockets;
let messages;
let bans;
let stream;

const once = (socket, event) => new Promise((resolve) => socket.once(event, resolve));
const emit = (socket, event, input) => socket.timeout(2000).emitWithAck(event, input);

async function connect(userId, tokenOverride) {
  const token = tokenOverride ?? await signAccessToken({ id: userId, role: 'VIEWER' });
  const socket = client(url, { auth: { token }, transports: ['websocket'], reconnection: false });
  sockets.push(socket);
  await new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
  return socket;
}
const join = (socket, id = streamId) => emit(socket, 'stream:join', { streamId: id });

beforeEach(async () => {
  process.env.JWT_ACCESS_SECRET = 'realtime-test-access-secret-at-least-32-characters';
  process.env.JWT_REFRESH_SECRET = 'realtime-test-refresh-secret-at-least-32-characters';
  sockets = [];
  messages = [];
  bans = new Map();
  stream = { id: streamId, creatorId: creator, status: 'LIVE', visibility: 'PUBLIC' };
  db = {
    user: { findUnique: vi.fn(async ({ where }) => ({ id: where.id, username: where.id === creator ? 'creator' : 'viewer' })) },
    stream: { findUnique: vi.fn(async ({ where }) => where.id === streamId ? stream : null) },
    moderator: { findUnique: vi.fn(async ({ where }) => where.streamId_userId.userId === moderator ? { userId: moderator } : null) },
    ban: {
      findUnique: vi.fn(async ({ where }) => bans.get(where.streamId_userId.userId) || null),
      findMany: vi.fn(async () => [...bans.values()]),
      upsert: vi.fn(async ({ create }) => { bans.set(create.userId, create); return create; }),
      deleteMany: vi.fn(async ({ where }) => { bans.delete(where.userId); return { count: 1 }; }),
    },
    chatMessage: {
      findMany: vi.fn(async () => messages.filter((item) => !item.deleted).slice(-50).reverse()),
      create: vi.fn(async ({ data }) => {
        const message = { ...data, id: randomUUID(), sentAt: new Date(), deleted: false, sender: { id: data.senderId, username: 'viewer' } };
        messages.push(message);
        return message;
      }),
      updateMany: vi.fn(async ({ where }) => {
        const message = messages.find((item) => item.id === where.id && item.streamId === where.streamId);
        if (message) message.deleted = true;
        return { count: message ? 1 : 0 };
      }),
    },
  };
  server = createServer();
  io = createRealtimeServer(server, { db });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  for (const socket of sockets) socket.disconnect();
  await new Promise((resolve) => io.close(resolve));
});

describe('realtime stream rooms', () => {
  it('rejects invalid tokens at connection', async () => {
    await expect(connect(viewer, 'invalid-token')).rejects.toMatchObject({ data: { code: 'INVALID_TOKEN' } });
  });

  it('rejects deleted accounts and rechecks token expiry on commands', async () => {
    db.user.findUnique.mockResolvedValueOnce(null);
    await expect(connect(viewer)).rejects.toMatchObject({ data: { code: 'ACCOUNT_NOT_FOUND' } });
    const socket = await connect(viewer);
    await join(socket);
    io.sockets.sockets.get(socket.id).data.expiresAt = Date.now() - 1;
    expect((await emit(socket, 'chat:send', { streamId, message: 'Expired' })).error.code).toBe('INVALID_TOKEN');
    expect(messages).toHaveLength(0);
  });

  it('requires room membership and rejects nonexistent/private/non-live rooms', async () => {
    const socket = await connect(viewer);
    expect((await emit(socket, 'chat:send', { streamId, message: 'Hello' })).error.code).toBe('ROOM_REQUIRED');
    expect((await join(socket, otherStream)).error.code).toBe('STREAM_NOT_FOUND');
    stream.visibility = 'PRIVATE';
    expect((await join(socket)).error.code).toBe('STREAM_NOT_FOUND');
    const owner = await connect(creator);
    expect((await join(owner)).success).toBe(true);
    stream.status = 'ENDED';
    expect((await emit(owner, 'chat:send', { streamId, message: 'After the end' })).error.code).toBe('STREAM_NOT_FOUND');
  });

  it('persists before broadcasting, replays history, and isolates rooms', async () => {
    const sender = await connect(viewer);
    const receiver = await connect(creator);
    const outsider = await connect(stranger);
    await join(sender);
    await join(receiver);
    const outsideMessage = vi.fn();
    outsider.on('chat:message', outsideMessage);
    const received = once(receiver, 'chat:message');
    const reply = await emit(sender, 'chat:send', { streamId, message: '  Hello live room!  ' });
    expect(reply.success).toBe(true);
    expect((await received).message).toBe('Hello live room!');
    expect(messages).toHaveLength(1);
    expect(outsideMessage).not.toHaveBeenCalled();
    expect((await join(outsider)).data.messages[0].id).toBe(messages[0].id);
    expect((await emit(sender, 'chat:send', { streamId, message: 'Too fast' })).error.code).toBe('RATE_LIMITED');
  });

  it('counts unique viewers and updates on leave and disconnect', async () => {
    const owner = await connect(creator);
    const first = await connect(viewer);
    const second = await connect(viewer);
    await join(owner);
    await join(first);
    expect((await join(second)).data.count).toBe(1);
    const countAfterLeave = once(owner, 'stream:viewers');
    await emit(first, 'stream:leave', { streamId });
    expect((await countAfterLeave).count).toBe(1);
    const countAfterDisconnect = once(owner, 'stream:viewers');
    second.disconnect();
    expect((await countAfterDisconnect).count).toBe(0);
  });

  it('restricts moderation to the owner or assigned moderator and soft-deletes messages', async () => {
    const sender = await connect(viewer);
    const mod = await connect(moderator);
    await join(sender);
    expect((await join(mod)).data.canModerate).toBe(true);
    const sent = await emit(sender, 'chat:send', { streamId, message: 'Message to remove' });
    const messageId = sent.data.message.id;
    expect((await emit(sender, 'chat:delete', { streamId, messageId })).error.code).toBe('FORBIDDEN');
    const deletion = once(sender, 'chat:deleted');
    expect((await emit(mod, 'chat:delete', { streamId, messageId })).success).toBe(true);
    expect((await deletion).messageId).toBe(messageId);
    expect(messages[0].deleted).toBe(true);
    expect((await join(sender)).data.messages).toHaveLength(0);
    expect((await emit(mod, 'chat:delete', { streamId, messageId: randomUUID() })).error.code).toBe('MESSAGE_NOT_FOUND');
  });

  it('ejects every banned user connection and allows rejoining only after unban', async () => {
    const owner = await connect(creator);
    const first = await connect(viewer);
    const second = await connect(viewer);
    await join(owner);
    await join(first);
    await join(second);
    const ejected = once(first, 'stream:banned');
    expect((await emit(owner, 'moderation:ban', { streamId, userId: viewer, reason: 'Spam' })).success).toBe(true);
    expect((await ejected).streamId).toBe(streamId);
    expect((await join(first)).error.code).toBe('STREAM_BANNED');
    expect((await emit(second, 'chat:send', { streamId, message: 'Evade ban' })).error.code).toBe('STREAM_BANNED');
    expect((await emit(owner, 'moderation:ban', { streamId, userId: moderator })).error.code).toBe('PROTECTED_USER');
    await emit(owner, 'moderation:unban', { streamId, userId: viewer });
    expect((await join(first)).success).toBe(true);
  });

  it('validates payloads and never broadcasts failed writes', async () => {
    const sender = await connect(viewer);
    await join(sender);
    expect((await emit(sender, 'chat:send', { streamId, message: ' ' })).error.code).toBe('VALIDATION_ERROR');
    expect((await emit(sender, 'chat:send', { streamId, message: 'x'.repeat(2001) })).error.code).toBe('VALIDATION_ERROR');
    const received = vi.fn();
    sender.on('chat:message', received);
    db.chatMessage.create.mockRejectedValueOnce(new Error('database unavailable'));
    expect((await emit(sender, 'chat:send', { streamId, message: 'Hello' })).error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(received).not.toHaveBeenCalled();
  });
});
