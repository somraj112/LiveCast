import { Registry, collectDefaultMetrics, Counter, Histogram, Gauge } from '@prometheus-io/client';
import { requestRoute } from '../utils/request-route.js';

export const registry = new Registry();
collectDefaultMetrics({ register: registry, prefix: 'livecast_' });
const requests = new Counter({ name: 'livecast_http_requests_total', help: 'Completed HTTP requests', labelNames: ['method', 'route', 'status'], registers: [registry] });
const duration = new Histogram({ name: 'livecast_http_duration_seconds', help: 'HTTP request duration', labelNames: ['method', 'route'], registers: [registry], buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 15] });
export const socketConnections = new Gauge({ name: 'livecast_socket_connections', help: 'Connected sockets on this API instance', registers: [registry] });

export function observeRequests(req, res, next) {
  const start = performance.now();
  res.on('finish', () => {
    // Bounded labels: route templates only, never IDs, raw URLs or query strings.
    const route = requestRoute(req);
    requests.inc({ method: req.method, route, status: String(res.statusCode) });
    duration.observe({ method: req.method, route }, (performance.now() - start) / 1000);
  });
  next();
}
