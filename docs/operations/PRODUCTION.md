# LiveCast production operations

This change prepares a deployable first release. A production deployment, paid
resources, DNS, backups, monitoring subscriptions, and GitHub Environment secrets
still need to be configured by the repository owner. Start with staging.

## Deployment shape

Use Node 24 LTS, one persistent API process, a Next.js container, managed PostgreSQL,
and managed Redis. The supplied Caddy container exposes a single HTTPS origin and
routes `/api/*` and `/socket.io/*` to the API. Everything else goes to Next.js.
Only ports 80/443 are public; database, Redis, API and metrics ports stay private.
OBS continues sending video directly to Mux; video does not pass through the API.

**Keep exactly one API replica.** Redis provides shared limits and leased presence,
but chat/moderation ordering and Socket.IO broadcasts still use local queues and
rooms. `API_REPLICAS` rejects values other than 1. Scaling later requires a
Socket.IO adapter, session affinity for polling (or WebSocket-only clients),
distributed ordering, and tests for cross-node ban/room eviction. Setting this
variable does not control your hosting platform: also set its replica count to 1.

The deployment is provider-neutral. Use a VM/container host that supports persistent
WebSockets and background timers. Budget database, Redis, video storage and delivery
costs separately. Do not enable Mux billable mode until you have limits and alerts.

## 1. Reproduce locally

Your existing ignored `.env` files are not changed. To switch to the container
database intentionally, use these steps from the repository root:

```sh
nvm install
nvm use
npm ci
docker compose -f compose.dev.yml up -d --wait
cp -n .env.example apps/server/.env
# Edit apps/server/.env: generate each JWT secret independently:
openssl rand -base64 48
openssl rand -base64 48
npm run db:generate --workspace @streamline/server
npm run db:deploy --workspace @streamline/server
npm run dev --workspace @streamline/server
```

Run the web app in a second terminal with `npm run dev --workspace web`. The default
API port is 3001. If you keep your existing 5001 setup, set both
`NEXT_PUBLIC_API_URL=http://localhost:5001/api/v1` and
`NEXT_PUBLIC_SOCKET_URL=http://localhost:5001` in `apps/web/.env.local`, and set
`PORT=5001` on the server. Restart Next after changing public variables.

The development services bind only to localhost: PostgreSQL 5433 and Redis 6380.
Their example password is for local development only. `docker compose -f
compose.dev.yml stop` preserves the database volume. Avoid `down -v` unless you
intend to delete it. Redis data is disposable; PostgreSQL data is not.

Use separate database names and credentials for development, test, staging and
production. Never point tests at a real account database. A repeatable full check:

```sh
docker compose -f compose.dev.yml exec -T postgres createdb -U livecast livecast_test
export DATABASE_URL='postgresql://livecast:local-development-only@localhost:5433/livecast_test'
export TEST_DATABASE_URL="$DATABASE_URL"
export TEST_REDIS_URL='redis://localhost:6380/15'
export AUTH_RATE_LIMIT=10000
npm run db:deploy --workspace @streamline/server
npm run db:validate --workspace @streamline/server
npm run lint
npm test
npm run build --workspace web -- --webpack
```

`createdb` is needed only once. The database tests require a name ending `_test`;
Redis tests require database `/15`, use unique keys and do not flush data. Database
and Redis tests are skipped without their TEST URLs; CI always supplies both.
Normal development can omit `REDIS_URL` to use bounded process-local memory. This
fallback is forbidden in production.

## 2. Understand CI and migrations

