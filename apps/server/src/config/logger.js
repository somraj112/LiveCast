import pino from 'pino';

const configuredLevel = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'].includes(process.env.LOG_LEVEL) ? process.env.LOG_LEVEL : 'info';

export const logger = pino({
  level: process.env.NODE_ENV === 'test' ? 'silent' : configuredLevel,
  base: { service: 'livecast-api' },
  redact: ['password', 'token', 'authorization', 'cookie', 'streamKey', 'connectionString'],
});

// Never serialize arbitrary provider/Prisma errors: messages can contain URLs,
// credentials, SQL parameters or user input. Correlate by request ID instead.
export function errorMetadata(error) {
  return { name: error?.name || 'Error', code: /^[A-Z0-9_]+$/.test(error?.code) ? error.code : undefined };
}
