import * as discoveryService from '../services/discovery.js';

export async function listStreams(req, res) {
  const data = await discoveryService.listDiscoverableStreams(req.validatedQuery);
  return res.status(200).json({ success: true, data });
}

export async function listTags(req, res) {
  const tags = await discoveryService.listTags(req.validatedQuery.search);
  return res.status(200).json({ success: true, data: { tags } });
}

export async function getCreatorProfile(req, res) {
  const creator = await discoveryService.getCreatorProfile(req.validatedParams.username);
  return res.status(200).json({ success: true, data: { creator } });
}

export async function getFollowStatus(req, res) {
  const status = await discoveryService.getFollowStatus(req.user.id, req.validatedParams.creatorId);
  return res.status(200).json({ success: true, data: status });
}

export async function followCreator(req, res) {
  const status = await discoveryService.followCreator(req.user.id, req.validatedParams.creatorId);
  return res.status(200).json({ success: true, data: status });
}

export async function unfollowCreator(req, res) {
  const status = await discoveryService.unfollowCreator(req.user.id, req.validatedParams.creatorId);
  return res.status(200).json({ success: true, data: status });
}

export async function listHistory(req, res) {
  const data = await discoveryService.listViewerHistory(req.user.id, req.validatedQuery);
  return res.status(200).json({ success: true, data });
}

export async function recordHistory(req, res) {
  const history = await discoveryService.recordViewerHistory(req.user.id, req.validatedBody);
  return res.status(200).json({ success: true, data: { history } });
}