The `CI` workflow installs the committed lockfile, validates and generates Prisma,
applies every migration to a fresh PostgreSQL service, reapplies them to check
idempotency, checks schema drift, runs server/web lint, API/Socket.IO/PostgreSQL/
Redis tests, builds Next, and builds both containers. No cloud credentials are
available to pull requests. Dependabot proposes dependency and Actions updates.
The scoped `@prisma/config` override keeps Effect on patched 3.22.1 for
[GHSA-7589-6fvf-x4pw](https://github.com/advisories/GHSA-7589-6fvf-x4pw).
Remove it when Prisma adopts a patched dependency, after validating migrations and
the audit. Avoid `npm audit fix --force`, which can suggest a breaking Prisma downgrade.

In repository Settings → Rules → your main ruleset, require these checks after the
first run: **Lint, tests, build and Prisma** and **Production containers**. Keep PRs
required, force pushes blocked, and deletion blocked. A solo developer can use
zero approvals while still requiring CI. Add reviewers when collaborating.

For a schema change, run `npm run db:migrate --workspace @streamline/server` only
against your own development database. Review and commit the generated SQL. Test it
on staging first. Production uses `db:deploy` (Prisma 7 `migrate deploy`); do not run
`migrate dev`, `db push` or `migrate reset` there. `DIRECT_DATABASE_URL` overrides the
runtime URL for Prisma CLI commands so migrations can bypass transaction poolers.
The API uses only `DATABASE_URL`, with a 10-connection pool and bounded queries.

Create GitHub Environments named `staging` and `production`, restrict deployment
branches to `main`, and set **DIRECT_DATABASE_URL** separately in each environment.
Require a human approval for production if your account supports it. Then run
Actions → **Deploy database migrations** on main and choose staging/production.
This workflow is deliberately manual and serialized. It does not deploy the app.
GitHub Actions must have network access to the database; use a private runner when
your provider exposes only a private network. Do not open PostgreSQL to the world.

Use a migration role with DDL privileges; runtime should have only the DML/sequence
privileges the app needs. Grant defaults for new tables/sequences when creating
those roles. If using the Compose release container, the supplied example shares
one env file; on a managed host split runtime and migration secrets so the runtime
never receives migration credentials.

For changes during traffic, use expand/backfill/contract migrations: add compatible
nullable fields, deploy code that supports both forms, backfill in bounded batches,
and remove old fields in a later release. SQL rollback is not automatically safe.

## 3. Prepare staging

1. Provision a managed PostgreSQL database and Redis in the API region. Require TLS,
   private networking/allowlists, unique credentials and a `noeviction` Redis policy
   so rate-limit keys cannot disappear under memory pressure. Never disable TLS
   certificate checks. Add the provider CA where required.
2. Enable PostgreSQL automated backups and point-in-time recovery. Pick retention
   and recovery objectives (for example: lose at most 15 minutes, restore within an
   hour), then **measure a restore to a new staging database** before launch.
3. Copy `.env.production.example` to an ignored deployment-host `.env.staging`, set
   real URLs and generate access, refresh and metrics secrets independently with
   `openssl rand -base64 48`. Set `chmod 600 .env.staging`. Use your host's secret
   manager for a managed deployment. Never put secrets in `NEXT_PUBLIC_*`, images,
   shell history, CI logs, or Git commits.
4. Set `SITE_ADDRESS=staging.your-domain.example` and
   `FRONTEND_URL=https://staging.your-domain.example`. Use a **separate Mux
   environment**, its callback URL `/api/v1/webhooks/mux`, and test mode. Configure
   all Mux credentials together; the encryption key is `openssl rand -hex 32`.
   Preserve that encryption key in your secret backup: losing it loses access to
   existing ingest secrets. If broadcasting is disabled, leave all Mux fields empty.
5. Point DNS to your container host, allow inbound 80/443 and preserve Caddy's data
   volume for certificates. Do not expose API port 3001 directly. Caddy is the one
   trusted proxy (`TRUST_PROXY_HOPS=1`); it replaces forwarded client headers. If
   adding another proxy/CDN, explicitly configure its trusted networks and re-test
   client-IP limits. Never set blanket `trust proxy=true`.

Build and release on the host (from this repo, with Docker Compose v2):

```sh
export DEPLOY_ENV_FILE=.env.staging
docker compose --env-file .env.staging -f compose.production.yml build
# Run this OR the GitHub migration workflow, once per release, before app rollout.
docker compose --env-file .env.staging -f compose.production.yml --profile release run --rm migrate
docker compose --env-file .env.staging -f compose.production.yml up -d --wait
```

The same steps work with `.env.production` only after staging passes. On a registry
based platform, build once and promote immutable image digests from staging to
production; `API_IMAGE` and `WEB_IMAGE` override Compose's local image names. Keep
the previous release digest for rollback. Frontend images use relative API URLs
and the current socket origin, so the same artifact can be promoted without baking
in a staging hostname. Auth refresh cookies are Secure + HttpOnly + SameSite=Lax;
deploying web and API on unrelated sites needs a separate cookie/CSRF design.

API images run as `node`, fail startup on invalid config or unavailable dependencies,
and drain on SIGTERM with a 10-second deadline. Configure at least a 15-second host
termination grace. Readiness returns 503 while draining. Compose health status does
not automatically restart a live unhealthy process; configure alerts and a hosting
health/restart policy. A single replica can briefly interrupt sockets on release;
clients reconnect. Zero-downtime multi-replica rollouts are future work.

## 4. Observe and recover

Public probes:

| Endpoint | Purpose | Failure meaning |
| --- | --- | --- |
| `/api/health/live` (also `/api/health`) | Process liveness | API is down |
| `/api/health/ready` | PostgreSQL SELECT 1 + Redis PING | Do not route traffic |
| `/internal/metrics` | Prometheus, requires `Authorization: Bearer METRICS_TOKEN` | Private monitoring only |

Caddy does not publish `/internal/metrics`; scrape `http://api:3001/internal/metrics`
from the private Docker network or use a protected internal ingress on your host.
Configure the scraper's bearer secret via a secret file. Metrics include request
counts/duration, process memory/CPU/event-loop lag and connected sockets. Labels
are bounded route templates, not user IDs, stream IDs or raw URLs. Request logs
are JSON on stdout with generated `X-Request-ID`, method, route, status and duration.
Unknown errors log safe name/code only; correlate the request ID for investigation.
Bodies, cookies, authorization headers, chat content and connection strings are not
logged. Send stdout to your host's log service; set retention and access controls.
Compose rotates local logs at 3 × 10 MB per container.

Create an external readiness uptime alert (for example after two minutes), alerts
for elevated 5xx rate, p95 latency >1s, Redis memory/connection failures, PostgreSQL
connection saturation/disk growth/backup failures, Mux webhook delivery failures,
and video spending. Calibrate thresholds using your staging load test. Availability
depends on both database and Redis. Redis outages reject rate-limited operations
with 503 and disconnect sockets whose leases cannot renew; metadata cache reads
fall back to PostgreSQL. Presence recovers on rejoin and stale leases expire after
45 seconds; keys expire after 90 seconds. Rate limits are fixed windows: 300 API
requests/IP/minute, 20 authentication POSTs/IP/minute, 30 socket commands/account/
10 seconds and one chat message/account/750 ms. Tune for NAT users after measuring.
Add provider/edge DDoS and connection limits; app limits alone are not DDoS protection.

Before promotion, exercise these on staging:

- Register → login → `/auth/me` → refresh rotation → logout, and confirm secure
  cookies and no secrets in responses/logs. Review account/password recovery and
  email verification before allowing broad public signups (not yet implemented).
- Creator create → OBS test ingest → provider callback marks LIVE → authenticated
  playback → chat from two tabs → unique viewer counts → moderator ban/unban/delete
  → stop → recording playback. Check provider callback retries and duplicates.
- Disconnect Redis: readiness becomes 503, sensitive operations fail closed. Restore
  it, reconnect clients and confirm count recovery. Kill/restart API and confirm
  stale leases expire. Stop PostgreSQL and confirm probes/alerts.
- Apply migrations to a restored database, prove a backup restore, and roll back to
  the previous compatible app image. For an unsafe data migration, restore to a
  **new** database and plan cutover; never blindly reset the production schema.
- Run a modest authorized load test with realistic login, discovery, chat and
  playback-token traffic. Verify p95 latency, memory, pool limits, rate limits and
  that the single API has capacity. Browser/video end-to-end and load tests remain
  manual acceptance work; mocked provider tests do not prove real Mux delivery.

After an incident: preserve safe logs, restore service, rotate exposed credentials,
record cause and recovery time, and add a regression test. Secret rotation for JWT
keys invalidates sessions; encryption-key rotation needs a planned re-encryption
process and must not be done by simply replacing the key.

## References

- [Node.js release policy](https://nodejs.org/en/about/previous-releases)
- [Prisma 7 migration deployment command](https://www.prisma.io/docs/orm/reference/prisma-cli-reference#migrate-deploy)
- [Redis Node.js production guidance](https://redis.io/docs/latest/develop/clients/nodejs/produsage/)
- [Socket.IO multi-node requirements](https://socket.io/docs/v4/using-multiple-nodes/)
- [Prometheus Node client](https://github.com/prometheus/client_js)
