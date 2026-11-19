import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateParams } from '../middleware/validate.js';
import { streamIdSchema } from '../validations/stream.js';
import { asyncHandler } from '../utils/async-handler.js';
import { verifyMuxSignature } from '../services/mux.js';
import { getPlayback, prepareBroadcast, processMuxEvent, requestBroadcastStop } from '../services/broadcast.js';
import { AppError } from '../utils/app-error.js';

export const muxWebhookRouter = express.Router();
muxWebhookRouter.post('/', express.raw({ type: 'application/json', limit: '1mb' }), asyncHandler(async (req, res) => {
  if (!Buffer.isBuffer(req.body)) throw new AppError(400, 'VALIDATION_ERROR', 'A JSON webhook body is required.');
  verifyMuxSignature(req.body, req.get('mux-signature'));
  let event;
  try { event = JSON.parse(req.body.toString('utf8')); } catch { throw new AppError(400, 'VALIDATION_ERROR', 'Invalid webhook JSON.'); }
  const data = await processMuxEvent(event);
  const io = req.app.get('realtime');
  if (io && data.streamId && data.status) {
    const room = `stream:${data.streamId}`;
    io.to(room).emit('stream:status', { streamId: data.streamId, status: data.status });
    if (data.status === 'ENDED') {
      for (const member of io.sockets.adapter.rooms.get(room) || []) {
        io.sockets.sockets.get(member)?.data.memberships?.delete(data.streamId);
      }
      io.in(room).socketsLeave(room);
      await io.clearPresence(data.streamId);
    }
  }
  return res.json({ success: true, data });
}));

export const broadcastRouter = express.Router({ mergeParams: true });
broadcastRouter.use(authenticate, authorize('CREATOR'), validateParams(streamIdSchema));
broadcastRouter.post('/', asyncHandler(async (req, res) => {
  const data = await prepareBroadcast(req.validatedParams.streamId, req.user.id);
  res.set('Cache-Control', 'no-store');
  return res.json({ success: true, data });
}));
broadcastRouter.post('/stop', asyncHandler(async (req, res) => {
  const data = await requestBroadcastStop(req.validatedParams.streamId, req.user.id);
  return res.status(202).json({ success: true, data });
}));

export const playbackRouter = express.Router({ mergeParams: true });
playbackRouter.get('/', authenticate, validateParams(streamIdSchema), asyncHandler(async (req, res) => {
  const data = await getPlayback(req.validatedParams.streamId, req.user.id);
  res.set('Cache-Control', 'no-store');
  return res.json({ success: true, data });
}));
