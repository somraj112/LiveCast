import { authConfig, durationToSeconds } from '../config/auth.js';
import * as authService from '../services/auth.js';
import { AppError } from '../utils/app-error.js';

const baseCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/v1/auth',
});

const cookieOptions = () => ({
  ...baseCookieOptions(),
  maxAge: durationToSeconds(authConfig.refreshTokenTtl) * 1000,
});

function sendSession(res, status, session) {
  res.cookie(authConfig.refreshCookieName, session.refreshToken, cookieOptions());
  return res.status(status).json({
    success: true,
    data: { user: session.user, accessToken: session.accessToken },
  });
}

export async function register(req, res) {
  return sendSession(res, 201, await authService.register(req.validatedBody));
}

export async function login(req, res) {
  return sendSession(res, 200, await authService.login(req.validatedBody));
}

export async function refresh(req, res) {
  const token = req.cookies[authConfig.refreshCookieName];
  if (!token) throw new AppError(401, 'REFRESH_TOKEN_REQUIRED', 'A refresh-token cookie is required.');
  return sendSession(res, 200, await authService.refresh(token));
}

export async function logout(req, res) {
  await authService.logout(req.cookies[authConfig.refreshCookieName]);
  res.clearCookie(authConfig.refreshCookieName, baseCookieOptions());
  return res.status(200).json({ success: true, data: { message: 'Logged out successfully.' } });
}

export function me(req, res) {
  return res.status(200).json({ success: true, data: { user: req.user } });
}
