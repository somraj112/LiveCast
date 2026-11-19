import { Server } from 'socket.io';
import { z } from 'zod';
import prisma from '../config/db.js';
import { verifyAccessToken } from '../utils/tokens.js';
import { AppError } from '../utils/app-error.js';
import { createStore } from '../infrastructure/store.js';
import { logger, errorMetadata } from '../config/logger.js';
import { socketConnections } from '../infrastructure/metrics.js';

const streamInput = z.object({ streamId: z.string().uuid() }).strict();
const messageInput = streamInput.extend({ message: z.string().trim().min(1).max(2000) });
const deleteInput = streamInput.extend({ messageId: z.string().uuid() });
const banInput = streamInput.extend({ userId: z.string().uuid(), reason: z.string().trim().max(500).optional() });
const unbanInput = streamInput.extend({ userId: z.string().uuid() });
const messageSelect = {
  id: true, streamId: true, senderId: true, message: true, sentAt: true, deleted: true,
  sender: { select: { id: true, username: true } },
};
const roomName = (id) => `stream:${id}`;

function failure(error) {
  return { success: false, error: error instanceof AppError
    ? { code: error.code, message: error.message }
    : { code: 'INTERNAL_SERVER_ERROR', message: 'The realtime action failed.' } };
}

// The default adapter and queues are intentionally single-process. See REALTIME.md before scaling.
export function createRealtimeServer(server, { db = prisma, store = createStore() } = {}) {
  const origin = process.env.FRONTEND_URL || 'http://localhost:3000';
  const io = new Server(server, {
    cors: { origin, credentials: true },
    allowRequest: (req, callback) => callback(null, !req.headers.origin || req.headers.origin === origin),
    maxHttpBufferSize: 16 * 1024,
  });
  const queues = new Map();

  function serialize(streamId, action) {
    const pending = (queues.get(streamId) || Promise.resolve()).catch(() => {}).then(action);
    queues.set(streamId, pending);
    void pending.finally(() => {
      if (queues.get(streamId) === pending) queues.delete(streamId);
    }).catch(() => {});
    return pending;
  }

  async function context(socket, streamId, requireMember = true) {
    if (!socket.connected || socket.data.expiresAt <= Date.now()) {
      throw new AppError(401, 'INVALID_TOKEN', 'Reconnect with a valid access token.');
    }
    const [user, stream, moderator, ban] = await Promise.all([
      db.user.findUnique({ where: { id: socket.data.user.id }, select: { id: true, username: true } }),
      db.stream.findUnique({ where: { id: streamId }, select: { id: true, creatorId: true, status: true, visibility: true } }),
      db.moderator.findUnique({ where: { streamId_userId: { streamId, userId: socket.data.user.id } } }),
      db.ban.findUnique({ where: { streamId_userId: { streamId, userId: socket.data.user.id } } }),
    ]);
    if (!user) throw new AppError(401, 'ACCOUNT_NOT_FOUND', 'The account no longer exists.');
    const canModerate = Boolean(stream && (stream.creatorId === user.id || moderator));
    if (!stream || stream.status !== 'LIVE' || (stream.visibility === 'PRIVATE' && !canModerate)) {
      throw new AppError(404, 'STREAM_NOT_FOUND', 'The live stream was not found.');
    }
    if (ban) throw new AppError(403, 'STREAM_BANNED', 'You are banned from this stream.');
    if (requireMember && !socket.rooms.has(roomName(streamId))) {
      throw new AppError(403, 'ROOM_REQUIRED', 'Join the stream before using chat.');
    }
    return { user, stream, canModerate };
  }

  async function publishCount(streamId, creatorId) {
    const count = await store.count(streamId, creatorId);
    io.to(roomName(streamId)).emit('stream:viewers', { streamId, count });
    return count;
  }

  // One renewal pass per server, and one count broadcast per room (not per viewer).
  let renewing = false;
  const heartbeat = setInterval(async () => {
    if (renewing) return;
    renewing = true;
    const rooms = new Map();
    for (const socket of io.sockets.sockets.values()) {
      for (const [streamId, creatorId] of socket.data.memberships || []) rooms.set(streamId, creatorId);
    }
    try {
      await Promise.all([...rooms].map(([streamId, creatorId]) => serialize(streamId, async () => {
        for (const socketId of io.sockets.adapter.rooms.get(roomName(streamId)) || []) {
          const socket = io.sockets.sockets.get(socketId);
          if (socket?.connected && socket.data.memberships.has(streamId)) await store.touch(streamId, socket.data.user.id, socket.id);
        }
        await publishCount(streamId, creatorId);
      })));
    } catch {
      logger.error('Presence renewal failed; disconnecting sockets');
      io.disconnectSockets(true);
    } finally { renewing = false; }
  }, 15000);
  heartbeat.unref();
  server.once('close', () => clearInterval(heartbeat));

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (typeof token !== 'string') throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'An access token is required.');
      const payload = await verifyAccessToken(token);
      const allowance = await store.consume('socket-connect', payload.sub, 30, 60000);
      if (!allowance.allowed) throw new AppError(429, 'RATE_LIMITED', 'Please wait before reconnecting.');
      const user = await db.user.findUnique({ where: { id: payload.sub }, select: { id: true, username: true } });
      if (!user) throw new AppError(401, 'ACCOUNT_NOT_FOUND', 'The account no longer exists.');
      socket.data.user = user;
      socket.data.expiresAt = payload.exp * 1000;
      next();
    } catch (error) {
      const result = failure(error);
      next(Object.assign(new Error(result.error.message), { data: result.error }));
    }
  });

  io.on('connection', (socket) => {
    socketConnections.inc();
    socket.data.memberships = new Map();
    const expiry = setTimeout(() => socket.disconnect(true), Math.max(0, socket.data.expiresAt - Date.now()));
    expiry.unref();
    let windowStart = Date.now();
    let requests = 0;

    function on(event, schema, action) {
      socket.on(event, (input, acknowledgement) => {
        const reply = typeof acknowledgement === 'function' ? acknowledgement : () => {};
        // Bound queued work before Redis I/O and per-stream serialization.
        if (Date.now() - windowStart >= 10000) { windowStart = Date.now(); requests = 0; }
        if (++requests > 30) return reply(failure(new AppError(429, 'RATE_LIMITED', 'Please slow down.')));
        const parsed = schema.safeParse(input);
        if (!parsed.success) return reply(failure(new AppError(400, 'VALIDATION_ERROR', 'The event payload is invalid.')));
        void serialize(parsed.data.streamId, async () => {
          try {
            const allowance = await store.consume('socket-command', socket.data.user.id, 30, 10000);
            if (!allowance.allowed) throw new AppError(429, 'RATE_LIMITED', 'Please slow down.');
            const data = await action(parsed.data);
            reply({ success: true, data });
          } catch (error) {
            if (!(error instanceof AppError)) logger.error({ error: errorMetadata(error) }, 'Realtime action failed');
            reply(failure(error));
          }
        });
      });
    }

    on('stream:join', streamInput, async ({ streamId }) => {
      const { user, stream, canModerate } = await context(socket, streamId, false);
      const [messages, bans] = await Promise.all([
        db.chatMessage.findMany({ where: { streamId, deleted: false }, select: messageSelect, orderBy: [{ sentAt: 'desc' }, { id: 'desc' }], take: 50 }),
        canModerate ? db.ban.findMany({ where: { streamId }, select: { userId: true, reason: true, user: { select: { username: true } } } }) : [],
      ]);
      if (!socket.connected) throw new AppError(401, 'DISCONNECTED', 'The connection closed.');
      await store.touch(streamId, user.id, socket.id);
      if (!socket.connected) {
        await store.leave(streamId, user.id, socket.id);
        throw new AppError(401, 'DISCONNECTED', 'The connection closed.');
      }
      await socket.join(roomName(streamId));
      socket.data.memberships.set(streamId, stream.creatorId);
      return { streamId, userId: user.id, canModerate, messages: messages.reverse(), bans, count: await publishCount(streamId, stream.creatorId) };
    });

    on('stream:leave', streamInput, async ({ streamId }) => {
      const creatorId = socket.data.memberships.get(streamId);
      await socket.leave(roomName(streamId));
      socket.data.memberships.delete(streamId);
      await store.leave(streamId, socket.data.user.id, socket.id);
      if (creatorId) await publishCount(streamId, creatorId);
      return { streamId };
    });

    on('chat:send', messageInput, async ({ streamId, message }) => {
      const { user } = await context(socket, streamId);
      const allowance = await store.consume('chat-send', user.id, 1, 750);
      if (!allowance.allowed) {
        throw new AppError(429, 'RATE_LIMITED', 'Please wait before sending another message.');
      }
      const saved = await db.chatMessage.create({ data: { streamId, senderId: user.id, message }, select: messageSelect });
      io.to(roomName(streamId)).emit('chat:message', saved);
      return { message: saved };
    });

    async function moderation(streamId) {
      const ctx = await context(socket, streamId);
      if (!ctx.canModerate) throw new AppError(403, 'FORBIDDEN', 'Stream moderator access is required.');
      return ctx;
    }

    on('chat:delete', deleteInput, async ({ streamId, messageId }) => {
      await moderation(streamId);
      const result = await db.chatMessage.updateMany({ where: { id: messageId, streamId }, data: { deleted: true } });
      if (!result.count) throw new AppError(404, 'MESSAGE_NOT_FOUND', 'The message was not found.');
      io.to(roomName(streamId)).emit('chat:deleted', { streamId, messageId });
      return { messageId };
    });

    on('moderation:ban', banInput, async ({ streamId, userId, reason }) => {
      const { stream } = await moderation(streamId);
      const [target, moderator] = await Promise.all([
        db.user.findUnique({ where: { id: userId }, select: { id: true, username: true } }),
        db.moderator.findUnique({ where: { streamId_userId: { streamId, userId } } }),
      ]);
      if (!target) throw new AppError(404, 'USER_NOT_FOUND', 'The user was not found.');
      if (userId === stream.creatorId || moderator) throw new AppError(403, 'PROTECTED_USER', 'Creators and assigned moderators cannot be banned.');
      await db.ban.upsert({ where: { streamId_userId: { streamId, userId } }, create: { streamId, userId, reason }, update: { reason } });
      for (const member of [...(io.sockets.adapter.rooms.get(roomName(streamId)) || [])]) {
        const targetSocket = io.sockets.sockets.get(member);
        if (targetSocket?.data.user.id === userId) {
          targetSocket.emit('stream:banned', { streamId });
          await targetSocket.leave(roomName(streamId));
          targetSocket.data.memberships.delete(streamId);
          await store.leave(streamId, userId, targetSocket.id);
        }
      }
      io.to(roomName(streamId)).emit('moderation:banned', { streamId, userId, reason: reason || null, user: { username: target.username } });
      await publishCount(streamId, stream.creatorId);
      return { userId };
    });

    on('moderation:unban', unbanInput, async ({ streamId, userId }) => {
      await moderation(streamId);
      await db.ban.deleteMany({ where: { streamId, userId } });
      io.to(roomName(streamId)).emit('moderation:unbanned', { streamId, userId });
      return { userId };
    });

    socket.on('disconnect', () => {
      clearTimeout(expiry);
      socketConnections.dec();
      for (const [streamId, creatorId] of socket.data.memberships) {
        void serialize(streamId, async () => {
          await store.leave(streamId, socket.data.user.id, socket.id);
          await publishCount(streamId, creatorId);
        }).catch(() => logger.warn('Presence cleanup deferred to lease expiry'));
      }
      socket.data.memberships.clear();
    });
  });
  io.clearPresence = (streamId) => serialize(streamId, () => store.clearStream(streamId));
  io.drainPresence = () => Promise.allSettled([...queues.values()]);
  return io;
}
