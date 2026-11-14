import prisma from '../config/db.js';
import { AppError } from '../utils/app-error.js';

const categorySelect = { id: true, name: true, icon: true };
const creatorSelect = { id: true, username: true, profileImage: true, bio: true };
const tagSelect = { tag: { select: { id: true, name: true } } };

export const discoveryStreamSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  scheduledAt: true,
  startedAt: true,
  createdAt: true,
  category: { select: categorySelect },
  creator: { select: creatorSelect },
  tags: { select: tagSelect },
};

function pagination(page, limit, total) {
  const totalPages = Math.ceil(total / limit);
  return { page, limit, total, totalPages, hasNextPage: page < totalPages };
}

function normalizeStream(stream) {
  return { ...stream, tags: stream.tags.map(({ tag }) => tag) };
}

export async function listDiscoverableStreams(query) {
  const { page, limit, status, categoryId, tags, search } = query;
  const where = {
    visibility: 'PUBLIC',
    status: { in: status },
    ...(categoryId ? { categoryId } : {}),
    ...(tags ? { tags: { some: { tag: { name: { in: tags, mode: 'insensitive' } } } } } : {}),
    ...(search ? {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { creator: { username: { contains: search, mode: 'insensitive' } } },
      ],
    } : {}),
  };

  const [total, streams] = await Promise.all([
    prisma.stream.count({ where }),
    prisma.stream.findMany({
      where,
      select: discoveryStreamSelect,
      orderBy: [{ status: 'desc' }, { scheduledAt: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return { streams: streams.map(normalizeStream), pagination: pagination(page, limit, total) };
}

export async function listTags(search) {
  return prisma.streamTag.findMany({
    where: search ? { name: { contains: search, mode: 'insensitive' } } : undefined,
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
    take: 100,
  });
}

export async function getCreatorProfile(username) {
  const creator = await prisma.user.findFirst({
    where: { username: { equals: username, mode: 'insensitive' }, role: 'CREATOR' },
    select: { ...creatorSelect, createdAt: true },
  });
  if (!creator) throw new AppError(404, 'CREATOR_NOT_FOUND', 'The creator was not found.');

  const publicStreamWhere = {
    creatorId: creator.id,
    visibility: 'PUBLIC',
    status: { in: ['LIVE', 'SCHEDULED', 'ENDED'] },
  };
  const [followerCount, streamCount, streams] = await Promise.all([
    prisma.follow.count({ where: { creatorId: creator.id } }),
    prisma.stream.count({ where: publicStreamWhere }),
    prisma.stream.findMany({
      where: publicStreamWhere,
      select: discoveryStreamSelect,
      orderBy: [{ status: 'desc' }, { createdAt: 'desc' }],
      take: 12,
    }),
  ]);

  return { ...creator, followerCount, streamCount, streams: streams.map(normalizeStream) };
}

async function assertCreator(creatorId) {
  const creator = await prisma.user.findFirst({
    where: { id: creatorId, role: 'CREATOR' },
    select: { id: true },
  });
  if (!creator) throw new AppError(404, 'CREATOR_NOT_FOUND', 'The creator was not found.');
}

export async function getFollowStatus(userId, creatorId) {
  await assertCreator(creatorId);
  if (userId === creatorId) {
    return { following: false, followedAt: null, canFollow: false };
  }
  const follow = await prisma.follow.findUnique({
    where: { followerId_creatorId: { followerId: userId, creatorId } },
    select: { followedAt: true },
  });
  return { following: Boolean(follow), followedAt: follow?.followedAt ?? null, canFollow: true };
}

export async function followCreator(userId, creatorId) {
  if (userId === creatorId) {
    throw new AppError(400, 'SELF_FOLLOW_NOT_ALLOWED', 'You cannot follow your own profile.');
  }
  await assertCreator(creatorId);
  const follow = await prisma.follow.upsert({
    where: { followerId_creatorId: { followerId: userId, creatorId } },
    update: {},
    create: { followerId: userId, creatorId },
    select: { followedAt: true },
  });
  return { following: true, followedAt: follow.followedAt };
}

export async function unfollowCreator(userId, creatorId) {
  await assertCreator(creatorId);
  await prisma.follow.deleteMany({ where: { followerId: userId, creatorId } });
  return { following: false, followedAt: null };
}

export async function listViewerHistory(userId, query) {
  const { page, limit } = query;
  const where = { userId };
  const [total, history] = await Promise.all([
    prisma.viewHistory.count({ where }),
    prisma.viewHistory.findMany({
      where,
      select: {
        id: true,
        watchDuration: true,
        watchedAt: true,
        stream: { select: discoveryStreamSelect },
      },
      orderBy: { watchedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return {
    history: history.map((entry) => ({ ...entry, stream: normalizeStream(entry.stream) })),
    pagination: pagination(page, limit, total),
  };
}

export async function recordViewerHistory(userId, input) {
  const stream = await prisma.stream.findFirst({
    where: {
      id: input.streamId,
      status: { in: ['SCHEDULED', 'LIVE', 'ENDED'] },
      visibility: { in: ['PUBLIC', 'UNLISTED'] },
    },
    select: { id: true },
  });
  if (!stream) throw new AppError(404, 'STREAM_NOT_FOUND', 'The stream was not found.');

  const existing = await prisma.viewHistory.findFirst({
    where: { userId, streamId: input.streamId },
    select: { id: true },
    orderBy: { watchedAt: 'desc' },
  });
  const data = { watchDuration: { increment: input.watchDuration }, watchedAt: new Date() };
  return existing
    ? prisma.viewHistory.update({ where: { id: existing.id }, data, select: { id: true, watchDuration: true, watchedAt: true } })
    : prisma.viewHistory.create({
      data: { userId, streamId: input.streamId, watchDuration: input.watchDuration },
      select: { id: true, watchDuration: true, watchedAt: true },
    });
}
