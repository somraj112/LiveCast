import { randomUUID, timingSafeEqual } from 'node:crypto';
import { infrastructure } from '../infrastructure/store.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../config/logger.js';
import { requestRoute } from '../utils/request-route.js';

export function requestContext(req, res, next) {
  req.id = randomUUID();
  res.set('X-Request-ID', req.id);
  // Authenticated responses and signed credentials must never enter HTTP caches.
  res.set('Cache-Control', 'no-store');
  const start = performance.now();
  const healthProbe = req.path.startsWith('/api/health');
  res.on('finish', () => {
    if (healthProbe) return;
    logger.info({ requestId: req.id, method: req.method, route: requestRoute(req), status: res.statusCode, durationMs: Math.round(performance.now() - start) }, 'HTTP request');
  });
  next();
}

export function rateLimit(scope, limit, windowMs, store = () => infrastructure) {
  return async (req, res, next) => {
    try {
      const result = await store().consume(scope, req.ip, limit, windowMs);
      if (!result.allowed) {
        res.set('Retry-After', String(result.retryAfter));
        throw new AppError(429, 'RATE_LIMITED', 'Too many requests. Please try again later.');
      }
      next();
    } catch (error) {
      next(error instanceof AppError ? error : new AppError(503, 'SERVICE_UNAVAILABLE', 'Please try again shortly.'));
    }
  };
}

export function protectCookieActions(req, res, next) {
  const origin = req.get('origin');
  if (origin && origin !== (process.env.FRONTEND_URL || 'http://localhost:3000')) return next(new AppError(403, 'ORIGIN_REJECTED', 'The request origin is not allowed.'));
  if (req.get('sec-fetch-site') === 'cross-site') return next(new AppError(403, 'ORIGIN_REJECTED', 'Cross-site authentication requests are not allowed.'));
  // Non-browser API clients may omit Origin; a cross-site browser cannot forge it.
  next();
}

export function requireMetricsToken(req, res, next) {
  const expected = process.env.METRICS_TOKEN;
  const received = req.get('authorization') || '';
  const value = `Bearer ${expected}`;
  if (!expected || Buffer.byteLength(received) !== Buffer.byteLength(value) || !timingSafeEqual(Buffer.from(received), Buffer.from(value))) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
  next();
}
