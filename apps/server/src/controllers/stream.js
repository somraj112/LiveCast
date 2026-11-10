import * as streamService from '../services/stream.js';

export async function listCreatorStreams(req, res) {
  const streams = await streamService.listCreatorStreams(req.user.id);
  return res.status(200).json({ success: true, data: { streams } });
}

export async function createStream(req, res) {
  const stream = await streamService.createStream(req.user.id, req.validatedBody);
  return res.status(201).json({ success: true, data: { stream } });
}

export async function updateStream(req, res) {
  const stream = await streamService.updateStream(
    req.validatedParams.streamId,
    req.user.id,
    req.validatedBody
  );
  return res.status(200).json({ success: true, data: { stream } });
}

export async function scheduleStream(req, res) {
  const stream = await streamService.scheduleStream(
    req.validatedParams.streamId,
    req.user.id,
    req.validatedBody.scheduledAt
  );
  return res.status(200).json({ success: true, data: { stream } });
}

export async function startStream(req, res) {
  const stream = await streamService.startStream(req.validatedParams.streamId, req.user.id);
  return res.status(200).json({ success: true, data: { stream } });
}

export async function endStream(req, res) {
  const stream = await streamService.endStream(req.validatedParams.streamId, req.user.id);
  return res.status(200).json({ success: true, data: { stream } });
}

export async function deleteStream(req, res) {
  await streamService.deleteStream(req.validatedParams.streamId, req.user.id);
  return res.status(204).send();
}

export async function getStreamKey(req, res) {
  const stream = await streamService.getStreamKey(req.validatedParams.streamId, req.user.id);
  res.set('Cache-Control', 'no-store');
  return res.status(200).json({ success: true, data: stream });
}

export async function getPublicStream(req, res) {
  const stream = await streamService.getPublicStream(req.validatedParams.streamId);
  return res.status(200).json({ success: true, data: { stream } });
}

export async function listCategories(req, res) {
  const categories = await streamService.listCategories();
  return res.status(200).json({ success: true, data: { categories } });
}
