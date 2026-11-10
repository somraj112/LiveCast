import prisma from '../config/db.js';
import { AppError } from '../utils/app-error.js';

const categorySelect = { id: true, name: true, icon: true };

const creatorStreamSelect = {
  id: true,
  title: true,
  description: true,
  categoryId: true,
  visibility: true,
  status: true,
  scheduledAt: true,
  startedAt: true,
  endedAt: true,
  createdAt: true,
  category: { select: categorySelect },
};

const publicStreamSelect = {
  id: true,
  title: true,
  description: true,
  visibility: true,
  status: true,
  scheduledAt: true,
  startedAt: true,
  endedAt: true,
  createdAt: true,
  category: { select: categorySelect },
  creator: {
    select: { id: true, username: true, profileImage: true, bio: true },
  },
};

async function findOwnedStream(streamId, creatorId, select = creatorStreamSelect) {
  const stream = await prisma.stream.findFirst({
    where: { id: streamId, creatorId },
    select,
  });
  if (!stream) throw new AppError(404, 'STREAM_NOT_FOUND', 'The stream was not found.');
  return stream;
}

function assertStatus(stream, allowed, action) {
  if (!allowed.includes(stream.status)) {
    throw new AppError(
      409,
      'INVALID_STREAM_TRANSITION',
      `A ${stream.status.toLowerCase()} stream cannot be ${action}.`
    );
  }
}

async function updateOwnedStream(streamId, creatorId, allowedStatuses, data) {
  const result = await prisma.stream.updateMany({
    where: { id: streamId, creatorId, status: { in: allowedStatuses } },
    data,
  });
  if (result.count !== 1) {
    throw new AppError(409, 'INVALID_STREAM_TRANSITION', 'The stream status changed before the action completed.');
  }
  return findOwnedStream(streamId, creatorId);
}

function translatePrismaError(error) {
  if (error?.code === 'P2003') {
    throw new AppError(400, 'CATEGORY_NOT_FOUND', 'The selected category does not exist.');
  }
  throw error;
}

export async function listCreatorStreams(creatorId) {
  return prisma.stream.findMany({
    where: { creatorId },
    select: creatorStreamSelect,
    orderBy: { createdAt: 'desc' },
  });
}

export async function createStream(creatorId, input) {
  try {
    return await prisma.stream.create({
      data: { ...input, creatorId, status: 'DRAFT' },
      select: creatorStreamSelect,
    });
  } catch (error) {
    return translatePrismaError(error);
  }
}

export async function updateStream(streamId, creatorId, input) {
  const stream = await findOwnedStream(streamId, creatorId);
  assertStatus(stream, ['DRAFT', 'SCHEDULED'], 'updated');

  try {
    return await updateOwnedStream(streamId, creatorId, ['DRAFT', 'SCHEDULED'], input);
  } catch (error) {
    return translatePrismaError(error);
  }
}

export async function scheduleStream(streamId, creatorId, scheduledAtValue) {
  const scheduledAt = new Date(scheduledAtValue);
  if (scheduledAt <= new Date()) {
    throw new AppError(400, 'INVALID_SCHEDULE_TIME', 'The scheduled start must be in the future.');
  }

  const stream = await findOwnedStream(streamId, creatorId);
  assertStatus(stream, ['DRAFT', 'SCHEDULED'], 'scheduled');

  return updateOwnedStream(
    streamId,
    creatorId,
    ['DRAFT', 'SCHEDULED'],
    { status: 'SCHEDULED', scheduledAt }
  );
}

export async function startStream(streamId, creatorId) {
  const stream = await findOwnedStream(streamId, creatorId);
  assertStatus(stream, ['DRAFT', 'SCHEDULED'], 'started');

  return updateOwnedStream(
    streamId,
    creatorId,
    ['DRAFT', 'SCHEDULED'],
    { status: 'LIVE', startedAt: new Date(), endedAt: null }
  );
}

export async function endStream(streamId, creatorId) {
  const stream = await findOwnedStream(streamId, creatorId);
  assertStatus(stream, ['LIVE'], 'ended');

  return updateOwnedStream(streamId, creatorId, ['LIVE'], { status: 'ENDED', endedAt: new Date() });
}

export async function deleteStream(streamId, creatorId) {
  const stream = await findOwnedStream(streamId, creatorId);
  if (stream.status === 'LIVE') {
    throw new AppError(409, 'INVALID_STREAM_TRANSITION', 'End a live stream before deleting it.');
  }
  const result = await prisma.stream.deleteMany({
    where: { id: streamId, creatorId, status: { not: 'LIVE' } },
  });
  if (result.count !== 1) {
    throw new AppError(409, 'INVALID_STREAM_TRANSITION', 'The stream status changed before deletion.');
  }
}

export async function getStreamKey(streamId, creatorId) {
  return findOwnedStream(streamId, creatorId, { id: true, streamKey: true });
}

export async function getPublicStream(streamId) {
  const stream = await prisma.stream.findFirst({
    where: {
      id: streamId,
      status: { in: ['SCHEDULED', 'LIVE', 'ENDED'] },
      visibility: { in: ['PUBLIC', 'UNLISTED'] },
    },
    select: publicStreamSelect,
  });
  if (!stream) throw new AppError(404, 'STREAM_NOT_FOUND', 'The stream was not found.');
  return stream;
}

export async function listCategories() {
  return prisma.category.findMany({ orderBy: { name: 'asc' }, select: categorySelect });
}

export { creatorStreamSelect, publicStreamSelect };
