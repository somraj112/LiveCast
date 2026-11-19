export function requestRoute(req) {
  return req.route?.path ? `${req.routePrefix || ''}${String(req.route.path)}` : 'unmatched';
}
