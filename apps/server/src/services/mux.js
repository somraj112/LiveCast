import { createCipheriv, createDecipheriv, createHmac, createPrivateKey, randomBytes, timingSafeEqual } from 'node:crypto';
import { SignJWT } from 'jose';
import { AppError } from '../utils/app-error.js';

function required(name) {
  const value = process.env[name];
  if (!value) throw new AppError(503, 'BROADCAST_NOT_CONFIGURED', 'Broadcasting is not configured on this server.');
  return value;
}

function encryptionKey() {
  const value = required('STREAM_KEY_ENCRYPTION_KEY');
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new AppError(503, 'BROADCAST_NOT_CONFIGURED', 'Stream key encryption is not configured correctly.');
  return Buffer.from(value, 'hex');
}

export function encryptStreamKey(value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64url')).join('.');
}

export function decryptStreamKey(value) {
  const [iv, tag, ciphertext] = value.split('.').map((part) => Buffer.from(part, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

export async function muxRequest(path, method = 'GET', body) {
  const auth = Buffer.from(`${required('MUX_TOKEN_ID')}:${required('MUX_TOKEN_SECRET')}`).toString('base64');
  try {
    const response = await fetch(`https://api.mux.com/video/v1${path}`, {
      method,
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
    });
    if (method === 'DELETE' && response.status === 404) return null;
    if (!response.ok) throw new Error('Provider request failed');
    return response.status === 204 ? null : (await response.json()).data;
  } catch {
    // Never forward provider errors: their payloads can include credentials.
    throw new AppError(502, 'BROADCAST_PROVIDER_ERROR', 'The streaming provider could not complete the request.');
  }
}

function signingKey() {
  const key = createPrivateKey(Buffer.from(required('MUX_SIGNING_PRIVATE_KEY'), 'base64').toString('utf8'));
  if (key.asymmetricKeyType !== 'rsa') throw new Error('Expected an RSA signing key');
  return key;
}

export function assertBroadcastConfigured() {
  required('MUX_TOKEN_ID');
  required('MUX_TOKEN_SECRET');
  required('MUX_WEBHOOK_SECRET');
  required('MUX_SIGNING_KEY_ID');
  encryptionKey();
  try { signingKey(); } catch { throw new AppError(503, 'BROADCAST_NOT_CONFIGURED', 'Playback signing is not configured correctly.'); }
}

export async function signedPlayback(playbackId, duration = 0) {
  const expiresAt = Math.floor(Date.now() / 1000) + Math.max(3600, duration + 300);
  const token = await new SignJWT({ kid: required('MUX_SIGNING_KEY_ID') })
    .setProtectedHeader({ alg: 'RS256', kid: required('MUX_SIGNING_KEY_ID') })
    .setSubject(playbackId).setAudience('v').setExpirationTime(expiresAt).sign(signingKey());
  return { url: `https://stream.mux.com/${playbackId}.m3u8?token=${token}`, expiresAt };
}

export function verifyMuxSignature(raw, header) {
  const secret = required('MUX_WEBHOOK_SECRET');
  const fields = typeof header === 'string' ? header.split(',').map((part) => part.trim().split('=')) : [];
  const timestamp = fields.find(([key]) => key === 't')?.[1];
  if (!timestamp || !/^\d+$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
    throw new AppError(401, 'INVALID_WEBHOOK_SIGNATURE', 'Invalid webhook signature.');
  }
  const expected = createHmac('sha256', secret).update(`${timestamp}.`).update(raw).digest();
  const valid = fields.filter(([key]) => key === 'v1').some(([, value]) => {
    if (!/^[a-f0-9]{64}$/i.test(value || '')) return false;
    return timingSafeEqual(expected, Buffer.from(value, 'hex'));
  });
  if (!valid) throw new AppError(401, 'INVALID_WEBHOOK_SIGNATURE', 'Invalid webhook signature.');
}
