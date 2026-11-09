import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { authConfig, durationToSeconds, getAuthSecrets } from '../config/auth.js';
import { AppError } from './app-error.js';

const issuer = 'livecast-api';
const audience = 'livecast-web';

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function tokenHashesMatch(left, right) {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export async function signAccessToken(user) {
  const { access } = getAuthSecrets();
  return new SignJWT({ role: user.role, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(user.id)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(authConfig.accessTokenTtl)
    .sign(access);
}

export async function signRefreshToken(user, sessionId = randomUUID()) {
  const { refresh } = getAuthSecrets();
  const token = await new SignJWT({ type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(user.id)
    .setJti(sessionId)
    .setIssuedAt()
    .setExpirationTime(authConfig.refreshTokenTtl)
    .sign(refresh);

  return { token, sessionId };
}

async function verifyToken(token, secret, expectedType) {
  try {
    const { payload } = await jwtVerify(token, secret, { issuer, audience });
    if (payload.type !== expectedType || !payload.sub) throw new Error('Unexpected token type.');
    return payload;
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'The authentication token is invalid or expired.');
  }
}

export async function verifyAccessToken(token) {
  return verifyToken(token, getAuthSecrets().access, 'access');
}

export async function verifyRefreshToken(token) {
  const payload = await verifyToken(token, getAuthSecrets().refresh, 'refresh');
  if (!payload.jti) throw new AppError(401, 'INVALID_TOKEN', 'The refresh token is invalid.');
  return payload;
}

export function refreshExpiryDate() {
  return new Date(Date.now() + durationToSeconds(authConfig.refreshTokenTtl) * 1000);
}
