import { z } from 'zod';
import prisma from '../config/db.js';
import { AppError } from '../utils/app-error.js';
import { assertBroadcastConfigured, decryptStreamKey, encryptStreamKey, muxRequest, signedPlayback } from './mux.js';

const ingestUrl = 'rtmps://global-live.mux.com:443/app';

async function lockStream(tx, streamId) {
  await tx.$queryRaw`SELECT "id" FROM "streams" WHERE "id" = ${streamId}::uuid FOR UPDATE`;
}

function ingestDetails(broadcast) {
  if (!broadcast.muxStreamId || !broadcast.keyCiphertext) {
    throw new AppError(409, 'BROADCAST_SETUP_PENDING', 'Broadcast setup needs operator reconciliation. Do not create another ingest resource.');
  }
  if (broadcast.stopRequested) throw new AppError(409, 'BROADCAST_FINISHED', 'Create a new stream for another broadcast.');
  return { ingestUrl, streamKey: decryptStreamKey(broadcast.keyCiphertext) };
}

export async function prepareBroadcast(streamId, creatorId) {
  const owned = await prisma.stream.findFirst({ where: { id: streamId, creatorId }, select: { id: true } });
  if (!owned) throw new AppError(404, 'STREAM_NOT_FOUND', 'The stream was not found.');
  assertBroadcastConfigured();
  const reservation = await prisma.$transaction(async (tx) => {
    await lockStream(tx, streamId);
    const stream = await tx.stream.findUnique({ where: { id: streamId }, include: { broadcast: true } });
    if (!stream || stream.creatorId !== creatorId) throw new AppError(404, 'STREAM_NOT_FOUND', 'The stream was not found.');
    if (!['DRAFT', 'SCHEDULED', 'LIVE'].includes(stream.status)) throw new AppError(409, 'BROADCAST_FINISHED', 'Create a new stream for another broadcast.');
    if (stream.broadcast) return { existing: stream.broadcast };
    if (stream.status === 'LIVE') throw new AppError(409, 'INVALID_STREAM_TRANSITION', 'End the demo stream and create a new draft for broadcasting.');
    await tx.broadcast.create({ data: { streamId } });
    return { existing: null };
  });
  if (reservation.existing) return ingestDetails(reservation.existing);

  // The committed reservation prevents duplicate provisioning after ambiguous provider/network failures.
  // An operator can reconcile it by passthrough=streamId; never blindly retry a resource-creating POST.
  const remote = await muxRequest('/live-streams', 'POST', {
    playback_policies: ['signed'],
    new_asset_settings: { playback_policies: ['signed'], passthrough: streamId },
    passthrough: streamId,
    latency_mode: 'standard',
    reconnect_window: 60,
    test: process.env.MUX_TEST_MODE !== 'false',
  });
  const playbackId = remote.playback_ids?.find((entry) => entry.policy === 'signed')?.id;
  if (!remote.id || !remote.stream_key || !playbackId) throw new AppError(502, 'BROADCAST_PROVIDER_ERROR', 'The provider returned an incomplete ingest resource.');
  const broadcast = await prisma.broadcast.update({
    where: { streamId },
    data: { muxStreamId: remote.id, playbackId, keyCiphertext: encryptStreamKey(remote.stream_key) },
  });
  return ingestDetails(broadcast);
}

export async function requestBroadcastStop(streamId, creatorId) {
  const stream = await prisma.stream.findFirst({ where: { id: streamId, creatorId }, include: { broadcast: true } });
  if (!stream) throw new AppError(404, 'STREAM_NOT_FOUND', 'The stream was not found.');
  if (!stream.broadcast?.muxStreamId) throw new AppError(409, 'BROADCAST_NOT_READY', 'The broadcast has not been prepared.');
  if (stream.status === 'ENDED' || stream.broadcast.stopRequested) return { stopping: true };
  await muxRequest(`/live-streams/${encodeURIComponent(stream.broadcast.muxStreamId)}/disable`, 'PUT');
  await prisma.broadcast.update({ where: { streamId }, data: { stopRequested: true } });
  return { stopping: true };
}

export async function getPlayback(streamId, userId) {
  const stream = await prisma.stream.findUnique({ where: { id: streamId }, include: { broadcast: true, recording: true } });
  if (!stream || stream.status === 'DRAFT') throw new AppError(404, 'STREAM_NOT_FOUND', 'The stream was not found.');
  const [ban, moderator] = await Promise.all([
    prisma.ban.findUnique({ where: { streamId_userId: { streamId, userId } } }),
    stream.visibility === 'PRIVATE'
      ? prisma.moderator.findUnique({ where: { streamId_userId: { streamId, userId } } }) : null,
  ]);
  if (ban) throw new AppError(403, 'STREAM_BANNED', 'You are banned from this stream.');
  if (stream.visibility === 'PRIVATE' && stream.creatorId !== userId && !moderator) {
    throw new AppError(404, 'STREAM_NOT_FOUND', 'The stream was not found.');
  }
  const recording = stream.status === 'ENDED' ? stream.recording : null;
  const playbackId = stream.status === 'LIVE' ? stream.broadcast?.playbackId : recording?.playbackId;
  return {
    title: stream.title,
    status: stream.status,
    source: playbackId ? { ...(await signedPlayback(playbackId, recording?.duration)), kind: recording ? 'recording' : 'live' } : null,
    recording: recording ? { id: recording.id, duration: recording.duration, createdAt: recording.createdAt } : null,
  };
}

