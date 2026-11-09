const DEFAULT_ACCESS_TTL = '15m';
const DEFAULT_REFRESH_TTL = '7d';

export const authConfig = {
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || DEFAULT_ACCESS_TTL,
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || DEFAULT_REFRESH_TTL,
  refreshCookieName: process.env.REFRESH_COOKIE_NAME || 'livecast_refresh',
};

export function durationToSeconds(value) {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) throw new Error(`Unsupported duration: ${value}`);

  const amount = Number(match[1]);
  const multiplier = { s: 1, m: 60, h: 3600, d: 86400 }[match[2]];
  return amount * multiplier;
}

export function getAuthSecrets() {
  const access = process.env.JWT_ACCESS_SECRET;
  const refresh = process.env.JWT_REFRESH_SECRET;

  if (!access || access.length < 32 || !refresh || refresh.length < 32) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must each be at least 32 characters.');
  }

  if (access === refresh) {
    throw new Error('Access and refresh token secrets must be different.');
  }

  return {
    access: new TextEncoder().encode(access),
    refresh: new TextEncoder().encode(refresh),
  };
}
