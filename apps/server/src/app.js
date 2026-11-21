import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import { categoryRouter, creatorStreamRouter, publicStreamRouter } from './routes/stream.js';
import { creatorProfileRouter, discoveryRouter, viewerRouter } from './routes/discovery.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { broadcastRouter, muxWebhookRouter, playbackRouter } from './routes/broadcast.js';
import { requestContext, rateLimit, protectCookieActions, requireMetricsToken } from './middleware/production.js';
import { observeRequests, registry } from './infrastructure/metrics.js';

const app = express();
function mount(path, ...handlers) {
  app.use(path, (req, _res, next) => { req.routePrefix = path; next(); }, ...handlers);
}
app.disable('x-powered-by');
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 0));
app.use(requestContext, observeRequests);

// Security middleware
app.use(helmet());

// CORS middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);

app.get('/internal/metrics', requireMetricsToken, async (_req, res, next) => {
  try { res.type(registry.contentType).send(await registry.metrics()); } catch (error) { next(error); }
});
app.use('/api/v1', (req, res, next) => {
  // Signed provider callbacks must remain deliverable during user traffic spikes.
  if (req.path === '/webhooks/mux' || req.path === '/webhooks/mux/') return next();
  return rateLimit('api', Number(process.env.API_RATE_LIMIT || 300), 60000)(req, res, next);
});

// Body parsing middleware
mount('/api/v1/webhooks/mux', muxWebhookRouter);
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));
app.use(cookieParser());

// Routes
mount('/api', healthRoutes);
mount('/api/v1/auth', protectCookieActions, (req, res, next) => {
  if (req.method !== 'POST') return next();
  return rateLimit('auth', Number(process.env.AUTH_RATE_LIMIT || 20), 60000)(req, res, next);
}, authRoutes);
mount('/api/v1/creator/streams/:streamId/broadcast', broadcastRouter);
mount('/api/v1/streams/:streamId/playback', playbackRouter);
mount('/api/v1/categories', categoryRouter);
mount('/api/v1/streams', publicStreamRouter);
mount('/api/v1/creator/streams', creatorStreamRouter);
mount('/api/v1/discovery', discoveryRouter);
mount('/api/v1/creators', creatorProfileRouter);
mount('/api/v1/viewer', viewerRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