// Called before local deletion so billable provider resources are not silently orphaned.
export async function removeProviderResources(broadcast, recording) {
  if (broadcast && !broadcast.muxStreamId) throw new AppError(409, 'BROADCAST_SETUP_PENDING', 'Reconcile the pending broadcast before deleting it.');
  if (broadcast?.muxStreamId) await muxRequest(`/live-streams/${encodeURIComponent(broadcast.muxStreamId)}`, 'DELETE');
  if (recording?.muxAssetId) await muxRequest(`/assets/${encodeURIComponent(recording.muxAssetId)}`, 'DELETE');
}

const providerId = z.string().min(1).max(255);
const eventSchema = z.object({
  id: providerId,
  type: z.string().min(1).max(100),
  created_at: z.string().datetime({ offset: true }),
  data: z.object({
    id: providerId,
    live_stream_id: providerId.nullish(),
    active_asset_id: providerId.nullish(),
    duration: z.number().nonnegative().max(2147483647).nullish(),
    playback_ids: z.array(z.object({ id: providerId, policy: z.string() })).nullish(),
  }),
});

export async function processMuxEvent(input) {
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'The webhook event is invalid.');
  const event = parsed.data;
  const types = ['video.live_stream.active', 'video.live_stream.idle', 'video.asset.live_stream_completed', 'video.asset.deleted'];
  if (!types.includes(event.type)) return { ignored: true };
  if (event.type === 'video.asset.deleted') {
    await prisma.recording.deleteMany({ where: { muxAssetId: event.data.id } });
    return { processed: true };
  }
  const muxStreamId = event.type.startsWith('video.live_stream.') ? event.data.id : event.data.live_stream_id;
  if (!muxStreamId) return { ignored: true };
  const broadcast = await prisma.broadcast.findUnique({ where: { muxStreamId } });
  if (!broadcast) return { ignored: true };
  const result = await prisma.$transaction(async (tx) => {
    await lockStream(tx, broadcast.streamId);
    const stream = await tx.stream.findUnique({ where: { id: broadcast.streamId }, include: { broadcast: true, recording: true } });
    if (!stream?.broadcast || await tx.providerEvent.findUnique({ where: { id: event.id } })) return { ignored: true };
    const at = new Date(event.created_at);
    const current = stream.broadcast;
    if (event.type === 'video.asset.live_stream_completed') {
      const playbackId = event.data.playback_ids?.find((entry) => entry.policy === 'signed')?.id;
      if (!playbackId || event.data.duration == null) throw new AppError(400, 'INVALID_RECORDING', 'Final recording metadata is incomplete.');
      if (!stream.recording || stream.recording.muxAssetId === event.data.id) {
        const data = {
          muxAssetId: event.data.id, playbackId,
          videoUrl: `https://stream.mux.com/${playbackId}.m3u8`,
          thumbnail: `https://image.mux.com/${playbackId}/thumbnail.jpg`,
          duration: Math.ceil(event.data.duration),
        };
        await tx.recording.upsert({ where: { streamId: stream.id }, create: { streamId: stream.id, ...data }, update: data });
        await tx.stream.update({ where: { id: stream.id }, data: { status: 'ENDED', endedAt: stream.endedAt || at } });
      }
    } else if (!current.lastEventAt || at >= current.lastEventAt) {
      if (event.type === 'video.live_stream.active' && stream.status !== 'ENDED' && !current.stopRequested) {
        await tx.stream.update({ where: { id: stream.id }, data: { status: 'LIVE', startedAt: stream.startedAt || at } });
      }
      // Ignore initial idle events with no completed ingest session.
      if (event.type === 'video.live_stream.idle' && (stream.startedAt || event.data.active_asset_id)) {
        await tx.stream.update({ where: { id: stream.id }, data: { status: 'ENDED', endedAt: stream.endedAt || at } });
      }
      await tx.broadcast.update({ where: { streamId: stream.id }, data: { lastEventAt: at } });
    }
    await tx.providerEvent.create({ data: { id: event.id } });
    return { processed: true };
  });
  // Disable a completed one-shot ingest even when retrying an already-committed event.
  // A failed provider call returns 502; Mux retries and the durable event marker prevents duplicate writes.
  const latest = await prisma.stream.findUnique({ where: { id: broadcast.streamId }, include: { broadcast: true } });
  if (latest?.status === 'ENDED' && latest.broadcast?.muxStreamId && !latest.broadcast.stopRequested) {
    await muxRequest(`/live-streams/${encodeURIComponent(latest.broadcast.muxStreamId)}/disable`, 'PUT');
    await prisma.broadcast.update({ where: { streamId: latest.id }, data: { stopRequested: true } });
  }
  return { ...result, streamId: broadcast.streamId, status: latest?.status };
}
