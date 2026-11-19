import { createPrivateKey } from 'node:crypto';

// Validate before importing the application (which initializes Prisma).
export function loadEnvironment(source = process.env) {
  const errors = [];
  const production = source.NODE_ENV === 'production';
  if (!['development', 'test', 'production'].includes(source.NODE_ENV || 'development')) errors.push('NODE_ENV must be development, test or production');
  const integer = (name, fallback, min, max) => {
    const value = Number(source[name] ?? fallback);
    if (!Number.isInteger(value) || value < min || value > max) errors.push(`${name} must be an integer between ${min} and ${max}`);
    return value;
  };
  const url = (name, protocols, required = true) => {
    if (!source[name] && !required) return;
    try {
      const parsed = new URL(source[name]);
      if (!protocols.includes(parsed.protocol)) throw new Error();
      return parsed;
    } catch { errors.push(`${name} must use ${protocols.join(' or ')}`); }
  };
  url('DATABASE_URL', ['postgres:', 'postgresql:']);
  url('DIRECT_DATABASE_URL', ['postgres:', 'postgresql:'], false);
  url('REDIS_URL', ['redis:', 'rediss:'], production);
  const frontend = url('FRONTEND_URL', production ? ['https:'] : ['http:', 'https:']);
  if (frontend && (frontend.origin !== source.FRONTEND_URL || frontend.username || frontend.password)) errors.push('FRONTEND_URL must be an origin without a path or credentials');
  for (const name of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    if (!source[name] || source[name].length < 32 || /change.?me|replace|example/i.test(source[name])) errors.push(`${name} must be a unique random secret of at least 32 characters`);
  }
  if (source.JWT_ACCESS_SECRET === source.JWT_REFRESH_SECRET) errors.push('JWT secrets must be different');
  if (production && (!source.METRICS_TOKEN || source.METRICS_TOKEN.length < 32)) errors.push('METRICS_TOKEN must contain at least 32 random characters');
  for (const name of ['ACCESS_TOKEN_TTL', 'REFRESH_TOKEN_TTL']) {
    if (source[name] && !/^[1-9]\d*[smhd]$/.test(source[name])) errors.push(`${name} must be a positive duration such as 15m or 7d`);
  }
  if (source.MUX_TEST_MODE && !['true', 'false'].includes(source.MUX_TEST_MODE)) errors.push('MUX_TEST_MODE must be true or false');
  const mux = ['MUX_TOKEN_ID', 'MUX_TOKEN_SECRET', 'MUX_WEBHOOK_SECRET', 'MUX_SIGNING_KEY_ID', 'MUX_SIGNING_PRIVATE_KEY', 'STREAM_KEY_ENCRYPTION_KEY'];
  if (mux.some((key) => source[key]) && mux.some((key) => !source[key])) errors.push('Configure all Mux credentials together or leave all unset');
  if (source.STREAM_KEY_ENCRYPTION_KEY && !/^[a-f0-9]{64}$/i.test(source.STREAM_KEY_ENCRYPTION_KEY)) errors.push('STREAM_KEY_ENCRYPTION_KEY must be 64 hexadecimal characters');
  if (source.MUX_SIGNING_PRIVATE_KEY) {
    try {
      const key = createPrivateKey(Buffer.from(source.MUX_SIGNING_PRIVATE_KEY, 'base64'));
      if (key.asymmetricKeyType !== 'rsa' || key.asymmetricKeyDetails.modulusLength < 2048) throw new Error();
    } catch { errors.push('MUX_SIGNING_PRIVATE_KEY must encode an RSA private PEM of at least 2048 bits'); }
  }
  const config = {
    production,
    port: integer('PORT', 3001, 1, 65535),
    trustProxy: integer('TRUST_PROXY_HOPS', 0, 0, 3),
    apiLimit: integer('API_RATE_LIMIT', 300, 1, 100000),
    authLimit: integer('AUTH_RATE_LIMIT', 20, 1, 10000),
  };
  if (source.API_REPLICAS && source.API_REPLICAS !== '1') errors.push('API_REPLICAS must be 1 until distributed chat ordering is implemented');
  if (!['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'].includes(source.LOG_LEVEL || 'info')) errors.push('LOG_LEVEL is invalid');
  if (errors.length) throw new Error(`Invalid server configuration:\n- ${errors.join('\n- ')}`);
  return config;
}
