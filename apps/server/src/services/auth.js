import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';
import { AppError } from '../utils/app-error.js';
import {
  hashToken,
  refreshExpiryDate,
  signAccessToken,
  signRefreshToken,
  tokenHashesMatch,
  verifyRefreshToken,
} from '../utils/tokens.js';

const userSelect = {
  id: true,
  username: true,
  email: true,
  role: true,
  profileImage: true,
  bio: true,
  createdAt: true,
};

async function issueSession(user, db = prisma) {
  const accessToken = await signAccessToken(user);
  const { token: refreshToken, sessionId } = await signRefreshToken(user);

  await db.refreshSession.create({
    data: {
      id: sessionId,
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshExpiryDate(),
    },
  });

  return { accessToken, refreshToken };
}

export async function register({ username, email, password }) {
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { username, email, passwordHash },
        select: userSelect,
      });
      const tokens = await issueSession(user, tx);
      return { user, ...tokens };
    });
  } catch (error) {
    if (error?.code === 'P2002') {
      throw new AppError(409, 'ACCOUNT_EXISTS', 'An account with that email or username already exists.');
    }
    throw error;
  }
}

export async function login({ email, password }) {
  const account = await prisma.user.findUnique({ where: { email } });
  const passwordMatches = account && await bcrypt.compare(password, account.passwordHash);

  if (!passwordMatches) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'The email or password is incorrect.');
  }

  const user = Object.fromEntries(Object.keys(userSelect).map((key) => [key, account[key]]));
  const tokens = await issueSession(user);
  return { user, ...tokens };
}

export async function refresh(refreshToken) {
  const payload = await verifyRefreshToken(refreshToken);
  const session = await prisma.refreshSession.findUnique({
    where: { id: payload.jti },
    include: { user: { select: userSelect } },
  });

  const isActive = session
    && session.userId === payload.sub
    && !session.revokedAt
    && session.expiresAt > new Date()
    && tokenHashesMatch(session.tokenHash, hashToken(refreshToken));

  if (!isActive) {
    throw new AppError(401, 'INVALID_SESSION', 'The refresh session is invalid or expired.');
  }

  return prisma.$transaction(async (tx) => {
    const revoked = await tx.refreshSession.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (revoked.count !== 1) {
      throw new AppError(401, 'INVALID_SESSION', 'The refresh session has already been used.');
    }

    const tokens = await issueSession(session.user, tx);
    return { user: session.user, ...tokens };
  });
}

export async function logout(refreshToken) {
  if (!refreshToken) return;

  try {
    const payload = await verifyRefreshToken(refreshToken);
    await prisma.refreshSession.updateMany({
      where: { id: payload.jti, tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch (error) {
    if (!(error instanceof AppError)) throw error;
  }
}

export { userSelect };
